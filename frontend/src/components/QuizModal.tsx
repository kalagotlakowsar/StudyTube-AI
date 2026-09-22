import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quiz, QuizAttempt } from '../types';
import { quizApi } from '../api/client';
import confetti from 'canvas-confetti';
import {
  CheckCircle2, XCircle, Award, RotateCcw,
  ArrowRight, HelpCircle, Check, BookOpen
} from 'lucide-react';
import { useToast } from './Toast';

interface QuizModalProps {
  quiz: Quiz;
  onAttemptComplete?: (attempt: QuizAttempt) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quiz, onAttemptComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttempt | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const { toast } = useToast();

  const questions = quiz.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelectOption = (index: number) => {
    if (attemptResult) return; // quiz completed
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: index,
    }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setIsSubmitting(true);
    const answersPayload = questions.map((q) => ({
      question_id: q.id,
      selected_index: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
    }));

    try {
      const result = await quizApi.submitAttempt(quiz.id, answersPayload);
      setAttemptResult(result);
      if (onAttemptComplete) onAttemptComplete(result);

      if (result.percentage >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast(`Great job! You scored ${result.percentage}% 🎉`, 'success');
      } else {
        toast(`Quiz completed! Score: ${result.percentage}%. Review weak areas below.`, 'info');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to record quiz results', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowExplanation(false);
    setAttemptResult(null);
    setReviewMode(false);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
        No quiz questions available for this video yet.
      </div>
    );
  }

  // --- COMPLETED STATE VIEW ---
  if (attemptResult && !reviewMode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6"
      >
        <div className="inline-flex p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
          <Award className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            Quiz Complete!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {attemptResult.score} of {attemptResult.total_questions} questions correct
          </p>
        </div>

        {/* Big Percentage Gauge */}
        <div className="py-4">
          <div className="text-6xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            {Math.round(attemptResult.percentage)}%
          </div>
          <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                attemptResult.percentage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${attemptResult.percentage}%` }}
            />
          </div>
        </div>

        {/* Identified Weak Areas */}
        {attemptResult.weak_topics && attemptResult.weak_topics.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-left space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Areas to Review
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {attemptResult.weak_topics.map((wt, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-100/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200"
                >
                  {wt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setReviewMode(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Review Mistakes
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  // --- REVIEW MODE VIEW ---
  if (reviewMode && attemptResult) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Mistake & Question Review
          </h3>
          <button
            onClick={() => setReviewMode(false)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to Score
          </button>
        </div>

        <div className="space-y-4">
          {attemptResult.review.map((item, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${
                item.is_correct
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Q{idx + 1}: {item.question}
                </span>
                {item.is_correct ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                {item.options.map((opt, optIdx) => {
                  const isUserSelection = item.selected_index === optIdx;
                  const isCorrect = item.correct_index === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2 rounded-lg flex items-center justify-between ${
                        isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 font-semibold text-emerald-900 dark:text-emerald-200'
                          : isUserSelection
                          ? 'bg-rose-100 dark:bg-rose-900/40 font-semibold text-rose-900 dark:text-rose-200'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{opt}</span>
                      {isCorrect && <span className="text-[10px] uppercase font-bold text-emerald-600">Correct Answer</span>}
                      {!isCorrect && isUserSelection && <span className="text-[10px] uppercase font-bold text-rose-600">Your Choice</span>}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl">
                💡 <b>Explanation:</b> {item.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- ACTIVE QUIZ QUESTION VIEW ---
  const currentSelected = selectedAnswers[currentQ.id];
  const hasSelected = currentSelected !== undefined;
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Question Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {currentQ.topic || 'General Knowledge'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = currentSelected === idx;
            const isCorrect = currentQ.correct_answer_index === idx;

            let style = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400';

            if (hasSelected) {
              if (isSelected && isCorrect) {
                style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200';
              } else if (isSelected && !isCorrect) {
                style = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200';
              } else if (isCorrect) {
                style = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 text-emerald-800 dark:text-emerald-300';
              } else {
                style = 'opacity-40 border-transparent';
              }
            }

            return (
              <button
                key={idx}
                disabled={hasSelected}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-2xl border-2 text-left text-sm font-medium transition-all flex items-center justify-between ${style}`}
              >
                <span>{option}</span>
                {hasSelected && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                {hasSelected && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Card */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5"
            >
              <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                <HelpCircle className="w-4 h-4" />
                Explanation
              </div>
              <p className="leading-relaxed">{currentQ.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Question / Finish Button */}
        {hasSelected && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
            >
              <span>{currentIndex === questions.length - 1 ? 'Finish & See Score' : 'Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
