import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { videoApi, exportApi } from '../api/client';
import { useToast } from '../components/Toast';
import {
  Library, Search, Play, Trash2, Download,
  BookOpen, Clock, Award, ExternalLink, Sparkles
} from 'lucide-react';

interface LibraryPageProps {
  onOpenVideo: (videoId: number) => void;
  onNavigate: (page: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onOpenVideo, onNavigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const list = await videoApi.getLibrary();
      setVideos(list);
    } catch (e) {
      console.error(e);
      toast('Failed to load library items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this video and all its generated notes and quizzes?')) {
      return;
    }
    try {
      await videoApi.deleteLibraryItem(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast('Video removed from your library', 'info');
    } catch (err) {
      toast('Failed to delete video', 'error');
    }
  };

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.channel && v.channel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Library className="w-8 h-8 text-indigo-600" />
            <span>Personal Study Library</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access and review your saved video lectures, notes, and quiz histories anytime.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved videos..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400">Loading your saved study sessions...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {search ? 'No matching videos found' : 'Your library is empty'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? 'Try a different search keyword.'
              : 'Paste a YouTube video URL on your dashboard to generate your first study package!'}
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => onOpenVideo(vid.id)}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl hover:shadow-2xl hover:border-indigo-500 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
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

                {/* Details */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{vid.channel || 'YouTube Video'}</span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium text-[10px]">
                      {vid.study_mode || 'Detailed'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                    {vid.title}
                  </h3>

                  {/* Progress & Quiz Score */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Progress: <b>{Math.round(vid.progress_percentage || 0)}%</b>
                    </span>
                    {vid.quiz_score !== null && vid.quiz_score !== undefined && (
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <Award className="w-3.5 h-3.5" />
                        Quiz: {Math.round(vid.quiz_score)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <a
                  href={exportApi.downloadPdfUrl(vid.id)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
                  title="Download PDF Study Guide"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Guide</span>
                </a>

                <button
                  onClick={(e) => handleDelete(e, vid.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                  title="Delete from library"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
