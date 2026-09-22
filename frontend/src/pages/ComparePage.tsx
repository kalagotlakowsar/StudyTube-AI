import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VideoComparison } from '../types';
import { compareApi } from '../api/client';
import { useToast } from '../components/Toast';
import {
  GitCompare, Youtube, Sparkles, Plus, Check,
  ArrowRight, Loader2, BookOpen, Layers
} from 'lucide-react';

export const ComparePage: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [comparison, setComparison] = useState<VideoComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url1.trim() || !url2.trim()) {
      toast('Please provide two YouTube video URLs to compare', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await compareApi.compareVideos([url1, url2]);
      setComparison(result);
      toast('Videos analyzed and synthesized successfully!', 'success');
    } catch (e: any) {
      toast(e.response?.data?.detail || 'Failed to compare videos', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <GitCompare className="w-8 h-8 text-indigo-600" />
          <span>Multi-Video Comparison & Synthesis</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Compare two educational videos covering the same topic. StudyTube AI will cross-reference explanations, highlight differences, and build a unified study master-guide.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCompare} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-red-500" />
              Video #1 URL
            </label>
            <input
              type="text"
              required
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-red-500" />
              Video #2 URL
            </label>
            <input
              type="text"
              required
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all hover:scale-102 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Transcripts & Synthesizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Synthesize & Compare Videos</span>
            </>
          )}
        </button>
      </form>

      {/* Comparison Results */}
      {comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Synthesized Overview */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Comparative Synthesis
            </span>
            <h2 className="text-xl sm:text-2xl font-black">
              {comparison.video_titles[0]} <span className="text-indigo-400">vs</span> {comparison.video_titles[1]}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {comparison.summary_comparison}
            </p>
          </div>

          {/* Common Concepts & Differences Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Common Concepts */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                <span>Shared Core Tenets (Agreed by Both)</span>
              </div>
              <div className="space-y-2">
                {comparison.common_concepts.map((concept, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300">
                    • {concept}
                  </div>
                ))}
              </div>
            </div>

            {/* Differences Matrix */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <GitCompare className="w-4 h-4" />
                <span>Differences in Depth & Methodology</span>
              </div>
              <div className="space-y-3">
                {comparison.differences.map((diff, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                      Aspect: {diff.aspect}
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      <b>Video 1:</b> {diff.video_a}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <b>Video 2:</b> {diff.video_b}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unified Study Notes */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>Unified Synthesis Notes</span>
            </h3>
            <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {comparison.combined_notes}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
