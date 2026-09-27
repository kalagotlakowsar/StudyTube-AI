import axios from 'axios';
import {
  User, Video, StudyMaterial, Quiz, QuizAttempt,
  FlashcardDeck, ChatMessage, VideoComparison,
  DashboardStats, SpacedRevisionItem, Bookmark,
  UserNote, QuickNote
} from '../types';


const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('studytube_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>('/auth/register', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>('/auth/login', data);
    return res.data;
  },
  googleAuth: async (data: { token?: string; email?: string; name?: string; avatar_url?: string }) => {
    const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>('/auth/google', data);
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await apiClient.post<{ message: string; demo_code?: string }>('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (data: { email: string; token: string; new_password: string }) => {
    const res = await apiClient.post<{ message: string }>('/auth/reset-password', data);
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Partial<User>) => {
    const res = await apiClient.put<User>('/auth/me', data);
    return res.data;
  },
  getGoogleConfig: async () => {
    const res = await apiClient.get<{ client_id: string; configured: boolean }>('/auth/google/config');
    return res.data;
  },
};


// Video API
export const videoApi = {
  getMetadata: async (youtube_url: string) => {
    const res = await apiClient.post('/videos/metadata', { youtube_url });
    return res.data;
  },
  processUrl: async (data: { youtube_url: string; study_mode?: string; language?: string }) => {
    const res = await apiClient.post<{
      video: Video;
      study_material: StudyMaterial;
      quiz: Quiz;
      flashcards: FlashcardDeck;
    }>('/videos/process-url', data);
    return res.data;
  },
  getLibrary: async () => {
    const res = await apiClient.get<Video[]>('/videos/library');
    return res.data;
  },
  getLibraryItem: async (id: number) => {
    const res = await apiClient.get<{
      video: Video;
      study_material: StudyMaterial;
      quiz: Quiz;
      flashcards: FlashcardDeck;
    }>(`/videos/library/${id}`);
    return res.data;
  },
  deleteLibraryItem: async (id: number) => {
    const res = await apiClient.delete(`/videos/library/${id}`);
    return res.data;
  },
  updateProgress: async (id: number, progress_percentage: number) => {
    const res = await apiClient.post(`/videos/library/${id}/progress`, { progress_percentage });
    return res.data;
  },
};

// Study API
export const studyApi = {
  regenerateMode: async (video_id: number, study_mode: string) => {
    const res = await apiClient.post<{ study_material: StudyMaterial }>('/study/regenerate-mode', {
      video_id,
      study_mode,
    });
    return res.data;
  },
  translate: async (video_id: number, language: string) => {
    const res = await apiClient.post<{ study_material: StudyMaterial }>('/study/translate', {
      video_id,
      language,
    });
    return res.data;
  },
  toggleTopic: async (video_id: number, topic_id: string, completed: boolean) => {
    const res = await apiClient.post<{ topics: any[]; progress_percentage: number }>('/study/toggle-topic', {
      video_id,
      topic_id,
      completed,
    });
    return res.data;
  },
  getBookmarks: async (video_id?: number) => {
    const res = await apiClient.get<Bookmark[]>('/study/bookmarks', { params: { video_id } });
    return res.data;
  },
  addBookmark: async (data: { video_id: number; item_type: string; item_id: string; title: string; content_snippet?: string }) => {
    const res = await apiClient.post<{ message: string; id: number }>('/study/bookmarks', data);
    return res.data;
  },
  deleteBookmark: async (bookmark_id: number) => {
    const res = await apiClient.delete(`/study/bookmarks/${bookmark_id}`);
    return res.data;
  },
};

// Quiz API
export const quizApi = {
  getQuiz: async (video_id: number) => {
    const res = await apiClient.get<Quiz>(`/quiz/get/${video_id}`);
    return res.data;
  },
  submitAttempt: async (quiz_id: number, answers: { question_id: number; selected_index: number }[]) => {
    const res = await apiClient.post<QuizAttempt>('/quiz/submit-attempt', { quiz_id, answers });
    return res.data;
  },
  getHistory: async (video_id: number) => {
    const res = await apiClient.get<any[]>(`/quiz/history/${video_id}`);
    return res.data;
  },
};

// Flashcards API
export const flashcardsApi = {
  getDeck: async (video_id: number) => {
    const res = await apiClient.get<FlashcardDeck>(`/flashcards/get/${video_id}`);
    return res.data;
  },
  reviewCard: async (deck_id: number, card_id: string, state: 'known' | 'need_revision') => {
    const res = await apiClient.post('/flashcards/review-card', { card_id, state }, { params: { deck_id } });
    return res.data;
  },
  getSpacedRevisionDue: async () => {
    const res = await apiClient.get<SpacedRevisionItem[]>('/flashcards/spaced-revision-due');
    return res.data;
  },
};

// Chat / RAG API
export const chatApi = {
  askAi: async (video_id: number, message: string) => {
    const res = await apiClient.post<ChatMessage>('/chat/ask', { video_id, message });
    return res.data;
  },
  getHistory: async (video_id: number) => {
    const res = await apiClient.get<ChatMessage[]>(`/chat/history/${video_id}`);
    return res.data;
  },
};

// Compare API
export const compareApi = {
  compareVideos: async (youtube_urls: string[]) => {
    const res = await apiClient.post<VideoComparison>('/compare/compare-videos', { youtube_urls });
    return res.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },
};

// Notes API (User Notes and Quick Notes)
export const notesApi = {
  getUserNote: async (videoId: number) => {
    const res = await apiClient.get<UserNote>(`/notes/${videoId}`);
    return res.data;
  },
  saveUserNote: async (videoId: number, data: { title?: string; content: string }) => {
    const res = await apiClient.post<UserNote>(`/notes/${videoId}`, data);
    return res.data;
  },
  deleteUserNote: async (noteId: number) => {
    const res = await apiClient.delete(`/notes/note/${noteId}`);
    return res.data;
  },
  getQuickNotes: async (videoId: number) => {
    const res = await apiClient.get<QuickNote[]>(`/notes/quick/${videoId}`);
    return res.data;
  },
  createQuickNote: async (videoId: number, data: { timestamp_seconds: number; time_str: string; note_text: string; tags?: string }) => {
    const res = await apiClient.post<QuickNote>(`/notes/quick/${videoId}`, data);
    return res.data;
  },
  updateQuickNote: async (noteId: number, data: { note_text?: string; timestamp_seconds?: number; time_str?: string; tags?: string }) => {
    const res = await apiClient.put<QuickNote>(`/notes/quick/${noteId}`, data);
    return res.data;
  },
  deleteQuickNote: async (noteId: number) => {
    const res = await apiClient.delete(`/notes/quick/${noteId}`);
    return res.data;
  },
};

// Export Helpers
export const exportApi = {
  downloadPdfUrl: (videoId: number) => {
    const token = localStorage.getItem('studytube_token');
    return `${API_BASE}/export/pdf/${videoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadMarkdownUrl: (videoId: number) => {
    const token = localStorage.getItem('studytube_token');
    return `${API_BASE}/export/markdown/${videoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadTextUrl: (videoId: number) => {
    const token = localStorage.getItem('studytube_token');
    return `${API_BASE}/export/text/${videoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};


