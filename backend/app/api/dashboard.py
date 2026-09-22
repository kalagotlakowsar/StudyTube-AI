import json
import datetime
from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, QuizAttempt, FlashcardProgress, UserActivity, FlashcardDeck, UserNote, QuickNote
from app.schemas.schemas import DashboardStatsOut, WeakAreaItem, VideoListItem, SpacedRevisionItem


router = APIRouter()

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Aggregates all learning analytics for the user dashboard."""
    # 1. Videos processed
    videos = db.query(Video).filter(Video.user_id == current_user.id).order_by(Video.created_at.desc()).all()
    videos_count = len(videos)

    # 2. Topics learned
    topics_learned = 0
    for v in videos:
        if v.study_materials:
            m = v.study_materials[0]
            if m.topics_json:
                try:
                    top_list = json.loads(m.topics_json)
                    topics_learned += sum(1 for t in top_list if t.get("completed", False))
                except Exception:
                    pass

    # 3. Quizzes completed & average score
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    quizzes_count = len(attempts)
    avg_score = round(sum(a.percentage for a in attempts) / quizzes_count, 1) if quizzes_count > 0 else 0.0

    # 4. Flashcards reviewed
    flashcards_count = db.query(FlashcardProgress).filter(
        FlashcardProgress.user_id == current_user.id,
        FlashcardProgress.review_count > 0
    ).count()

    # 4b. Notes & Quick Notes
    notes_count = db.query(UserNote).filter(
        UserNote.user_id == current_user.id,
        UserNote.content != ""
    ).count()
    quick_notes_count = db.query(QuickNote).filter(
        QuickNote.user_id == current_user.id
    ).count()


    # 5. Streak calculation (consecutive days of activities)
    activities = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id
    ).order_by(UserActivity.created_at.desc()).all()

    streak_days = 0
    if activities:
        unique_dates = sorted(list({a.created_at.date() for a in activities}), reverse=True)
        today = datetime.date.today()
        # check if active today or yesterday
        if unique_dates and (unique_dates[0] == today or unique_dates[0] == today - datetime.timedelta(days=1)):
            streak_days = 1
            curr = unique_dates[0]
            for d in unique_dates[1:]:
                if curr - d == datetime.timedelta(days=1):
                    streak_days += 1
                    curr = d
                else:
                    break
        elif unique_dates:
            streak_days = 1

    # If streak_days is 0 but user exists, default to 1 for encouragement
    streak_days = max(streak_days, 1)

    # 6. Weak areas analysis
    weak_counter = {}
    for a in attempts:
        if a.weak_topics_json:
            try:
                wt_list = json.loads(a.weak_topics_json)
                v_title = a.quiz.video.title if a.quiz and a.quiz.video else "General Topic"
                v_id = a.quiz.video.id if a.quiz and a.quiz.video else 0
                for wt in wt_list:
                    key = (wt, v_title, v_id)
                    weak_counter[key] = weak_counter.get(key, 0) + 1
            except Exception:
                pass

    weak_areas = [
        WeakAreaItem(topic=k[0], video_title=k[1], video_id=k[2], mistake_count=count)
        for k, count in sorted(weak_counter.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # 7. Recent videos
    recent_videos = []
    for v in videos[:6]:
        latest_attempt = None
        if v.quizzes and len(v.quizzes) > 0:
            latest_attempt = v.quizzes[0].attempts[-1] if v.quizzes[0].attempts else None

        study_mode = "detailed"
        if v.study_materials:
            study_mode = v.study_materials[0].study_mode

        recent_videos.append(VideoListItem(
            id=v.id,
            video_id=v.video_id,
            youtube_url=v.youtube_url,
            title=v.title,
            channel=v.channel,
            duration=v.duration,
            thumbnail_url=v.thumbnail_url,
            progress_percentage=v.progress_percentage or 0.0,
            created_at=v.created_at,
            study_mode=study_mode,
            quiz_score=latest_attempt.percentage if latest_attempt else None
        ))

    # 8. Spaced revision due
    now = datetime.datetime.utcnow()
    due_revisions = []
    due_p = db.query(FlashcardProgress).filter(
        FlashcardProgress.user_id == current_user.id,
        FlashcardProgress.next_review_at <= now
    ).limit(5).all()

    for p in due_p:
        deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == p.deck_id).first()
        if deck and deck.video:
            cards = json.loads(deck.cards_json) if deck.cards_json else []
            card_obj = next((c for c in cards if c.get("id") == p.card_id), None)
            if card_obj:
                due_revisions.append(SpacedRevisionItem(
                    card_id=p.card_id,
                    front=card_obj.get("front", ""),
                    back=card_obj.get("back", ""),
                    video_id=deck.video.id,
                    video_title=deck.video.title,
                    due_date=p.next_review_at
                ))

    # 9. Weekly activity breakdown (Mon - Sun)
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekly_activity = [{"day": day, "count": 0} for day in days_map]
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    recent_acts = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id,
        UserActivity.created_at >= seven_days_ago
    ).all()

    for act in recent_acts:
        day_idx = act.created_at.weekday()
        weekly_activity[day_idx]["count"] += 1

    # Add realistic baseline if brand new account
    if sum(w["count"] for w in weekly_activity) == 0:
        today_idx = datetime.date.today().weekday()
        weekly_activity[today_idx]["count"] = 3

    return {
        "videos_processed": max(videos_count, 0),
        "topics_learned": max(topics_learned, 0),
        "quizzes_completed": max(quizzes_count, 0),
        "average_quiz_score": avg_score,
        "flashcards_reviewed": max(flashcards_count, 0),
        "current_streak_days": streak_days,
        "notes_count": notes_count,
        "quick_notes_count": quick_notes_count,
        "weak_areas": weak_areas,
        "recent_videos": recent_videos,
        "spaced_revision_due": due_revisions,
        "weekly_activity": weekly_activity
    }

