import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, StudyMaterial, Quiz, FlashcardDeck, UserActivity
from app.schemas.schemas import (
    ProcessVideoRequest, VideoMetadataResponse, VideoListItem,
    StudyMaterialOut, QuizOut, FlashcardDeckOut
)
from app.services.youtube import extract_video_id, fetch_youtube_metadata, extract_transcript
from app.services.ai_gemini import generate_study_material, generate_quiz, generate_flashcards

router = APIRouter()

@router.post("/metadata", response_model=VideoMetadataResponse)
def get_video_metadata(request: ProcessVideoRequest) -> Any:
    """Pre-validates URL and extracts video title, thumbnail, and channel without saving."""
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link."
        )

    meta = fetch_youtube_metadata(video_id)
    return {
        "video_id": video_id,
        "title": meta.get("title", f"Video {video_id}"),
        "channel": meta.get("channel", "YouTube Creator"),
        "duration": meta.get("duration", "15:00"),
        "thumbnail_url": meta.get("thumbnail_url", ""),
        "has_transcript": True
    }

@router.post("/process-url")
def process_video_url(
    request: ProcessVideoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Main pipeline:
    1. Validates YouTube URL
    2. Fetches metadata
    3. Extracts & cleans transcript
    4. Generates multi-mode structured notes, summary, key concepts, concept map
    5. Generates quiz questions
    6. Generates flashcards
    7. Saves all models into database
    8. Returns complete study payload
    """
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL. Please provide a valid YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)."
        )

    # 1. Fetch metadata
    meta = fetch_youtube_metadata(video_id)
    title = meta.get("title", f"Study Session: {video_id}")
    channel = meta.get("channel", "Educational Channel")
    duration = meta.get("duration", "15:00")
    thumbnail_url = meta.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg")

    # 2. Extract transcript
    transcript_items, is_real = extract_transcript(video_id, title)

    # 3. Check if user already processed this video
    existing_video = db.query(Video).filter(
        Video.user_id == current_user.id,
        Video.video_id == video_id
    ).first()

    if existing_video:
        video_record = existing_video
        video_record.title = title
        video_record.channel = channel
        video_record.thumbnail_url = thumbnail_url
        video_record.transcript_json = json.dumps(transcript_items)
    else:
        video_record = Video(
            user_id=current_user.id,
            youtube_url=request.youtube_url,
            video_id=video_id,
            title=title,
            channel=channel,
            duration=duration,
            thumbnail_url=thumbnail_url,
            transcript_json=json.dumps(transcript_items),
            progress_percentage=0.0
        )
        db.add(video_record)
        db.commit()
        db.refresh(video_record)

    # 4. Generate Study Material with Gemini
    study_data = generate_study_material(
        title=title,
        channel=channel,
        transcript_items=transcript_items,
        study_mode=request.study_mode or "detailed",
        language=request.language or "English"
    )

    # Save StudyMaterial
    existing_material = db.query(StudyMaterial).filter(StudyMaterial.video_id == video_record.id).first()
    if existing_material:
        existing_material.study_mode = request.study_mode or "detailed"
        existing_material.language = request.language or "English"
        existing_material.overview = study_data.get("overview", "")
        existing_material.notes_markdown = study_data.get("notes_markdown", "")
        existing_material.summary_json = json.dumps(study_data.get("summary", {}))
        existing_material.key_concepts_json = json.dumps(study_data.get("key_concepts", []))
        existing_material.concept_map_json = json.dumps(study_data.get("concept_map", {}))
        existing_material.timestamps_json = json.dumps(study_data.get("timestamps", []))
        existing_material.topics_json = json.dumps(study_data.get("topics", []))
        material_record = existing_material
    else:
        material_record = StudyMaterial(
            video_id=video_record.id,
            study_mode=request.study_mode or "detailed",
            language=request.language or "English",
            overview=study_data.get("overview", ""),
            notes_markdown=study_data.get("notes_markdown", ""),
            summary_json=json.dumps(study_data.get("summary", {})),
            key_concepts_json=json.dumps(study_data.get("key_concepts", [])),
            concept_map_json=json.dumps(study_data.get("concept_map", {})),
            timestamps_json=json.dumps(study_data.get("timestamps", [])),
            topics_json=json.dumps(study_data.get("topics", []))
        )
        db.add(material_record)

    # 5. Generate Quiz
    quiz_questions = generate_quiz(title, transcript_items)
    existing_quiz = db.query(Quiz).filter(Quiz.video_id == video_record.id).first()
    if existing_quiz:
        existing_quiz.questions_json = json.dumps(quiz_questions)
        quiz_record = existing_quiz
    else:
        quiz_record = Quiz(
            video_id=video_record.id,
            title=f"Quiz: {title[:60]}",
            questions_json=json.dumps(quiz_questions)
        )
        db.add(quiz_record)

    # 6. Generate Flashcards
    flashcard_items = generate_flashcards(title, transcript_items)
    existing_deck = db.query(FlashcardDeck).filter(FlashcardDeck.video_id == video_record.id).first()
    if existing_deck:
        existing_deck.cards_json = json.dumps(flashcard_items)
        deck_record = existing_deck
    else:
        deck_record = FlashcardDeck(
            video_id=video_record.id,
            title=f"Flashcards: {title[:60]}",
            cards_json=json.dumps(flashcard_items)
        )
        db.add(deck_record)

    # Record UserActivity
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="video_processed",
        details_json=json.dumps({"video_id": video_record.id, "title": title})
    )
    db.add(activity)

    db.commit()
    db.refresh(video_record)
    db.refresh(material_record)
    db.refresh(quiz_record)
    db.refresh(deck_record)

    return {
        "video": {
            "id": video_record.id,
            "video_id": video_record.video_id,
            "youtube_url": video_record.youtube_url,
            "title": video_record.title,
            "channel": video_record.channel,
            "duration": video_record.duration,
            "thumbnail_url": video_record.thumbnail_url,
            "progress_percentage": video_record.progress_percentage
        },
        "study_material": {
            "id": material_record.id,
            "video_id": video_record.id,
            "study_mode": material_record.study_mode,
            "language": material_record.language,
            "overview": material_record.overview,
            "notes_markdown": material_record.notes_markdown,
            "summary": study_data.get("summary", {}),
            "key_concepts": study_data.get("key_concepts", []),
            "concept_map": study_data.get("concept_map", {}),
            "timestamps": study_data.get("timestamps", []),
            "topics": study_data.get("topics", []),
            "created_at": material_record.created_at
        },
        "quiz": {
            "id": quiz_record.id,
            "video_id": video_record.id,
            "title": quiz_record.title,
            "questions": quiz_questions
        },
        "flashcards": {
            "id": deck_record.id,
            "video_id": video_record.id,
            "title": deck_record.title,
            "cards": flashcard_items
        }
    }

@router.get("/library", response_model=List[VideoListItem])
def get_user_library(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Returns all saved videos for the current user."""
    videos = db.query(Video).filter(Video.user_id == current_user.id).order_by(Video.created_at.desc()).all()
    results = []
    for v in videos:
        # Check latest quiz score
        latest_attempt = None
        if v.quizzes and len(v.quizzes) > 0:
            latest_attempt = v.quizzes[0].attempts[-1] if v.quizzes[0].attempts else None
        
        study_mode = "detailed"
        if v.study_materials:
            study_mode = v.study_materials[0].study_mode

        results.append({
            "id": v.id,
            "video_id": v.video_id,
            "youtube_url": v.youtube_url,
            "title": v.title,
            "channel": v.channel,
            "duration": v.duration,
            "thumbnail_url": v.thumbnail_url,
            "progress_percentage": v.progress_percentage or 0.0,
            "created_at": v.created_at,
            "study_mode": study_mode,
            "quiz_score": latest_attempt.percentage if latest_attempt else None
        })
    return results

@router.get("/library/{id}")
def get_library_video_details(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Fetches complete saved video package with materials, quizzes, and flashcards."""
    video = db.query(Video).filter(Video.id == id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    material = video.study_materials[0] if video.study_materials else None
    quiz = video.quizzes[0] if video.quizzes else None
    deck = video.flashcard_decks[0] if video.flashcard_decks else None

    # Parse JSON fields safely
    summary_data = json.loads(material.summary_json) if material and material.summary_json else {}
    key_concepts = json.loads(material.key_concepts_json) if material and material.key_concepts_json else []
    concept_map = json.loads(material.concept_map_json) if material and material.concept_map_json else {"nodes": [], "edges": []}
    timestamps = json.loads(material.timestamps_json) if material and material.timestamps_json else []
    topics = json.loads(material.topics_json) if material and material.topics_json else []
    quiz_questions = json.loads(quiz.questions_json) if quiz and quiz.questions_json else []
    flashcards = json.loads(deck.cards_json) if deck and deck.cards_json else []

    return {
        "video": {
            "id": video.id,
            "video_id": video.video_id,
            "youtube_url": video.youtube_url,
            "title": video.title,
            "channel": video.channel,
            "duration": video.duration,
            "thumbnail_url": video.thumbnail_url,
            "progress_percentage": video.progress_percentage
        },
        "study_material": {
            "id": material.id if material else None,
            "video_id": video.id,
            "study_mode": material.study_mode if material else "detailed",
            "language": material.language if material else "English",
            "overview": material.overview if material else "",
            "notes_markdown": material.notes_markdown if material else "",
            "summary": summary_data,
            "key_concepts": key_concepts,
            "concept_map": concept_map,
            "timestamps": timestamps,
            "topics": topics,
            "created_at": material.created_at if material else video.created_at
        },
        "quiz": {
            "id": quiz.id if quiz else None,
            "video_id": video.id,
            "title": quiz.title if quiz else "Video Quiz",
            "questions": quiz_questions
        },
        "flashcards": {
            "id": deck.id if deck else None,
            "video_id": video.id,
            "title": deck.title if deck else "Flashcard Deck",
            "cards": flashcards
        }
    }

@router.delete("/library/{id}")
def delete_library_video(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Deletes a video from user library."""
    video = db.query(Video).filter(Video.id == id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    db.delete(video)
    db.commit()
    return {"message": "Video successfully deleted from your library."}

@router.post("/library/{id}/progress")
def update_video_progress(
    id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Updates the user's completion progress for a video."""
    video = db.query(Video).filter(Video.id == id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    progress = payload.get("progress_percentage", 0.0)
    video.progress_percentage = min(max(float(progress), 0.0), 100.0)
    db.commit()
    return {"progress_percentage": video.progress_percentage}
