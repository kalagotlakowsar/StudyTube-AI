import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, Brain, FileText, HelpCircle, Layers } from 'lucide-react';

interface ProcessingPipelineProps {
  onComplete?: () => void;
}

const steps = [
  { id: 1, label: 'Validating URL & Video Metadata', icon: Sparkles },
  { id: 2, label: 'Fetching & Cleaning Transcript', icon: FileText },
  { id: 3, label: 'Analyzing Core Principles & Topics', icon: Brain },
  { id: 4, label: 'Generating Structured Study Notes', icon: Layers },
  { id: 5, label: 'Creating Quizzes & Flashcards', icon: HelpCircle },
];

export const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onComplete) onComplete();
          return prev;
        }
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [onComplete]);

  const progressPct = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">AI Processing in Progress</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Transforming video transcript into your personalized interactive study package...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Synthesizing lecture content</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
            initial={{ width: '10%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Pipeline Steps List */}
      <div className="space-y-3 pt-2">
        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/60 shadow-sm'
                  : isDone
                  ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 text-slate-500'
                  : 'border-transparent text-slate-400 opacity-50'
              }`}
            >
              <div className="shrink-0">
                {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {isCurrent && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                {isPending && <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">{step.id}</div>}
              </div>

              <span className={`text-sm font-medium flex-1 ${isCurrent ? 'text-indigo-900 dark:text-indigo-200 font-semibold' : ''}`}>
                {step.label}
              </span>

              <Icon className={`w-4 h-4 ${isCurrent ? 'text-indigo-500' : 'text-slate-400'}`} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
