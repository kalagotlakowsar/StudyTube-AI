export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  preferred_language: string;
  theme_preference: string;
  study_preferences?: Record<string, any>;
  created_at: string;
}

export interface Video {
  id: number;
  video_id: string;
  youtube_url: string;
  title: string;
  channel?: string;
  duration?: string;
  thumbnail_url?: string;
  progress_percentage: number;
  study_mode?: string;
  quiz_score?: number | null;
  created_at: string;
}

export interface TimestampItem {
  seconds: number;
  time_str: string;
  label: string;
  description?: string;
}

export interface KeyConcept {
  name: string;
  definition: string;
  example?: string;
  category?: string;
  timestamp?: string;
}

export interface TopicItem {
  id: string;
  title: string;
  subtopics: string[];
  completed: boolean;
}

export interface ConceptMapNode {
  id: string;
  label: string;
  category: string;
  description?: string;
}

export interface ConceptMapEdge {
  from_node: string;
  to_node: string;
  relation: string;
}

export interface ConceptMapData {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
}

export interface SummaryData {
  one_line: string;
  short: string;
  detailed: string;
  key_takeaways: string[];
}

export interface StudyMaterial {
  id: number;
  video_id: number;
  study_mode: string;
  language: string;
  overview?: string;
  notes_markdown: string;
  summary: SummaryData;
  key_concepts: KeyConcept[];
  concept_map: ConceptMapData;
  timestamps: TimestampItem[];
  topics: TopicItem[];
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  type: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  topic?: string;
}

export interface Quiz {
  id: number;
  video_id: number;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizAttemptReviewItem {
  question_id: number;
  question: string;
  options: string[];
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
  topic: string;
}

export interface QuizAttempt {
  id: number;
  score: number;
  total_questions: number;
  percentage: number;
  weak_topics: string[];
  review: QuizAttemptReviewItem[];
  completed_at: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  state?: 'unreviewed' | 'known' | 'need_revision';
}

export interface FlashcardDeck {
  id: number;
  video_id: number;
  title: string;
  cards: FlashcardItem[];
}

export interface CitedTimestamp {
  seconds: number;
  time_str: string;
  label: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  cited_timestamps: CitedTimestamp[];
  created_at: string;
}

export interface WeakAreaItem {
  topic: string;
  mistake_count: number;
  video_title: string;
  video_id: number;
}

export interface SpacedRevisionItem {
  card_id: string;
  front: string;
  back: string;
  video_id: number;
  video_title: string;
  due_date: string;
}

export interface DashboardStats {
  videos_processed: number;
  topics_learned: number;
  quizzes_completed: number;
  average_quiz_score: number;
  flashcards_reviewed: number;
  current_streak_days: number;
  notes_count?: number;
  quick_notes_count?: number;
  weak_areas: WeakAreaItem[];
  recent_videos: Video[];
  spaced_revision_due: SpacedRevisionItem[];
  weekly_activity: { day: string; count: number }[];
}

export interface VideoComparison {
  id: number;
  video_titles: string[];
  summary_comparison: string;
  common_concepts: string[];
  unique_points: Record<string, string[]>;
  differences: { aspect: string; video_a: string; video_b: string }[];
  combined_notes: string;
  created_at: string;
}

export interface Bookmark {
  id: number;
  video_id: number;
  item_type: string;
  item_id: string;
  title: string;
  content_snippet?: string;
  created_at: string;
}

export interface UserNote {
  id: number;
  user_id: number;
  video_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface QuickNote {
  id: number;
  user_id: number;
  video_id: number;
  timestamp_seconds: number;
  time_str: string;
  note_text: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

