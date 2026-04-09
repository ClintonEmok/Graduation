"use client";

import { useMemo, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Layers3, SquareStack } from 'lucide-react';

export type WorkflowSkeletonStep = 'explore' | 'build' | 'review';

const STEP_ORDER: WorkflowSkeletonStep[] = ['explore', 'build', 'review'];

const STEP_LABELS: Record<WorkflowSkeletonStep, string> = {
  explore: 'Explore',
  build: 'Build',
  review: 'Review',
};

const STEP_SUMMARIES: Record<WorkflowSkeletonStep, string> = {
  explore: 'Orient to the data field and the shared viewport before editing slices.',
  build: 'Keep the slice-building and review loop continuous while you refine the draft.',
  review: 'Confirm the slice set, scan warnings, and hand the result off to the dashboard.',
};

const STEP_DETAIL_LINES: Record<WorkflowSkeletonStep, string[]> = {
  explore: ['Read the overview surface', 'Keep the workflow lightweight', 'Start with context, not edits'],
  build: ['Adjust slices in place', 'Treat review as part of the builder', 'Avoid route-level handoffs'],
  review: ['Check the final slice list', 'Keep warnings visible', 'Proceed to dashboard handoff'],
};

const STEP_ICONS: Record<WorkflowSkeletonStep, typeof Layers3> = {
  explore: Layers3,
  build: SquareStack,
  review: BadgeCheck,
};

export function WorkflowSkeleton() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState<WorkflowSkeletonStep>('explore');

  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const previousStep = STEP_ORDER[Math.max(0, activeIndex - 1)] ?? activeStep;
  const nextStep = STEP_ORDER[Math.min(STEP_ORDER.length - 1, activeIndex + 1)] ?? activeStep;

  const StepIcon = useMemo(() => STEP_ICONS[activeStep], [activeStep]);

  return (
    <aside className="fixed left-4 top-4 z-30 h-[calc(100vh-2rem)] text-slate-100">
      <div
        className={`h-full overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/95 shadow-2xl backdrop-blur transition-[width] duration-200 ease-out ${
          isOpen ? 'w-[21rem]' : 'w-12'
        }`}
      >
        {isOpen ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Workflow skeleton</p>
                <h2 className="mt-1 text-sm font-semibold tracking-tight">Explore → Build → Review</h2>
                <p className="mt-1 text-[11px] text-slate-400">Left-anchored helper flow under the demo shell.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Collapse workflow drawer"
                className="inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:text-slate-100"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 grid-cols-[5.75rem_minmax(0,1fr)]">
              <nav aria-label="Workflow steps" className="border-r border-slate-800/80 bg-slate-950/70 px-2 py-3">
                <div className="flex h-full flex-col gap-2">
                  {STEP_ORDER.map((step, index) => {
                    const isActive = step === activeStep;
                    const isComplete = index < activeIndex;
                    const Icon = STEP_ICONS[step];

                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setActiveStep(step)}
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex flex-col items-start gap-2 rounded-xl border px-2.5 py-3 text-left text-[11px] transition-colors ${
                          isActive
                            ? 'border-sky-400/60 bg-sky-500/10 text-sky-50'
                            : isComplete
                              ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-100'
                              : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="inline-flex size-7 items-center justify-center rounded-lg border border-current/20 bg-current/10">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="font-medium uppercase tracking-[0.24em]">{String(index + 1).padStart(2, '0')}</span>
                        <span className="text-xs font-medium leading-tight">{STEP_LABELS[step]}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="flex min-h-0 flex-col">
                <div className="border-b border-slate-800/80 px-4 py-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.28em] text-slate-300">
                    <StepIcon className="size-3.5 text-sky-300" />
                    {STEP_LABELS[activeStep]}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold tracking-tight">{STEP_SUMMARIES[activeStep]}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-400">{STEP_DETAIL_LINES[activeStep].join(' • ')}</p>
                </div>

                <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Previous</p>
                    <p className="mt-1 text-sm text-slate-200">{STEP_LABELS[previousStep]}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Current</p>
                    <p className="mt-1 text-sm text-slate-100">{STEP_LABELS[activeStep]}</p>
                    <p className="mt-2 text-[12px] leading-5 text-slate-400">
                      {activeStep === 'explore' && 'Use this stage to understand the data field and decide where to begin.'}
                      {activeStep === 'build' && 'Refine the slices in place without breaking the flow into a separate route.'}
                      {activeStep === 'review' && 'Confirm the final state before the demo hands off to the dashboard.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Next</p>
                    <p className="mt-1 text-sm text-slate-200">{STEP_LABELS[nextStep]}</p>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(previousStep)}
                      disabled={activeIndex === 0}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="size-3.5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep(nextStep)}
                      disabled={activeIndex === STEP_ORDER.length - 1}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-950 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-between py-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Expand workflow drawer"
              className="inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:text-slate-100"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              {STEP_ORDER.map((step) => {
                const isActive = step === activeStep;
                const Icon = STEP_ICONS[step];
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setActiveStep(step);
                      setIsOpen(true);
                    }}
                    aria-label={`${STEP_LABELS[step]} step`}
                    aria-current={isActive ? 'step' : undefined}
                    className={`inline-flex size-8 items-center justify-center rounded-full border transition-colors ${
                      isActive
                        ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Expand workflow drawer"
              className="inline-flex size-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:text-slate-100"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
