import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, VideoComparison
from app.schemas.schemas import CompareVideosRequest, VideoComparisonOut
from app.services.youtube import extract_video_id, fetch_youtube_metadata, extract_transcript
from app.services.ai_gemini import compare_videos_ai

router = APIRouter()

@router.post("/compare-videos", response_model=VideoComparisonOut)
def compare_multiple_videos(
    request: CompareVideosRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Compares two educational YouTube videos on the same subject."""
    if len(request.youtube_urls) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least two YouTube URLs to compare."
        )

    # Process Video 1
    vid1 = extract_video_id(request.youtube_urls[0])
    vid2 = extract_video_id(request.youtube_urls[1])

    if not vid1 or not vid2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or both YouTube URLs are invalid."
        )

    meta1 = fetch_youtube_metadata(vid1)
    meta2 = fetch_youtube_metadata(vid2)

    t1, _ = extract_transcript(vid1, meta1.get("title", ""))
    t2, _ = extract_transcript(vid2, meta2.get("title", ""))

    comparison_data = compare_videos_ai(
        {"title": meta1.get("title", "Video 1"), "channel": meta1.get("channel", "N/A"), "transcript": t1},
        {"title": meta2.get("title", "Video 2"), "channel": meta2.get("channel", "N/A"), "transcript": t2}
    )

    comp_record = VideoComparison(
        user_id=current_user.id,
        video_ids_json=json.dumps([vid1, vid2]),
        video_titles_json=json.dumps([meta1.get("title", "Video 1"), meta2.get("title", "Video 2")]),
        comparison_json=json.dumps(comparison_data),
        combined_notes_markdown=comparison_data.get("combined_notes", "")
    )
    db.add(comp_record)
    db.commit()
    db.refresh(comp_record)

    return {
        "id": comp_record.id,
        "video_titles": [meta1.get("title", "Video 1"), meta2.get("title", "Video 2")],
        "summary_comparison": comparison_data.get("summary_comparison", ""),
        "common_concepts": comparison_data.get("common_concepts", []),
        "unique_points": comparison_data.get("unique_points", {}),
        "differences": comparison_data.get("differences", []),
        "combined_notes": comparison_data.get("combined_notes", ""),
        "created_at": comp_record.created_at
    }
