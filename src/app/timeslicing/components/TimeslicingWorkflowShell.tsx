"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';

export type TimeslicingWorkflowStep = 'generate' | 'review' | 'apply';

interface TimeslicingWorkflowShellProps {
  activeStep: TimeslicingWorkflowStep;
  onStepChange: (step: TimeslicingWorkflowStep) => void;
  children: React.ReactNode;
}

const STEP_ORDER: TimeslicingWorkflowStep[] = ['generate', 'review', 'apply'];

const STEP_LABELS: Record<TimeslicingWorkflowStep, string> = {
  generate: 'Generate',
  review: 'Review',
  apply: 'Apply',
};

export function TimeslicingWorkflowShell({ activeStep, onStepChange, children }: TimeslicingWorkflowShellProps) {
  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const previousStep = STEP_ORDER[Math.max(0, activeIndex - 1)] ?? activeStep;
  const nextStep = STEP_ORDER[Math.min(STEP_ORDER.length - 1, activeIndex + 1)] ?? activeStep;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Workflow shell</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Generate → Review → Apply</h1>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onStepChange(previousStep)}
                disabled={activeIndex === 0}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => onStepChange(nextStep)}
                disabled={activeIndex === STEP_ORDER.length - 1}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-100 px-3 py-1.5 font-medium text-slate-950 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          <nav aria-label="Timeslicing steps" className="flex flex-wrap gap-2">
            {STEP_ORDER.map((step, index) => {
              const isActive = step === activeStep;
              const isComplete = index < activeIndex;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => onStepChange(step)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'border-violet-400/70 bg-violet-500/15 text-violet-100'
                      : isComplete
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.24em] text-current/70">{index + 1}</span>
                  {STEP_LABELS[step]}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
