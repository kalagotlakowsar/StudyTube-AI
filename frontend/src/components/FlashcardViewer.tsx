import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FlashcardItem } from '../types';
import {
  RotateCw, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Bookmark as BookmarkIcon, Sparkles, Shuffle
} from 'lucide-react';
import { flashcardsApi } from '../api/client';
import { useToast } from './Toast';

interface FlashcardViewerProps {
  deckId: number;
  cards: FlashcardItem[];
  onReview?: (cardId: string, state: 'known' | 'need_revision') => void;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ deckId, cards: initialCards, onReview }) => {
  const [cards, setCards] = useState<FlashcardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  if (!cards || cards.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
        No flashcards generated yet for this session.
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleRate = async (state: 'known' | 'need_revision') => {
    try {
      await flashcardsApi.reviewCard(deckId, currentCard.id, state);
      // Update local card state
      setCards((prev) =>
        prev.map((c, i) => (i === currentIndex ? { ...c, state } : c))
      );
      if (onReview) onReview(currentCard.id, state);

      toast(
        state === 'known' ? 'Marked as Mastered! Spaced interval extended.' : 'Marked for Revision. Added to study queue.',
        state === 'known' ? 'success' : 'info'
      );

      // Auto-advance after rating
      setTimeout(() => {
        handleNext();
      }, 350);
    } catch (e) {
      console.error(e);
      toast('Could not save card progress', 'error');
    }
  };

  const toggleBookmark = () => {
    const next = !bookmarked[currentCard.id];
    setBookmarked((prev) => ({ ...prev, [currentCard.id]: next }));
    toast(next ? 'Flashcard bookmarked' : 'Bookmark removed', 'info');
  };

  const knownCount = cards.filter((c) => c.state === 'known').length;
  const needRevisionCount = cards.filter((c) => c.state === 'need_revision').length;
  const progressPct = Math.round((knownCount / cards.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Controls & Status Bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {currentCard.concept}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleBookmark}
            className={`p-1.5 rounded-lg transition-colors ${
              bookmarked[currentCard.id]
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title="Bookmark card"
          >
            <BookmarkIcon className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Mastery: {knownCount} known, {needRevisionCount} needs review</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(knownCount / cards.length) * 100}%` }}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(needRevisionCount / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 3D Flip Card */}
      <div
        onClick={handleFlip}
        className="perspective-1000 w-full h-80 cursor-pointer select-none"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="transform-style-3d relative w-full h-full"
        >
          {/* FRONT */}
          <div className="backface-hidden absolute inset-0 w-full h-full rounded-3xl p-8 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-2 border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Front • Question
              </span>
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" />
                Click to reveal answer
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentCard.front}
              </h3>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="capitalize text-slate-500">Difficulty: {currentCard.difficulty}</span>
              <span className="text-indigo-500 font-medium">Click to flip ↷</span>
            </div>
          </div>

          {/* BACK */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full rounded-3xl p-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-500/50 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-indigo-300">
              <span className="font-semibold uppercase tracking-wider text-emerald-400">
                Back • Explanation
              </span>
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" />
                Click to flip back
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="text-center text-xs text-indigo-300/80">
              Rate your confidence below to schedule spaced repetition
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation & Mastery Rating Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Previous Card"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Next Card"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Confidence Rating Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleRate('need_revision')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            Need Revision
          </button>

          <button
            onClick={() => handleRate('known')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
          >
            <CheckCircle2 className="w-4 h-4" />
            Know It!
          </button>
        </div>
      </div>
    </div>
  );
};
