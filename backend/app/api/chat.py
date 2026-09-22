import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Video, ChatMessage
from app.schemas.schemas import ChatMessageRequest, ChatMessageOut
from app.services.rag import TranscriptRAG

router = APIRouter()

@router.post("/ask", response_model=ChatMessageOut)
def ask_video_ai(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Answers user queries grounded in video transcript using RAG."""
    video = db.query(Video).filter(Video.id == request.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    transcript_items = json.loads(video.transcript_json) if video.transcript_json else []

    # Store user message
    user_msg = ChatMessage(
        user_id=current_user.id,
        video_id=video.id,
        role="user",
        content=request.message,
        cited_timestamps_json="[]"
    )
    db.add(user_msg)

    # Execute RAG
    rag_engine = TranscriptRAG(transcript_items)
    ai_response = rag_engine.answer_query(request.message, video.title)

    cited_ts = ai_response.get("cited_timestamps", [])

    # Store assistant message
    bot_msg = ChatMessage(
        user_id=current_user.id,
        video_id=video.id,
        role="assistant",
        content=ai_response.get("content", ""),
        cited_timestamps_json=json.dumps(cited_ts)
    )
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)

    return {
        "id": bot_msg.id,
        "role": bot_msg.role,
        "content": bot_msg.content,
        "cited_timestamps": cited_ts,
        "created_at": bot_msg.created_at
    }

@router.get("/history/{video_id}", response_model=List[ChatMessageOut])
def get_chat_history(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Returns conversation history for this video."""
    messages = db.query(ChatMessage).filter(
        ChatMessage.video_id == video_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "cited_timestamps": json.loads(m.cited_timestamps_json) if m.cited_timestamps_json else [],
            "created_at": m.created_at
        }
        for m in messages
    ]
