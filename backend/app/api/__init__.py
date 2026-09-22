from fastapi import APIRouter
from app.api import auth, videos, study, quiz, flashcards, chat, compare, export, dashboard, notes

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(study.router, prefix="/study", tags=["study"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(flashcards.router, prefix="/flashcards", tags=["flashcards"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(compare.router, prefix="/compare", tags=["compare"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

