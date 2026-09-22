import json
import datetime
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Quiz, QuizAttempt, Video, UserActivity
from app.schemas.schemas import QuizOut, QuizSubmitRequest, QuizAttemptOut

router = APIRouter()

@router.get("/get/{video_id}", response_model=QuizOut)
def get_quiz_by_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Fetches quiz questions for a specific video."""
    quiz = db.query(Quiz).filter(Quiz.video_id == video_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found for this video.")

    questions = json.loads(quiz.questions_json) if quiz.questions_json else []
    return {
        "id": quiz.id,
        "video_id": quiz.video_id,
        "title": quiz.title,
        "questions": questions
    }

@router.post("/submit-attempt", response_model=QuizAttemptOut)
def submit_quiz_attempt(
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Evaluates submitted quiz answers, records score, identifies weak topics, and returns feedback."""
    quiz = db.query(Quiz).filter(Quiz.id == request.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    questions = json.loads(quiz.questions_json) if quiz.questions_json else []
    question_map = {q["id"]: q for q in questions}

    correct_count = 0
    total_count = len(questions)
    review_items = []
    weak_topics_set = set()

    for user_ans in request.answers:
        q = question_map.get(user_ans.question_id)
        if not q:
            continue
        correct_idx = q.get("correct_answer_index", 0)
        is_correct = (user_ans.selected_index == correct_idx)
        if is_correct:
            correct_count += 1
        else:
            topic = q.get("topic")
            if topic:
                weak_topics_set.add(topic)

        review_items.append({
            "question_id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "selected_index": user_ans.selected_index,
            "correct_index": correct_idx,
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
            "topic": q.get("topic", "General")
        })

    percentage = round((correct_count / total_count * 100.0), 1) if total_count > 0 else 0.0
    weak_topics_list = list(weak_topics_set)

    attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score=correct_count,
        total_questions=total_count,
        percentage=percentage,
        answers_json=json.dumps(review_items),
        weak_topics_json=json.dumps(weak_topics_list),
        completed_at=datetime.datetime.utcnow()
    )
    db.add(attempt)

    # Activity log
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="quiz_taken",
        details_json=json.dumps({
            "quiz_id": quiz.id,
            "score": correct_count,
            "total": total_count,
            "percentage": percentage
        })
    )
    db.add(activity)

    db.commit()
    db.refresh(attempt)

    return {
        "id": attempt.id,
        "score": correct_count,
        "total_questions": total_count,
        "percentage": percentage,
        "weak_topics": weak_topics_list,
        "review": review_items,
        "completed_at": attempt.completed_at
    }

@router.get("/history/{video_id}")
def get_quiz_history(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Returns past attempts for this video."""
    quiz = db.query(Quiz).filter(Quiz.video_id == video_id).first()
    if not quiz:
        return []

    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.user_id == current_user.id
    ).order_by(QuizAttempt.completed_at.desc()).all()

    return [
        {
            "id": a.id,
            "score": a.score,
            "total_questions": a.total_questions,
            "percentage": a.percentage,
            "weak_topics": json.loads(a.weak_topics_json) if a.weak_topics_json else [],
            "completed_at": a.completed_at
        }
        for a in attempts
    ]
