import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, UserNote, QuickNote, UserActivity
from app.schemas.schemas import (
    UserNoteCreate, UserNoteOut,
    QuickNoteCreate, QuickNoteUpdate, QuickNoteOut
)
import json

router = APIRouter()

# --- User Custom Notes (Full Markdown / Freeform Notes per Video) ---

@router.get("/{video_id}", response_model=UserNoteOut)
def get_user_note(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Fetches custom note for a video. Creates an empty note if none exists yet."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    note = db.query(UserNote).filter(
        UserNote.video_id == video_id,
        UserNote.user_id == current_user.id
    ).first()

    if not note:
        note = UserNote(
            user_id=current_user.id,
            video_id=video_id,
            title="My Study Notes",
            content=""
        )
        db.add(note)
        db.commit()
        db.refresh(note)

    return note

@router.post("/{video_id}", response_model=UserNoteOut)
def save_user_note(
    video_id: int,
    note_in: UserNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Saves or updates custom notes for a video."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    note = db.query(UserNote).filter(
        UserNote.video_id == video_id,
        UserNote.user_id == current_user.id
    ).first()

    if not note:
        note = UserNote(
            user_id=current_user.id,
            video_id=video_id,
            title=note_in.title or "My Study Notes",
            content=note_in.content
        )
        db.add(note)
    else:
        if note_in.title is not None:
            note.title = note_in.title
        note.content = note_in.content
        note.updated_at = datetime.datetime.utcnow()

    # Track activity
    act = UserActivity(
        user_id=current_user.id,
        activity_type="note_updated",
        details_json=json.dumps({"video_id": video_id, "title": note.title})
    )
    db.add(act)

    db.commit()
    db.refresh(note)
    return note

@router.delete("/note/{note_id}")
def delete_user_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Deletes a custom note."""
    note = db.query(UserNote).filter(
        UserNote.id == note_id,
        UserNote.user_id == current_user.id
    ).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}


# --- Quick Notes (Timestamp-Linked Notes with Click-to-Seek) ---

@router.get("/quick/{video_id}", response_model=List[QuickNoteOut])
def get_quick_notes(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Returns all timestamped quick notes for a video, ordered chronologically."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    notes = db.query(QuickNote).filter(
        QuickNote.video_id == video_id,
        QuickNote.user_id == current_user.id
    ).order_by(QuickNote.timestamp_seconds.asc(), QuickNote.created_at.asc()).all()
    return notes

@router.post("/quick/{video_id}", response_model=QuickNoteOut)
def create_quick_note(
    video_id: int,
    note_in: QuickNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Creates a new timestamped quick note."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    quick_note = QuickNote(
        user_id=current_user.id,
        video_id=video_id,
        timestamp_seconds=note_in.timestamp_seconds,
        time_str=note_in.time_str,
        note_text=note_in.note_text,
        tags=note_in.tags or ""
    )
    db.add(quick_note)

    # Track activity
    act = UserActivity(
        user_id=current_user.id,
        activity_type="quick_note_created",
        details_json=json.dumps({"video_id": video_id, "timestamp": note_in.time_str})
    )
    db.add(act)

    db.commit()
    db.refresh(quick_note)
    return quick_note

@router.put("/quick/{note_id}", response_model=QuickNoteOut)
def update_quick_note(
    note_id: int,
    note_in: QuickNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Updates an existing quick note."""
    quick_note = db.query(QuickNote).filter(
        QuickNote.id == note_id,
        QuickNote.user_id == current_user.id
    ).first()
    if not quick_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick note not found")

    if note_in.note_text is not None:
        quick_note.note_text = note_in.note_text
    if note_in.timestamp_seconds is not None:
        quick_note.timestamp_seconds = note_in.timestamp_seconds
    if note_in.time_str is not None:
        quick_note.time_str = note_in.time_str
    if note_in.tags is not None:
        quick_note.tags = note_in.tags

    quick_note.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(quick_note)
    return quick_note

@router.delete("/quick/{note_id}")
def delete_quick_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Deletes a quick note."""
    quick_note = db.query(QuickNote).filter(
        QuickNote.id == note_id,
        QuickNote.user_id == current_user.id
    ).first()
    if not quick_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick note not found")

    db.delete(quick_note)
    db.commit()
    return {"message": "Quick note deleted successfully"}
