import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardStats, Video } from '../types';
import { dashboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { WeakAreasCard } from '../components/WeakAreasCard';
import {
  Sparkles, Youtube, BookOpen, Layers, Award,
  Flame, Clock, ArrowRight, CheckCircle2, RotateCw,
  TrendingUp, Calendar, AlertCircle, Play, Edit3
} from 'lucide-react';


interface DashboardPageProps {
  onStartStudy: (url: string) => void;
  onOpenVideo: (videoId: number) => void;
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartStudy,
  onOpenVideo,
  onNavigate,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputUrl, setInputUrl] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
      toast('Could not refresh dashboard statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleProcessUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      toast('Please enter a valid YouTube video URL', 'error');
      return;
    }
    onStartStudy(inputUrl);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner & Quick URL Form */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Blob */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Welcome back, {user?.name || 'Scholar'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready for your next learning session?
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Paste any educational YouTube lecture below. StudyTube AI will extract the transcript, generate 4-mode structured notes, interactive flashcards, and quizzes.
          </p>

          {/* Quick Input Bar */}
          <form
            onSubmit={handleProcessUrl}
            className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 max-w-2xl"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 dark:bg-black/40 border border-white/20 w-full sm:flex-1 backdrop-blur-md focus-within:border-indigo-400 transition-colors">
              <Youtube className="w-5 h-5 text-red-500 shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full bg-transparent border-0 text-white placeholder-slate-400 text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-xl transition-all hover:scale-102 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Generate Notes</span>
            </button>
          </form>
        </div>
      </div>

      {/* 5 CORE ANALYTICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Videos Processed */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Videos Studied</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Youtube className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats?.videos_processed || 0}
          </div>
          <p className="text-xs text-slate-400">Lectures analyzed & structured</p>
        </div>

        {/* Topics Learned */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Topics Mastered</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats?.topics_learned || 0}
          </div>
          <p className="text-xs text-slate-400">Completed in study outline</p>
        </div>

        {/* Study Notes */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Notes Created</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {(stats?.notes_count || 0) + (stats?.quick_notes_count || 0)}
          </div>
          <p className="text-xs text-slate-400">
            {stats?.notes_count || 0} personal, {stats?.quick_notes_count || 0} quick
          </p>
        </div>

        {/* Quiz Avg Score */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg. Quiz Score</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats ? `${Math.round(stats.average_quiz_score)}%` : '0%'}
          </div>
          <p className="text-xs text-slate-400">
            Across {stats?.quizzes_completed || 0} quiz attempts
          </p>
        </div>

        {/* Learning Streak */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{stats?.current_streak_days || 1}</span>
            <span className="text-sm font-semibold text-amber-500">days</span>
          </div>
          <p className="text-xs text-slate-400">Keep studying daily to maintain!</p>
        </div>
      </div>


      {/* MIDDLE SECTION: WEEKLY ACTIVITY & WEAK AREAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Weekly Study Activity</h3>
            </div>
            <span className="text-xs text-slate-400">Past 7 days</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {stats?.weekly_activity?.map((w, idx) => {
              const heightPct = Math.min(Math.max((w.count / 6) * 100, 15), 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {w.count}
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-hidden h-28 flex items-end">
                    <motion.div
                      className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-xl"
                      initial={{ height: '0%' }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {w.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personalized Weak Areas Card */}
        <div className="lg:col-span-1">
          <WeakAreasCard
            weakAreas={stats?.weak_areas || []}
            onStartRevision={(topic, videoId) => onOpenVideo(videoId)}
          />
        </div>
      </div>

      {/* REVISION QUEUE (SPACED REPETITION DUE) */}
      {stats?.spaced_revision_due && stats.spaced_revision_due.length > 0 && (
        <div className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Spaced Revision Queue (Due Today)
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {stats.spaced_revision_due.length} cards scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.spaced_revision_due.map((rev, idx) => (
              <div
                key={idx}
                onClick={() => onOpenVideo(rev.video_id)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer shadow-sm transition-all space-y-2 group"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate block">
                  {rev.video_title}
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {rev.front}
                </p>
                <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 pt-2 font-medium">
                  <span>Review Card</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT VIDEOS GALLERY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Recent Study Sessions
          </h2>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View All in Library →
          </button>
        </div>

        {(!stats?.recent_videos || stats.recent_videos.length === 0) ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              No videos processed yet!
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Paste an educational YouTube URL above to generate notes, flashcards, and quizzes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.recent_videos.map((vid) => (
              <div
                key={vid.id}
                onClick={() => onOpenVideo(vid.id)}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl hover:border-indigo-500 cursor-pointer transition-all duration-200 flex flex-col group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={vid.thumbnail_url || `https://img.youtube.com/vi/${vid.video_id}/hqdefault.jpg`}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                  {vid.duration && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/80 text-white">
                      {vid.duration}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{vid.channel || 'Educational Channel'}</span>
                      <span className="capitalize px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium text-[10px]">
                        {vid.study_mode || 'Detailed'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                      {vid.title}
                    </h3>
                  </div>

                  {/* Progress & Quiz Score */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progress</span>
                      <span>{Math.round(vid.progress_percentage || 0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${vid.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
