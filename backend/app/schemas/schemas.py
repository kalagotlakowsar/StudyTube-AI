import json
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    token: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = None
    theme_preference: Optional[str] = None
    study_preferences: Optional[Union[Dict[str, Any], str]] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    avatar_url: Optional[str] = None
    preferred_language: str
    theme_preference: str
    study_preferences: Optional[Dict[str, Any]] = None
    created_at: datetime

    @field_validator('study_preferences', mode='before')
    @classmethod
    def parse_study_preferences(cls, v: Any) -> Optional[Dict[str, Any]]:
        if v is None:
            return {}
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                return {}
        return {}

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Video & Processing Schemas ---
class ProcessVideoRequest(BaseModel):
    youtube_url: str
    study_mode: Optional[str] = "detailed" # detailed, quick, exam, beginner
    language: Optional[str] = "English"

class VideoMetadataResponse(BaseModel):
    video_id: str
    title: str
    channel: str
    duration: str
    thumbnail_url: str
    has_transcript: bool

class VideoListItem(BaseModel):
    id: int
    video_id: str
    youtube_url: str
    title: str
    channel: Optional[str] = None
    duration: Optional[str] = None
    thumbnail_url: Optional[str] = None
    progress_percentage: float = 0.0
    created_at: datetime
    study_mode: Optional[str] = "detailed"
    quiz_score: Optional[float] = None

    class Config:
        from_attributes = True

# --- Study Material Schemas ---
class TimestampItem(BaseModel):
    seconds: int
    time_str: str
    label: str
    description: Optional[str] = ""

class KeyConcept(BaseModel):
    name: str
    definition: str
    example: Optional[str] = ""
    category: Optional[str] = "General"
    timestamp: Optional[str] = None

class TopicItem(BaseModel):
    id: str
    title: str
    subtopics: List[str] = []
    completed: bool = False

class ConceptMapNode(BaseModel):
    id: str
    label: str
    category: str
    description: Optional[str] = ""

class ConceptMapEdge(BaseModel):
    from_node: str
    to_node: str
    relation: str

class ConceptMapData(BaseModel):
    nodes: List[ConceptMapNode]
    edges: List[ConceptMapEdge]

class SummaryData(BaseModel):
    one_line: str
    short: str
    detailed: str
    key_takeaways: List[str]

class StudyMaterialOut(BaseModel):
    id: int
    video_id: int
    study_mode: str
    language: str
    overview: Optional[str] = None
    notes_markdown: str
    summary: SummaryData
    key_concepts: List[KeyConcept]
    concept_map: ConceptMapData
    timestamps: List[TimestampItem]
    topics: List[TopicItem]
    created_at: datetime

# --- Quiz Schemas ---
class QuizQuestion(BaseModel):
    id: int
    question: str
    type: str = "mcq" # mcq, true_false, short_answer, conceptual
    options: List[str]
    correct_answer_index: int
    explanation: str
    topic: Optional[str] = None

class QuizOut(BaseModel):
    id: int
    video_id: int
    title: str
    questions: List[QuizQuestion]

class UserAnswer(BaseModel):
    question_id: int
    selected_index: int

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[UserAnswer]

class QuizAttemptOut(BaseModel):
    id: int
    score: int
    total_questions: int
    percentage: float
    weak_topics: List[str]
    review: List[Dict[str, Any]]
    completed_at: datetime

# --- Flashcard Schemas ---
class FlashcardItem(BaseModel):
    id: str
    front: str
    back: str
    concept: str
    difficulty: str = "medium" # easy, medium, hard
    state: Optional[str] = "unreviewed" # unreviewed, known, need_revision

class FlashcardDeckOut(BaseModel):
    id: int
    video_id: int
    title: str
    cards: List[FlashcardItem]

class FlashcardReviewRequest(BaseModel):
    card_id: str
    state: str # known, need_revision

# --- Chat & RAG Schemas ---
class ChatMessageRequest(BaseModel):
    video_id: int
    message: str

class CitedTimestamp(BaseModel):
    seconds: int
    time_str: str
    label: str

class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    cited_timestamps: List[CitedTimestamp] = []
    created_at: datetime

# --- Comparison Schemas ---
class CompareVideosRequest(BaseModel):
    youtube_urls: List[str]

class VideoComparisonOut(BaseModel):
    id: int
    video_titles: List[str]
    summary_comparison: str
    common_concepts: List[str]
    unique_points: Dict[str, List[str]] # key: title, value: points
    differences: List[Dict[str, str]]
    combined_notes: str
    created_at: datetime

# --- Dashboard & Activity Schemas ---
class WeakAreaItem(BaseModel):
    topic: str
    mistake_count: int
    video_title: str
    video_id: int

class SpacedRevisionItem(BaseModel):
    card_id: str
    front: str
    back: str
    video_id: int
    video_title: str
    due_date: datetime

class DashboardStatsOut(BaseModel):
    videos_processed: int
    topics_learned: int
    quizzes_completed: int
    average_quiz_score: float
    flashcards_reviewed: int
    current_streak_days: int
    notes_count: Optional[int] = 0
    quick_notes_count: Optional[int] = 0
    weak_areas: List[WeakAreaItem]
    recent_videos: List[VideoListItem]
    spaced_revision_due: List[SpacedRevisionItem]
    weekly_activity: List[Dict[str, Any]]


# --- General Action Schemas ---
class TopicToggleRequest(BaseModel):
    topic_id: str
    completed: bool

class BookmarkCreateRequest(BaseModel):
    video_id: int
    item_type: str
    item_id: str
    title: str
    content_snippet: Optional[str] = None

class BookmarkOut(BaseModel):
    id: int
    user_id: int
    video_id: int
    item_type: str
    item_id: str
    title: str
    content_snippet: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- User Custom Notes Schemas ---
class UserNoteCreate(BaseModel):
    title: Optional[str] = "My Notes"
    content: str

class UserNoteOut(BaseModel):
    id: int
    user_id: int
    video_id: int
    title: Optional[str] = "My Notes"
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Quick Notes (Timestamped) Schemas ---
class QuickNoteCreate(BaseModel):
    timestamp_seconds: int = 0
    time_str: str = "00:00"
    note_text: str
    tags: Optional[str] = ""

class QuickNoteUpdate(BaseModel):
    timestamp_seconds: Optional[int] = None
    time_str: Optional[str] = None
    note_text: Optional[str] = None
    tags: Optional[str] = None

class QuickNoteOut(BaseModel):
    id: int
    user_id: int
    video_id: int
    timestamp_seconds: int
    time_str: str
    note_text: str
    tags: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

