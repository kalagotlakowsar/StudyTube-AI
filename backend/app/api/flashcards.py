import json
import datetime
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, FlashcardDeck, FlashcardProgress, Video, UserActivity
from app.schemas.schemas import FlashcardDeckOut, FlashcardReviewRequest, SpacedRevisionItem

router = APIRouter()

@router.get("/get/{video_id}", response_model=FlashcardDeckOut)
def get_flashcards_by_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Fetches flashcards for a specific video with user review states."""
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.video_id == video_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found for this video.")

    cards = json.loads(deck.cards_json) if deck.cards_json else []

    # Overlay user progress states
    user_progress = {
        p.card_id: p.state
        for p in db.query(FlashcardProgress).filter(
            FlashcardProgress.user_id == current_user.id,
            FlashcardProgress.deck_id == deck.id
        ).all()
    }

    for c in cards:
        c["state"] = user_progress.get(c.get("id"), "unreviewed")

    return {
        "id": deck.id,
        "video_id": deck.video_id,
        "title": deck.title,
        "cards": cards
    }

@router.post("/review-card")
def review_flashcard(
    request: FlashcardReviewRequest,
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Records card mastery ('known' or 'need_revision') and calculates spaced repetition schedule.
    """
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")

    progress = db.query(FlashcardProgress).filter(
        FlashcardProgress.user_id == current_user.id,
        FlashcardProgress.deck_id == deck.id,
        FlashcardProgress.card_id == request.card_id
    ).first()

    now = datetime.datetime.utcnow()

    if not progress:
        progress = FlashcardProgress(
            user_id=current_user.id,
            deck_id=deck.id,
            card_id=request.card_id,
            review_count=1,
            state=request.state,
            last_reviewed_at=now,
            next_review_at=now + datetime.timedelta(days=1 if request.state == "known" else 0)
        )
        db.add(progress)
    else:
        progress.review_count += 1
        progress.state = request.state
        progress.last_reviewed_at = now

        # Spaced repetition calculation (Leitner system progression)
        if request.state == "known":
            # 1, 3, 7, 14, 30 days
            days_add = min(2 ** (progress.review_count - 1), 30)
            progress.next_review_at = now + datetime.timedelta(days=days_add)
        else: # need_revision
            progress.next_review_at = now + datetime.timedelta(hours=12)

    # Activity log
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="flashcard_reviewed",
        details_json=json.dumps({"card_id": request.card_id, "state": request.state})
    )
    db.add(activity)

    db.commit()
    db.refresh(progress)

    return {
        "card_id": progress.card_id,
        "state": progress.state,
        "review_count": progress.review_count,
        "next_review_at": progress.next_review_at
    }

@router.get("/spaced-revision-due", response_model=List[SpacedRevisionItem])
def get_due_spaced_revisions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Returns all flashcards due for revision today across all user's videos."""
    now = datetime.datetime.utcnow()
    due_progress = db.query(FlashcardProgress).filter(
        FlashcardProgress.user_id == current_user.id,
        FlashcardProgress.next_review_at <= now
    ).all()

    results = []
    deck_cache = {}

    for p in due_progress:
        deck = deck_cache.get(p.deck_id)
        if not deck:
            deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == p.deck_id).first()
            if deck:
                deck_cache[p.deck_id] = deck

        if deck and deck.video:
            cards = json.loads(deck.cards_json) if deck.cards_json else []
            card_obj = next((c for c in cards if c.get("id") == p.card_id), None)
            if card_obj:
                results.append({
                    "card_id": p.card_id,
                    "front": card_obj.get("front", ""),
                    "back": card_obj.get("back", ""),
                    "video_id": deck.video.id,
                    "video_title": deck.video.title,
                    "due_date": p.next_review_at
                })

    return results
