import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True) # nullable for pure Google OAuth users
    avatar_url = Column(String(512), nullable=True)
    preferred_language = Column(String(50), default="English")
    theme_preference = Column(String(50), default="dark")
    study_preferences = Column(Text, default="{}") # JSON: default_mode, notification_settings, etc.
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    videos = relationship("Video", back_populates="owner", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    flashcard_progress = relationship("FlashcardProgress", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("UserNote", back_populates="user", cascade="all, delete-orphan")
    quick_notes = relationship("QuickNote", back_populates="user", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    youtube_url = Column(String(512), nullable=False)
    video_id = Column(String(64), index=True, nullable=False)
    title = Column(String(512), nullable=False)
    channel = Column(String(255), nullable=True)
    duration = Column(String(64), nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    transcript_json = Column(Text, nullable=True) # JSON list of {text, start, duration}
    progress_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="videos")
    study_materials = relationship("StudyMaterial", back_populates="video", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="video", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="video", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="video", cascade="all, delete-orphan")
    notes = relationship("UserNote", back_populates="video", cascade="all, delete-orphan")
    quick_notes = relationship("QuickNote", back_populates="video", cascade="all, delete-orphan")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    study_mode = Column(String(50), default="detailed") # detailed, quick, exam, beginner
    language = Column(String(50), default="English")
    overview = Column(Text, nullable=True)
    notes_markdown = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=True) # {one_line, short, detailed, key_takeaways}
    key_concepts_json = Column(Text, nullable=True) # [{name, definition, example, category, timestamp}]
    concept_map_json = Column(Text, nullable=True) # {nodes: [], edges: []}
    timestamps_json = Column(Text, nullable=True) # [{time_str, seconds, label, description}]
    topics_json = Column(Text, nullable=True) # [{id, title, subtopics: [], completed: bool}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="study_materials")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    title = Column(String(255), nullable=False)
    questions_json = Column(Text, nullable=False) # list of question objects with options, correct, explanations
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    answers_json = Column(Text, nullable=False) # user submitted answers vs correct
    weak_topics_json = Column(Text, default="[]") # detected weak concepts
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    title = Column(String(255), nullable=False)
    cards_json = Column(Text, nullable=False) # list of {id, front, back, concept, difficulty}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="flashcard_decks")
    progress = relationship("FlashcardProgress", back_populates="deck", cascade="all, delete-orphan")


class FlashcardProgress(Base):
    __tablename__ = "flashcard_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), nullable=False)
    card_id = Column(String(64), nullable=False)
    state = Column(String(50), default="unreviewed") # known, need_revision, learning
    review_count = Column(Integer, default=0)
    last_reviewed_at = Column(DateTime, default=datetime.datetime.utcnow)
    next_review_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="flashcard_progress")
    deck = relationship("FlashcardDeck", back_populates="progress")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    role = Column(String(20), nullable=False) # user, assistant
    content = Column(Text, nullable=False)
    cited_timestamps_json = Column(Text, default="[]") # [{seconds, time_str, label}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chat_messages")
    video = relationship("Video", back_populates="chat_messages")


class VideoComparison(Base):
    __tablename__ = "video_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_ids_json = Column(Text, nullable=False)
    video_titles_json = Column(Text, nullable=False)
    comparison_json = Column(Text, nullable=False) # common, differences, synthesis
    combined_notes_markdown = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    item_type = Column(String(50), nullable=False) # concept, section, question, flashcard
    item_id = Column(String(128), nullable=False)
    title = Column(String(255), nullable=False)
    content_snippet = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookmarks")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(64), nullable=False)
    details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="activities")


class UserNote(Base):
    __tablename__ = "user_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    title = Column(String(255), default="My Notes")
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notes")
    video = relationship("Video", back_populates="notes")


class QuickNote(Base):
    __tablename__ = "quick_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    timestamp_seconds = Column(Integer, nullable=False, default=0)
    time_str = Column(String(20), nullable=False, default="00:00")
    note_text = Column(Text, nullable=False)
    tags = Column(String(255), nullable=True, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="quick_notes")
    video = relationship("Video", back_populates="quick_notes")

