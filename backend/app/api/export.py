import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, StudyMaterial, Quiz
from app.services.pdf_generator import generate_study_pdf

router = APIRouter()

@router.get("/pdf/{video_id}")
def export_pdf(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Generates and downloads a PDF study guide."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    material = video.study_materials[0] if video.study_materials else None
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found.")

    quiz = video.quizzes[0] if video.quizzes else None

    video_data = {
        "title": video.title,
        "channel": video.channel,
        "duration": video.duration
    }
    study_data = {
        "study_mode": material.study_mode,
        "notes_markdown": material.notes_markdown,
        "summary": json.loads(material.summary_json) if material.summary_json else {},
        "key_concepts": json.loads(material.key_concepts_json) if material.key_concepts_json else []
    }
    quiz_data = {
        "questions": json.loads(quiz.questions_json) if quiz and quiz.questions_json else []
    }

    pdf_bytes = generate_study_pdf(video_data, study_data, quiz_data)
    safe_filename = "".join(c for c in video.title if c.isalnum() or c in (" ", "_", "-")).rstrip()[:40]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="StudyTube_{safe_filename}.pdf"'}
    )

@router.get("/markdown/{video_id}")
def export_markdown(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Exports study material as a formatted Markdown file."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    material = video.study_materials[0] if video.study_materials else None
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found.")

    summary = json.loads(material.summary_json) if material.summary_json else {}
    takeaways_str = "\n".join([f"- {t}" for t in summary.get("key_takeaways", [])])

    md_content = f"""# {video.title}

- **Source / Channel**: {video.channel}
- **YouTube Link**: {video.youtube_url}
- **Study Mode**: {material.study_mode.title()}
- **Language**: {material.language}

---

## Executive Summary
> {summary.get('one_line', '')}

{summary.get('short', '')}

### Key Takeaways
{takeaways_str}

---

{material.notes_markdown}
"""
    safe_filename = "".join(c for c in video.title if c.isalnum() or c in (" ", "_", "-")).rstrip()[:40]
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="StudyTube_{safe_filename}.md"'}
    )

@router.get("/text/{video_id}")
def export_text(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Exports study material as plain text."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    material = video.study_materials[0] if video.study_materials else None
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found.")

    summary = json.loads(material.summary_json) if material.summary_json else {}
    text_content = f"""STUDYTUBE AI — STUDY GUIDE
Title: {video.title}
Channel: {video.channel}
URL: {video.youtube_url}

SUMMARY:
{summary.get('one_line', '')}

{summary.get('short', '')}

NOTES:
{material.notes_markdown}
"""
    safe_filename = "".join(c for c in video.title if c.isalnum() or c in (" ", "_", "-")).rstrip()[:40]
    return Response(
        content=text_content,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="StudyTube_{safe_filename}.txt"'}
    )
