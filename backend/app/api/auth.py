import uuid
import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import (
    UserCreate, UserLogin, GoogleLoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    UserProfileUpdate, UserOut, Token
)
from app.api.deps import get_current_user

router = APIRouter()

def format_user_response(user: User) -> dict:
    """Formats user entity ensuring study_preferences is a dictionary."""
    prefs = {}
    if user.study_preferences:
        try:
            prefs = json.loads(user.study_preferences) if isinstance(user.study_preferences, str) else user.study_preferences
        except Exception:
            prefs = {}
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "preferred_language": user.preferred_language,
        "theme_preference": user.theme_preference,
        "study_preferences": prefs if isinstance(prefs, dict) else {},
        "created_at": user.created_at
    }

@router.get("/google/config")
def get_google_config() -> Any:
    """Returns Google OAuth Client configuration status."""
    cid = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else ""
    return {
        "client_id": cid,
        "configured": bool(cid)
    }

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Creates a new user account and returns JWT token."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=user_in.email.lower(),
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.name}",
        preferred_language="English",
        theme_preference="dark",
        study_preferences="{}"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)) -> Any:
    """Authenticates user with email/password and returns JWT token."""
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/google", response_model=Token)
def google_auth(request: GoogleLoginRequest, db: Session = Depends(get_db)) -> Any:
    """
    Handles Google OAuth sign-in / sign-up.
    Validates Google ID token (JWT) or OAuth2 access token with Google's servers.
    """
    if not request.token or not request.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token is required. Please sign in with your Google account."
        )

    token = request.token.strip()
    client_id = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None
    email = None
    name = None
    avatar_url = None

    # Method 1: Verify as Google ID Token (JWT from Google Identity Services)
    if token.count(".") == 2:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=client_id if client_id else None
            )
            email = idinfo.get("email")
            name = idinfo.get("name")
            avatar_url = idinfo.get("picture")
        except ValueError:
            # Token may be an OAuth2 access token; fallback to Method 2 below
            pass
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google ID token verification failed: {str(e)}"
            )

    # Method 2: Verify as Google OAuth2 Access Token
    if not email:
        try:
            import requests

            # 1. Verify token validity and audience via Google tokeninfo
            tokeninfo_resp = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?access_token={token}",
                timeout=10
            )
            if tokeninfo_resp.status_code == 200:
                token_data = tokeninfo_resp.json()
                token_aud = token_data.get("aud") or token_data.get("azp")
                if client_id and token_aud and token_aud != client_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google token audience does not match configured GOOGLE_CLIENT_ID."
                    )
                email = token_data.get("email")

                # 2. Retrieve user profile information from Google userinfo
                userinfo_resp = requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                if userinfo_resp.status_code == 200:
                    userinfo_data = userinfo_resp.json()
                    name = userinfo_data.get("name") or name
                    avatar_url = userinfo_data.get("picture") or avatar_url
                    if not email:
                        email = userinfo_data.get("email")
        except HTTPException:
            raise
        except Exception as ex:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth verification failed: {str(ex)}"
            )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token. Could not verify credentials with Google."
        )

    email = email.lower()
    name = name or request.name or email.split("@")[0]
    avatar_url = avatar_url or request.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            preferred_language="English",
            theme_preference="dark",
            study_preferences="{}"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user's avatar or name if newly provided by Google
        updated = False
        if avatar_url and (not user.avatar_url or "dicebear" in user.avatar_url):
            user.avatar_url = avatar_url
            updated = True
        if name and not user.name:
            user.name = name
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }



@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)) -> Any:
    """Generates a password reset token for the specified email."""
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user:
        # Prevent email enumeration by returning success anyway
        return {"message": "If an account exists with this email, a reset code has been sent."}

    token = str(uuid.uuid4())[:8].upper()
    user.reset_token = token
    user.reset_token_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    db.commit()

    return {
        "message": f"Password reset code generated. For demo purposes, your code is: {token}",
        "demo_code": token
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)) -> Any:
    """Resets password using verification code."""
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or user.reset_token != request.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code."
        )

    if user.reset_token_expiry and user.reset_token_expiry < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    user.hashed_password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return {"message": "Password has been successfully updated. You can now log in."}

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)) -> Any:
    """Returns the authenticated user's profile."""
    return format_user_response(current_user)

@router.put("/me", response_model=UserOut)
def update_current_user_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Updates user profile and study preferences."""
    if profile_in.name is not None:
        current_user.name = profile_in.name
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url
    if profile_in.preferred_language is not None:
        current_user.preferred_language = profile_in.preferred_language
    if profile_in.theme_preference is not None:
        current_user.theme_preference = profile_in.theme_preference
    if profile_in.study_preferences is not None:
        current_user.study_preferences = json.dumps(profile_in.study_preferences)

    db.commit()
    db.refresh(current_user)

    return format_user_response(current_user)

