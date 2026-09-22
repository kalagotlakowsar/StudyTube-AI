import React from 'react';
import { Sparkles, Youtube, Heart, Github, BookOpen, ShieldCheck, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#090d16]/50 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">StudyTube AI</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Transform any educational YouTube video into structured notes, interactive flashcards, AI quizzes, and concept maps. Learn 5x faster with multimodal AI.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Powered by Google Gemini 3.8 Flash & RAG
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Study Modes</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>Comprehensive Detailed Notes</li>
              <li>Quick Revision Cheat Sheets</li>
              <li>Exam Preparation Blueprint</li>
              <li>Beginner Friendly (ELI5)</li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Platform Features</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>Interactive 3D Flashcards</li>
              <li>Practice Quizzes & Analytics</li>
              <li>RAG Video Chat & Timestamps</li>
              <li>Multi-Language Translation</li>
              <li>PDF & Markdown Export</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} StudyTube AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Built for students, lifelong learners, and researchers.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
