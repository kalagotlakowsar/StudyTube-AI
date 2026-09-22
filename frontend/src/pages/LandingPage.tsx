import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Youtube, ArrowRight, Brain, BookOpen,
  HelpCircle, Layers, CheckCircle2, MessageSquare,
  Zap, Star, Play, Compass, Download, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

interface LandingPageProps {
  onStartStudy: (url: string) => void;
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartStudy, onNavigate }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'quiz' | 'chat'>('notes');
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      toast('Please enter a valid YouTube video URL', 'error');
      return;
    }
    if (!isAuthenticated) {
      // Save pending URL in sessionStorage and prompt login/register
      sessionStorage.setItem('pending_study_url', youtubeUrl);
      onNavigate('login');
      toast('Please sign in or create an account to process this video', 'info');
      return;
    }
    onStartStudy(youtubeUrl);
  };

  const sampleDemoVideo = (url: string) => {
    setYoutubeUrl(url);
    if (isAuthenticated) {
      onStartStudy(url);
    } else {
      sessionStorage.setItem('pending_study_url', url);
      onNavigate('login');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative space-y-6 max-w-4xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
            <span>Next-Gen YouTube Learning Platform with Gemini 3.8 Flash</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Turn Any YouTube Video into{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent">
              Interactive Study Material
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop passively re-watching lectures. Generate structured notes in 4 study modes, interactive 3D flashcards, practice quizzes, concept maps, and grounded video AI chat.
          </p>

          {/* URL INPUT HERO CARD */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form
              onSubmit={handleGenerate}
              className="p-2 sm:p-2.5 rounded-3xl bg-white dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center gap-2 backdrop-blur-xl focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-all"
            >
              <div className="flex items-center gap-3 px-3 w-full sm:flex-1">
                <Youtube className="w-6 h-6 text-red-500 shrink-0" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube video link (e.g., https://youtube.com/watch?v=...)"
                  className="w-full py-2.5 text-sm sm:text-base bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all hover:scale-102 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Study Material</span>
              </button>
            </form>

            {/* Quick Demo Links */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-500">
              <span>Or try sample:</span>
              <button
                type="button"
                onClick={() => sampleDemoVideo('https://www.youtube.com/watch?v=kqtD5dpn9C8')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Python in 100 Seconds
              </button>
              <button
                type="button"
                onClick={() => sampleDemoVideo('https://www.youtube.com/watch?v=aircAruvnKk')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Neural Networks (3Blue1Brown)
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* INTERACTIVE FEATURE PREVIEW SHOWCASE */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Everything You Need for Exam & Mastery Success
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            Click tabs below to test preview components directly before processing your own video.
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1 mt-4">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Structured Notes
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'flashcards'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              3D Flashcards
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'quiz'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              AI Practice Quiz
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI (RAG)
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Preview Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    4 Study Modes Included
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Multi-Tiered Notes & Definitions
                  </h3>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Detailed
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Quick Revision
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Exam Prep
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Beginner (ELI5)
                  </span>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-sm space-y-4">
                <p className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-500 text-slate-700 dark:text-slate-300">
                  <b>Executive Summary:</b> Modern neural networks learn representations through gradient descent and backpropagation, computing partial derivatives of loss functions across parameterized layers.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">State Invariance</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Guarantees mathematical correctness through atomic, validated parameter checkpoints.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Hierarchical Pipelines</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Decomposes complex monolithic operations into verifiable, independently testable stages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Active Recall & Spaced Repetition
              </span>
              <div className="w-full max-w-md h-56 p-8 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-500/40 shadow-xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase">Flashcard 1 of 8</span>
                <p className="text-lg font-bold">What is the role of backpropagation in deep neural networks?</p>
                <span className="text-xs text-indigo-300">Flip card to view explanation & rate confidence ↷</span>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Interactive Assessment
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Which technique prevents overfitting during deep neural network training?
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between">
                  <span>Dropout Regularization</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                  Infinite iterations without validation
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                  Deleting training samples
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                  Single-precision rounding error
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-indigo-600 text-white text-sm max-w-sm ml-auto">
                Explain the gradient descent step simply for an exam.
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm max-w-md space-y-2">
                <p>
                  Imagine walking down a foggy mountain in small downhill steps. Gradient descent calculates the steepest downhill slope (negative gradient) and adjusts weights by a learning rate alpha.
                </p>
                <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  <Play className="w-3 h-3" />
                  Jump to timestamp 03:42
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* VALUE PROPOSITION GRID */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Engineered for Serious Learning
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            From automated transcript extraction to spaced revision analytics, StudyTube AI is your personal tutor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gemini 3.8 Flash AI Engine</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Synthesizes long videos into hierarchical notes, academic definitions, real-world examples, and exam blueprints.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">RAG Grounded Q&A</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Every answer is retrieved directly from video chunks with clickable timestamp badges that seek the player on click.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Multi-Format Export</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Download your complete study package as a professionally formatted PDF, clean Markdown (.md), or raw text anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
