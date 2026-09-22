import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, StudyMaterial, Quiz, FlashcardDeck, UserNote, QuickNote } from '../types';
import { videoApi, studyApi, exportApi, notesApi } from '../api/client';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { FlashcardViewer } from '../components/FlashcardViewer';
import { QuizModal } from '../components/QuizModal';
import { ConceptMap } from '../components/ConceptMap';
import { VideoChat } from '../components/VideoChat';
import { useToast } from '../components/Toast';
import {
  BookOpen, Sparkles, HelpCircle, Layers, MessageSquare,
  Compass, Download, Globe, CheckCircle2, Circle, Clock,
  Search, Copy, Bookmark as BookmarkIcon, ArrowLeft,
  FileText, ExternalLink, ChevronRight, Check, Edit3, Trash2,
  Save, Plus, Tag, Eye, RefreshCw
} from 'lucide-react';

interface StudyPageProps {
  videoId: number;
  onNavigate: (page: string) => void;
}

export const StudyPage: React.FC<StudyPageProps> = ({ videoId, onNavigate }) => {
  const [data, setData] = useState<{
    video: Video;
    study_material: StudyMaterial;
    quiz: Quiz;
    flashcards: FlashcardDeck;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'mynotes' | 'quicknotes' | 'summary' | 'concepts' | 'flashcards' | 'quiz' | 'map' | 'chat'>('notes');
  const [seekTime, setSeekTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [isChangingMode, setIsChangingMode] = useState(false);

  // User Custom Note State
  const [myNote, setMyNote] = useState<UserNote | null>(null);
  const [myNoteTitle, setMyNoteTitle] = useState('My Study Notes');
  const [myNoteContent, setMyNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [notesPreviewMode, setNotesPreviewMode] = useState(false);

  // Quick Notes State
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteTimeStr, setQuickNoteTimeStr] = useState('00:00');
  const [quickNoteTags, setQuickNoteTags] = useState('');
  const [editingQuickNoteId, setEditingQuickNoteId] = useState<number | null>(null);
  const [editingQuickNoteText, setEditingQuickNoteText] = useState('');

  const { toast } = useToast();

  const formatSeconds = (sec: number): string => {
    const totalSec = Math.floor(sec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await videoApi.getLibraryItem(videoId);
      setData(res);
    } catch (e) {
      console.error(e);
      toast('Failed to load study material', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const note = await notesApi.getUserNote(videoId);
      setMyNote(note);
      setMyNoteTitle(note.title || 'My Study Notes');
      setMyNoteContent(note.content || '');
      setNoteSaveStatus('saved');
    } catch (e) {
      console.error('Error fetching user note:', e);
    }
  };

  const loadQuickNotes = async () => {
    try {
      const qnList = await notesApi.getQuickNotes(videoId);
      setQuickNotes(qnList);
    } catch (e) {
      console.error('Error fetching quick notes:', e);
    }
  };

  useEffect(() => {
    if (videoId) {
      loadData();
      loadNotes();
      loadQuickNotes();
    }
  }, [videoId]);

  const handleSeek = (seconds: number) => {
    setSeekTime(seconds);
    const formatted = formatSeconds(seconds);
    setQuickNoteTimeStr(formatted);
    toast(`Seeking video to ${formatted}`, 'info');
  };

  const handleModeChange = async (newMode: string) => {
    if (!data) return;
    setIsChangingMode(true);
    try {
      const res = await studyApi.regenerateMode(data.video.id, newMode);
      setData((prev) => prev ? { ...prev, study_material: res.study_material } : prev);
      toast(`Study material adapted to ${newMode.toUpperCase()} mode.`, 'success');
    } catch (e) {
      toast('Failed to change study mode', 'error');
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    if (!data) return;
    setLanguageOpen(false);
    setLoading(true);
    try {
      const res = await studyApi.translate(data.video.id, lang);
      setData((prev) => prev ? { ...prev, study_material: res.study_material } : prev);
      toast(`Content translated to ${lang}`, 'success');
    } catch (e) {
      toast('Failed to translate content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTopic = async (topicId: string, currentCompleted: boolean) => {
    if (!data) return;
    try {
      const res = await studyApi.toggleTopic(data.video.id, topicId, !currentCompleted);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          video: { ...prev.video, progress_percentage: res.progress_percentage },
          study_material: { ...prev.study_material, topics: res.topics }
        };
      });
      toast(!currentCompleted ? 'Topic marked complete! Progress updated.' : 'Topic marked incomplete.', 'info');
    } catch (e) {
      toast('Could not update topic progress', 'error');
    }
  };

  const handleCopyNotes = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.study_material.notes_markdown);
    toast('Notes copied to clipboard!', 'success');
  };

  const handleBookmarkConcept = async (concept: any) => {
    if (!data) return;
    try {
      await studyApi.addBookmark({
        video_id: data.video.id,
        item_type: 'concept',
        item_id: concept.name,
        title: concept.name,
        content_snippet: concept.definition
      });
      toast(`Concept "${concept.name}" bookmarked!`, 'success');
    } catch (e) {
      toast('Could not bookmark concept', 'error');
    }
  };

  // User Custom Note Handlers
  const handleSaveUserNote = async () => {
    setSavingNote(true);
    setNoteSaveStatus('saving');
    try {
      const saved = await notesApi.saveUserNote(videoId, {
        title: myNoteTitle,
        content: myNoteContent
      });
      setMyNote(saved);
      setNoteSaveStatus('saved');
      toast('Your personal notes have been saved!', 'success');
    } catch (e) {
      setNoteSaveStatus('unsaved');
      toast('Failed to save your notes.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // Quick Notes Handlers
  const handleCreateQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) {
      toast('Please enter note text', 'error');
      return;
    }

    let sec = 0;
    const parts = quickNoteTimeStr.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      sec = parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      sec = parts[0];
    }

    try {
      const created = await notesApi.createQuickNote(videoId, {
        timestamp_seconds: sec,
        time_str: quickNoteTimeStr,
        note_text: quickNoteText.trim(),
        tags: quickNoteTags.trim()
      });
      setQuickNotes((prev) => [...prev, created].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      setQuickNoteText('');
      setQuickNoteTags('');
      toast(`Quick note captured at ${quickNoteTimeStr}!`, 'success');
    } catch (e) {
      toast('Failed to create quick note', 'error');
    }
  };

  const handleDeleteQuickNote = async (noteId: number) => {
    try {
      await notesApi.deleteQuickNote(noteId);
      setQuickNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast('Quick note deleted.', 'info');
    } catch (e) {
      toast('Failed to delete quick note', 'error');
    }
  };

  const handleUpdateQuickNote = async (noteId: number) => {
    if (!editingQuickNoteText.trim()) return;
    try {
      const updated = await notesApi.updateQuickNote(noteId, {
        note_text: editingQuickNoteText.trim()
      });
      setQuickNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingQuickNoteId(null);
      toast('Quick note updated!', 'success');
    } catch (e) {
      toast('Failed to update quick note', 'error');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading your personalized study workspace...
        </p>
      </div>
    );
  }

  const { video, study_material, quiz, flashcards } = data;
  const currentMode = study_material.study_mode || 'detailed';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-lg">
              {video.title}
            </h1>
            <p className="text-xs text-slate-500">{video.channel || 'Educational Video'}</p>
          </div>
        </div>

        {/* Right Tools: Mode Switcher, Language & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Study Mode Selector */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
            {['detailed', 'quick', 'exam', 'beginner'].map((m) => (
              <button
                key={m}
                disabled={isChangingMode}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  currentMode === m
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Language Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLanguageOpen(!languageOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{study_material.language || 'English'}</span>
            </button>

            {languageOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <a
                  href={exportApi.downloadPdfUrl(video.id)}
                  download
                  onClick={() => setExportOpen(false)}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>Download PDF Guide</span>
                </a>
                <a
                  href={exportApi.downloadMarkdownUrl(video.id)}
                  download
                  onClick={() => setExportOpen(false)}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>Download Markdown (.md)</span>
                </a>
                <a
                  href={exportApi.downloadTextUrl(video.id)}
                  download
                  onClick={() => setExportOpen(false)}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Plain Text (.txt)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WORKSPACE MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Embedded Player & Topic Explorer & Quick Notes Widget */}
        <div className="lg:col-span-5 space-y-6">
          {/* Embedded YouTube Player */}
          <YouTubePlayer
            videoId={video.video_id}
            seekSeconds={seekTime}
            title={video.title}
            channel={video.channel}
          />

          {/* Quick Notes Capture Bar (Right beneath player) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Notes
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {quickNotes.length} saved
              </span>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleCreateQuickNote} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickNoteTimeStr}
                  onChange={(e) => setQuickNoteTimeStr(e.target.value)}
                  placeholder="00:00"
                  className="w-20 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  title="Timestamp (MM:SS)"
                />
                <input
                  type="text"
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Capture key observation or question..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Quick Notes Mini-List with Seek Buttons */}
            {quickNotes.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {quickNotes.map((qn) => (
                  <div
                    key={qn.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 group hover:border-indigo-400 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleSeek(qn.timestamp_seconds)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                      title="Click to jump video to this moment"
                    >
                      {qn.time_str}
                    </button>
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
                      {qn.note_text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuickNote(qn.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors shrink-0 p-1 opacity-0 group-hover:opacity-100"
                      title="Delete quick note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No quick notes yet. Type a thought and click Add to link it to the current timestamp.
              </p>
            )}
          </div>

          {/* Search Across Material */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, definitions & notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Topic Explorer Outline */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Topic Explorer</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {Math.round(video.progress_percentage || 0)}% Complete
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {study_material.topics?.map((top) => (
                <div
                  key={top.id}
                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    top.completed
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-400'
                  }`}
                >
                  <button
                    onClick={() => handleToggleTopic(top.id, top.completed)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                  >
                    {top.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold leading-tight ${top.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {top.title}
                    </h4>
                    {top.subtopics && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {top.subtopics.map((s, idx) => (
                          <span key={idx} className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamp Keypoints */}
          {study_material.timestamps && study_material.timestamps.length > 0 && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Video Timestamps</span>
              </h3>
              <div className="space-y-1.5">
                {study_material.timestamps.map((ts, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSeek(ts.seconds)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {ts.time_str}
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-500">
                        {ts.label}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Study Tabs (AI Notes, My Notes, Quick Notes, Summary, Concepts, Flashcards, Quiz, Map, Chat) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-sm">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              AI Notes
            </button>

            <button
              onClick={() => setActiveTab('mynotes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'mynotes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              My Notes
            </button>

            <button
              onClick={() => setActiveTab('quicknotes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'quicknotes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              Quick Notes ({quickNotes.length})
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Summary
            </button>

            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'concepts'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Concepts
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'flashcards'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Cards
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'quiz'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Quiz
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'map'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Map
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask AI
            </button>
          </div>

          {/* TAB 1: AI STRUCTURED NOTES */}
          {activeTab === 'notes' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Mode: {currentMode}
                  </span>
                  <span className="text-xs text-slate-400">| Language: {study_material.language}</span>
                </div>
                <button
                  onClick={handleCopyNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Notes</span>
                </button>
              </div>

              {/* Formatted Markdown Content */}
              <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm space-y-4">
                {study_material.notes_markdown.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-2" />;

                  const matchesSearch = searchQuery && trimmed.toLowerCase().includes(searchQuery.toLowerCase());
                  const highlightClass = matchesSearch ? 'bg-amber-200/50 dark:bg-amber-900/40 p-1 rounded' : '';

                  if (trimmed.startsWith('# ')) {
                    return <h1 key={idx} className={`text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-4 ${highlightClass}`}>{trimmed.replace('# ', '')}</h1>;
                  }
                  if (trimmed.startsWith('## ')) {
                    return <h2 key={idx} className={`text-lg font-bold text-slate-900 dark:text-white mt-4 border-b border-slate-100 dark:border-slate-800 pb-1 ${highlightClass}`}>{trimmed.replace('## ', '')}</h2>;
                  }
                  if (trimmed.startsWith('### ')) {
                    return <h3 key={idx} className={`text-base font-bold text-slate-800 dark:text-slate-200 mt-3 ${highlightClass}`}>{trimmed.replace('### ', '')}</h3>;
                  }
                  if (trimmed.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className={`border-l-4 border-indigo-500 pl-4 py-2 my-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-xl italic text-slate-700 dark:text-slate-300 text-xs sm:text-sm ${highlightClass}`}>
                        {trimmed.replace('> ', '')}
                      </blockquote>
                    );
                  }
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                      <li key={idx} className={`ml-4 list-disc text-sm text-slate-700 dark:text-slate-300 ${highlightClass}`}>
                        {trimmed.substring(2)}
                      </li>
                    );
                  }
                  return <p key={idx} className={`text-sm text-slate-700 dark:text-slate-300 ${highlightClass}`}>{trimmed}</p>;
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MY NOTES (USER AUTHORED CUSTOM NOTES) */}
          {activeTab === 'mynotes' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              {/* Note Header & Save Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={myNoteTitle}
                    onChange={(e) => {
                      setMyNoteTitle(e.target.value);
                      setNoteSaveStatus('unsaved');
                    }}
                    placeholder="Note Title (e.g. My Study Notes)"
                    className="w-full text-lg font-bold bg-transparent border-0 text-slate-900 dark:text-white focus:outline-none focus:ring-0 placeholder-slate-400"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>
                      {noteSaveStatus === 'saving' && 'Saving changes...'}
                      {noteSaveStatus === 'saved' && '✓ All changes saved'}
                      {noteSaveStatus === 'unsaved' && '● Unsaved changes'}
                    </span>
                    <span>•</span>
                    <span>{myNoteContent.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotesPreviewMode(!notesPreviewMode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{notesPreviewMode ? 'Edit' : 'Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveUserNote}
                    disabled={savingNote}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    {savingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Note</span>
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              {!notesPreviewMode && (
                <div className="flex items-center gap-2 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMyNoteContent((prev) => prev + '\n## Key Concept\n');
                      setNoteSaveStatus('unsaved');
                    }}
                    className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    + Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMyNoteContent((prev) => prev + '\n- Bullet point\n');
                      setNoteSaveStatus('unsaved');
                    }}
                    className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMyNoteContent((prev) => prev + `\n> [${quickNoteTimeStr}] Important takeaway\n`);
                      setNoteSaveStatus('unsaved');
                    }}
                    className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    " Quote with Timestamp
                  </button>
                </div>
              )}

              {/* Editor / Preview Area */}
              {notesPreviewMode ? (
                <div className="min-h-[350px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 prose dark:prose-invert max-w-none text-sm">
                  {myNoteContent.trim() ? (
                    myNoteContent.split('\n').map((line, idx) => (
                      <p key={idx} className="mb-2">{line}</p>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No notes written yet. Switch to Edit mode to write your personal study notes.</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={myNoteContent}
                  onChange={(e) => {
                    setMyNoteContent(e.target.value);
                    setNoteSaveStatus('unsaved');
                  }}
                  placeholder="Write your custom notes, formulas, questions, and lecture reflections here... (Markdown supported)"
                  className="w-full min-h-[350px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
                />
              )}
            </div>
          )}

          {/* TAB 3: QUICK NOTES (TIMESTAMPED) */}
          {activeTab === 'quicknotes' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <span>Timestamped Quick Notes</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any timestamp to seek the video directly to that key moment.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {quickNotes.length} notes recorded
                </span>
              </div>

              {/* Add Quick Note Form */}
              <form onSubmit={handleCreateQuickNote} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-28 shrink-0">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Timestamp
                    </label>
                    <input
                      type="text"
                      value={quickNoteTimeStr}
                      onChange={(e) => setQuickNoteTimeStr(e.target.value)}
                      placeholder="00:00"
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Note Observation
                    </label>
                    <input
                      type="text"
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="What happened at this exact timestamp?"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="w-full sm:w-32 shrink-0">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Tag (optional)
                    </label>
                    <input
                      type="text"
                      value={quickNoteTags}
                      onChange={(e) => setQuickNoteTags(e.target.value)}
                      placeholder="e.g. Formula"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 shrink-0"
                    >
                      Save Quick Note
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick Notes List */}
              <div className="space-y-3">
                {quickNotes.length > 0 ? (
                  quickNotes.map((qn) => (
                    <div
                      key={qn.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-4 hover:border-indigo-400 transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => handleSeek(qn.timestamp_seconds)}
                        className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                        title="Seek video to this timestamp"
                      >
                        {qn.time_str}
                      </button>

                      <div className="flex-1 min-w-0">
                        {editingQuickNoteId === qn.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingQuickNoteText}
                              onChange={(e) => setEditingQuickNoteText(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuickNote(qn.id)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingQuickNoteId(null)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                            {qn.note_text}
                          </p>
                        )}
                        {qn.tags && (
                          <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            #{qn.tags}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuickNoteId(qn.id);
                            setEditingQuickNoteText(qn.note_text);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickNote(qn.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No timestamped notes created yet. Capture your first note above!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SUMMARIES */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* One-Line TL;DR */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/60 shadow-lg space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  One-Line TL;DR
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {study_material.summary?.one_line}
                </p>
              </div>

              {/* Short Summary */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Core Overview</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {study_material.summary?.short}
                </p>
              </div>

              {/* Key Takeaways */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Key Takeaways</h3>
                <div className="space-y-2.5">
                  {study_material.summary?.key_takeaways?.map((takeaway, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KEY CONCEPTS & DEFINITIONS */}
          {activeTab === 'concepts' && (
            <div className="space-y-4">
              {study_material.key_concepts?.map((c, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {c.category || 'Core'}
                      </span>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {c.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBookmarkConcept(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Bookmark concept"
                      >
                        <BookmarkIcon className="w-4 h-4" />
                      </button>
                      {c.timestamp && (
                        <button
                          onClick={() => {
                            const [m, s] = c.timestamp!.split(':').map(Number);
                            handleSeek((m || 0) * 60 + (s || 0));
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{c.timestamp}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <b>Definition:</b> {c.definition}
                    </p>
                    {c.example && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                        💡 <b>Practical Example:</b> {c.example}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: FLASHCARDS */}
          {activeTab === 'flashcards' && (
            <FlashcardViewer
              deckId={flashcards.id}
              cards={flashcards.cards}
            />
          )}

          {/* TAB 7: QUIZ */}
          {activeTab === 'quiz' && (
            <QuizModal
              quiz={quiz}
              onAttemptComplete={() => loadData()}
            />
          )}

          {/* TAB 8: CONCEPT MAP */}
          {activeTab === 'map' && (
            <ConceptMap
              data={study_material.concept_map}
            />
          )}

          {/* TAB 9: ASK AI CHAT */}
          {activeTab === 'chat' && (
            <VideoChat
              videoId={video.id}
              videoTitle={video.title}
              onSeekToTimestamp={handleSeek}
            />
          )}
        </div>
      </div>
    </div>
  );
};
