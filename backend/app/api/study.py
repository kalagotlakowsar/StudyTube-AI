import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, StudyMaterial, Bookmark
from app.schemas.schemas import BookmarkCreateRequest
from app.services.ai_gemini import generate_study_material

router = APIRouter()

@router.post("/regenerate-mode")
def change_study_mode(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Regenerates study notes adapted to a specific study mode (detailed, quick, exam, beginner)."""
    video_id = payload.get("video_id")
    target_mode = payload.get("study_mode", "detailed").lower()

    if not video_id:
        raise HTTPException(status_code=400, detail="video_id is required")

    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    material = db.query(StudyMaterial).filter(StudyMaterial.video_id == video.id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    transcript_items = json.loads(video.transcript_json) if video.transcript_json else []

    # Regenerate with new mode
    new_data = generate_study_material(
        title=video.title,
        channel=video.channel or "Educational Channel",
        transcript_items=transcript_items,
        study_mode=target_mode,
        language=material.language or "English"
    )

    material.study_mode = target_mode
    material.overview = new_data.get("overview", material.overview)
    material.notes_markdown = new_data.get("notes_markdown", material.notes_markdown)
    material.summary_json = json.dumps(new_data.get("summary", {}))
    material.key_concepts_json = json.dumps(new_data.get("key_concepts", []))
    material.concept_map_json = json.dumps(new_data.get("concept_map", {}))
    material.timestamps_json = json.dumps(new_data.get("timestamps", []))
    material.topics_json = json.dumps(new_data.get("topics", []))

    db.commit()
    db.refresh(material)

    return {
        "study_material": {
            "id": material.id,
            "video_id": video.id,
            "study_mode": material.study_mode,
            "language": material.language,
            "overview": material.overview,
            "notes_markdown": material.notes_markdown,
            "summary": new_data.get("summary", {}),
            "key_concepts": new_data.get("key_concepts", []),
            "concept_map": new_data.get("concept_map", {}),
            "timestamps": new_data.get("timestamps", []),
            "topics": new_data.get("topics", []),
            "created_at": material.created_at
        }
    }

@router.post("/translate")
def translate_material(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Translates study material to preferred language while preserving technical terms."""
    video_id = payload.get("video_id")
    target_lang = payload.get("language", "English")

    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    material = db.query(StudyMaterial).filter(StudyMaterial.video_id == video.id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    transcript_items = json.loads(video.transcript_json) if video.transcript_json else []

    # Regenerate in target language
    new_data = generate_study_material(
        title=video.title,
        channel=video.channel or "Educational Channel",
        transcript_items=transcript_items,
        study_mode=material.study_mode or "detailed",
        language=target_lang
    )

    material.language = target_lang
    material.overview = new_data.get("overview", material.overview)
    material.notes_markdown = new_data.get("notes_markdown", material.notes_markdown)
    material.summary_json = json.dumps(new_data.get("summary", {}))
    material.key_concepts_json = json.dumps(new_data.get("key_concepts", []))

    db.commit()

    return {
        "study_material": {
            "id": material.id,
            "video_id": video.id,
            "study_mode": material.study_mode,
            "language": material.language,
            "overview": material.overview,
            "notes_markdown": material.notes_markdown,
            "summary": new_data.get("summary", {}),
            "key_concepts": new_data.get("key_concepts", []),
            "concept_map": json.loads(material.concept_map_json) if material.concept_map_json else {},
            "timestamps": json.loads(material.timestamps_json) if material.timestamps_json else [],
            "topics": json.loads(material.topics_json) if material.topics_json else [],
            "created_at": material.created_at
        }
    }

@router.post("/toggle-topic")
def toggle_topic_completion(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Toggles completion state of a specific topic in the study outline."""
    video_id = payload.get("video_id")
    topic_id = payload.get("topic_id")
    completed = payload.get("completed", True)

    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    material = db.query(StudyMaterial).filter(StudyMaterial.video_id == video.id).first()
    if not material or not material.topics_json:
        raise HTTPException(status_code=404, detail="Topics not found")

    topics = json.loads(material.topics_json)
    for top in topics:
        if top.get("id") == topic_id:
            top["completed"] = completed

    material.topics_json = json.dumps(topics)

    # Recompute overall progress
    total_topics = len(topics)
    completed_topics = sum(1 for t in topics if t.get("completed", False))
    if total_topics > 0:
        video.progress_percentage = round((completed_topics / total_topics) * 100.0, 1)

    db.commit()
    return {
        "topics": topics,
        "progress_percentage": video.progress_percentage
    }

@router.get("/bookmarks")
def get_bookmarks(
    video_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Lists saved bookmarks."""
    query = db.query(Bookmark).filter(Bookmark.user_id == current_user.id)
    if video_id:
        query = query.filter(Bookmark.video_id == video_id)
    bookmarks = query.order_by(Bookmark.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "video_id": b.video_id,
            "item_type": b.item_type,
            "item_id": b.item_id,
            "title": b.title,
            "content_snippet": b.content_snippet,
            "created_at": b.created_at
        }
        for b in bookmarks
    ]

@router.post("/bookmarks")
def add_bookmark(
    request: BookmarkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Adds a bookmark for a concept, note section, or question."""
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.video_id == request.video_id,
        Bookmark.item_id == request.item_id
    ).first()

    if existing:
        return {"message": "Already bookmarked", "id": existing.id}

    bookmark = Bookmark(
        user_id=current_user.id,
        video_id=request.video_id,
        item_type=request.item_type,
        item_id=request.item_id,
        title=request.title,
        content_snippet=request.content_snippet
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return {"message": "Bookmarked successfully", "id": bookmark.id}

@router.delete("/bookmarks/{bookmark_id}")
def delete_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Removes a bookmark."""
    bookmark = db.query(Bookmark).filter(
        Bookmark.id == bookmark_id,
        Bookmark.user_id == current_user.id
    ).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark removed"}
