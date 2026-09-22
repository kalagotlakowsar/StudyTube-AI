import React from 'react';
import { WeakAreaItem } from '../types';
import { AlertTriangle, CheckCircle2, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

interface WeakAreasCardProps {
  weakAreas: WeakAreaItem[];
  onStartRevision?: (topic: string, videoId: number) => void;
}

export const WeakAreasCard: React.FC<WeakAreasCardProps> = ({ weakAreas, onStartRevision }) => {
  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Personalized Weak Areas
            </h4>
            <p className="text-xs text-slate-500">Detected from recent quiz mistakes</p>
          </div>
        </div>

        {weakAreas && weakAreas.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            {weakAreas.length} topics need attention
          </span>
        )}
      </div>

      {(!weakAreas || weakAreas.length === 0) ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No weak areas detected!
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Take more quizzes or review flashcards to let StudyTube AI diagnose concepts that need reinforcement.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {weakAreas.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.topic}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 shrink-0">
                    {item.mistake_count} mistake{item.mistake_count > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  From: {item.video_title}
                </p>
              </div>

              <button
                onClick={() => onStartRevision && onStartRevision(item.topic, item.video_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shrink-0 shadow-sm"
              >
                <span>Revise</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
