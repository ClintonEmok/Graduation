"use client";

import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Layers3, SquareStack } from 'lucide-react';
import { toast } from 'sonner';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { getCrimeTypeName } from '@/lib/category-maps';
import type { TimeBin } from '@/lib/binning/types';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { recommendGranularityForSelection } from '@/components/dashboard-demo/lib/demo-burst-generation';

export type WorkflowSkeletonStep = 'orient' | 'find' | 'compare' | 'inspect' | 'explain' | 'apply';

const STEP_ORDER: WorkflowSkeletonStep[] = ['orient', 'find', 'compare', 'inspect', 'explain', 'apply'];

const STEP_LABELS: Record<WorkflowSkeletonStep, string> = {
  orient: 'Orient',
  find: 'Find',
  compare: 'Compare',
  inspect: 'Inspect',
  explain: 'Explain',
  apply: 'Apply',
};

const STEP_SUMMARIES: Record<WorkflowSkeletonStep, string> = {
  orient: 'Orient to the dataset scope, active filters, and current window before making changes.',
  find: 'Find the bursty periods and interesting windows that deserve closer inspection.',
  compare: 'Compare uniform and adaptive readings side by side without changing the dataset.',
  inspect: 'Inspect the active slice or burst window in detail before you commit anything.',
  explain: 'Explain why the current selection is highlighted and what it belongs to.',
  apply: 'Apply the confirmed result and continue the guided analysis flow.',
};

const STEP_DETAIL_LINES: Record<WorkflowSkeletonStep, string[]> = {
  orient: ['Read the overview surface', 'Keep the workflow lightweight', 'Start with context, not edits'],
  find: ['Locate bursty intervals', 'Keep the current window visible', 'Use the timeline as the primary guide'],
  compare: ['Hold the same dataset steady', 'Switch only the scale or lens', 'Check whether the pattern still reads the same'],
  inspect: ['Check the focused slice or burst', 'Keep warning states visible', 'Inspect before you commit'],
  explain: ['Surface the rationale', 'Call out the active slice relationship', 'Make the next action obvious'],
  apply: ['Commit the confirmed result', 'Keep the handoff explicit', 'Return to analysis with the updated state'],
};

const STEP_ICONS: Record<WorkflowSkeletonStep, typeof Layers3> = {
  orient: Layers3,
  find: SquareStack,
  compare: ChevronLeft,
  inspect: ChevronRight,
  explain: BadgeCheck,
  apply: ArrowRight,
};

const GRANULARITY_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

export function WorkflowSkeleton() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState<WorkflowSkeletonStep>('orient');
  const generationStatus = useDashboardDemoTimeslicingModeStore((state) => state.generationStatus);
  const generationError = useDashboardDemoTimeslicingModeStore((state) => state.generationError);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const clearPendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.clearPendingGeneratedBins);
  const setGenerationInputs = useDashboardDemoTimeslicingModeStore((state) => state.setGenerationInputs);
  const generateBurstDraftBinsFromWindows = useDashboardDemoTimeslicingModeStore((state) => state.generateBurstDraftBinsFromWindows);
  const applyGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.applyGeneratedBins);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const generationInputs = useDashboardDemoTimeslicingModeStore((state) => state.generationInputs);
  const timelineColumns = useTimelineDataStore((state) => state.columns);
  const crimeTypes = useTimelineDataStore((state) => state.crimeTypes);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const timeRange = useDashboardDemoTimeStore((state) => state.timeRange);
  const canGenerateBurstDrafts = generationStatus !== 'generating' && minTimestampSec !== null && maxTimestampSec !== null;
  const selectedWindowBounds = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return null;
    }

    const [windowStart, windowEnd] = timeRange;
    const start = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const end = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;

    return { start, end };
  }, [maxTimestampSec, minTimestampSec, timeRange]);
  const suggestedGranularity = useMemo(
    () => recommendGranularityForSelection(selectedWindowBounds),
    [selectedWindowBounds]
  );
  const suggestedGranularityLabel = GRANULARITY_OPTIONS.find((option) => option.value === suggestedGranularity)?.label ?? 'Daily';
  const activeGranularityLabel = GRANULARITY_OPTIONS.find((option) => option.value === generationInputs.granularity)?.label ?? 'Daily';
  const availableCrimeTypes = (() => {
    if (crimeTypes.length > 0) {
      return crimeTypes;
    }

    if (!timelineColumns?.type || timelineColumns.type.length === 0) {
      return [];
    }

    return Array.from(
      new Set(Array.from(timelineColumns.type, (typeId) => getCrimeTypeName(typeId)).filter((type) => type.trim().length > 0))
    ).sort();
  })();
  const selectedCrimeTypes = generationInputs.crimeTypes;

  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const previousStep = STEP_ORDER[Math.max(0, activeIndex - 1)] ?? activeStep;
  const nextStep = STEP_ORDER[Math.min(STEP_ORDER.length - 1, activeIndex + 1)] ?? activeStep;

  const StepIcon = useMemo(() => STEP_ICONS[activeStep], [activeStep]);

  const selectionStateLabel = pendingGeneratedBins.length === 0
    ? 'idle'
    : pendingGeneratedBins.every((bin) => bin.isNeutralPartition)
      ? 'neutral'
      : 'expanded';

  const selectionBLabel = useMemo(() => {
    const bestBin = pendingGeneratedBins.reduce<TimeBin | null>((best, bin) => {
      if (!best) {
        return bin;
      }

      const bestScore = Math.abs(best?.burstinessCoefficient ?? best?.burstScore ?? 0);
      const currentScore = Math.abs(bin.burstinessCoefficient ?? bin.burstScore ?? 0);
      return currentScore > bestScore ? bin : best;
    }, null);

    const coefficient = bestBin?.burstinessCoefficient ?? bestBin?.burstScore;
    return typeof coefficient === 'number' && Number.isFinite(coefficient) ? coefficient.toFixed(2) : '—';
  }, [pendingGeneratedBins]);

  const handleGenerateBurstDrafts = async () => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      toast.error('Selection-first generation failed', {
        description: 'Choose a valid brushed selection before generating workflow drafts.',
      });
      return;
    }

    const [windowStart, windowEnd] = timeRange;
    const start = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec) * 1000;
    const end = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec) * 1000;

    setGenerationInputs({
      timeWindow: {
        start,
        end,
      },
    });

    const generated = await generateBurstDraftBinsFromWindows();
    const generationState = useDashboardDemoTimeslicingModeStore.getState();

    if (generated && generationState.lastGeneratedMetadata) {
      const { warning } = generationState.lastGeneratedMetadata;
      toast.success('Burst drafts generated', {
        description: warning ?? 'Selection-first drafts are ready for the next workflow stage.',
      });
      return;
    }

    toast.error('Selection-first generation failed', {
      description: generationState.generationError ?? 'Could not generate drafts from the brushed selection.',
    });
  };

  const handleApplyDraftSlices = () => {
    if (pendingGeneratedBins.length === 0 || minTimestampSec === null || maxTimestampSec === null) {
      return;
    }

    const domain: [number, number] = [minTimestampSec * 1000, maxTimestampSec * 1000];
    applyGeneratedBins(domain);
  };

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
                <h2 className="mt-1 text-sm font-semibold tracking-tight">Orient → Find → Compare → Inspect → Explain → Apply</h2>
                <p className="mt-1 text-[11px] text-slate-400">Left-anchored manual stepper under the demo shell.</p>
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
                      {activeStep === 'orient' && 'Use this stage to understand the data field and decide where to begin.'}
                      {activeStep === 'find' && 'Find the bursty periods and keep the current window visible.'}
                      {activeStep === 'compare' && 'Compare the same dataset under different temporal readings.'}
                      {activeStep === 'inspect' && 'Inspect the focused window before you change the slice set.'}
                      {activeStep === 'explain' && 'Explain why the current highlight exists and what it belongs to.'}
                      {activeStep === 'apply' && 'Apply the confirmed state and return to analysis with the updated workflow.'}
                    </p>
                    {activeStep === 'find' || activeStep === 'apply' ? (
                      <div className="mt-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-100">Selection-first drafts</p>
                          <span className="text-[10px] text-violet-200">Brushed selection is canonical</span>
                        </div>
                        <p className="mt-2 text-[11px] text-violet-100/90">
                          Suggested granularity follows the brushed window size. Hourly fits short spans, daily fits medium spans, and monthly or quarterly fit longer spans.
                        </p>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Granularity</div>
                            <div className="flex items-center gap-2 text-[10px] text-violet-100/80">
                              <span>Suggested: {suggestedGranularityLabel}</span>
                              <button
                                type="button"
                                onClick={() => setGenerationInputs({ granularity: suggestedGranularity })}
                                className="rounded-full border border-violet-300/40 bg-violet-500/10 px-2 py-1 font-medium text-violet-100 transition-colors hover:border-violet-200 hover:bg-violet-500/20"
                              >
                                Use suggested
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {GRANULARITY_OPTIONS.map((option) => {
                              const isActive = generationInputs.granularity === option.value;
                              const isRecommended = option.value === suggestedGranularity;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setGenerationInputs({ granularity: option.value })}
                                  className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                                    isActive
                                      ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                                      : isRecommended
                                        ? 'border-amber-300/60 bg-amber-500/10 text-amber-100 hover:border-amber-200'
                                        : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    {option.label}
                                    {isRecommended ? <span className="text-[9px] uppercase tracking-[0.18em] text-amber-200">Recommended</span> : null}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Active: {activeGranularityLabel}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                            <span>Crime types</span>
                            <button
                              type="button"
                              onClick={() => setGenerationInputs({ crimeTypes: [] })}
                              className="text-[10px] text-slate-400 hover:text-slate-200"
                            >
                              All crime types
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {availableCrimeTypes.length > 0 ? availableCrimeTypes.map((crimeType) => {
                              const isActive = selectedCrimeTypes.includes(crimeType);
                              return (
                                <button
                                  key={crimeType}
                                  type="button"
                                  onClick={() => setGenerationInputs({
                                    crimeTypes: isActive
                                      ? selectedCrimeTypes.filter((type) => type !== crimeType)
                                      : [...selectedCrimeTypes, crimeType],
                                  })}
                                  className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                                    isActive
                                      ? 'border-violet-300 bg-violet-500/20 text-violet-50'
                                      : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                                  }`}
                                >
                                  {crimeType}
                                </button>
                              );
                            }) : (
                              <span className="text-[11px] text-slate-500">All crime types are included by default.</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateBurstDrafts}
                          disabled={!canGenerateBurstDrafts}
                          className="mt-3 inline-flex items-center gap-2 rounded-md border border-violet-400/60 bg-violet-500/20 px-2.5 py-1.5 text-xs font-medium text-violet-50 transition-colors hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generationStatus === 'generating' ? 'Generating…' : 'Generate selection-first drafts'}
                        </button>

                        <div className="mt-3 rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
                          <div className="flex items-center justify-between gap-2">
                            <span>B {selectionBLabel}</span>
                            <span>State {selectionStateLabel}</span>
                          </div>
                          {selectionStateLabel === 'neutral' ? (
                            <p className="mt-1 text-slate-500">Muted neutral partition keeps the brushed selection evenly split.</p>
                          ) : (
                            <p className="mt-1 text-slate-400">Selection-first drafts stay editable before apply.</p>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleApplyDraftSlices}
                            disabled={pendingGeneratedBins.length === 0 || minTimestampSec === null || maxTimestampSec === null}
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-400/60 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-50 transition-colors hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Apply draft slices
                          </button>
                          <button
                            type="button"
                            onClick={clearPendingGeneratedBins}
                            disabled={pendingGeneratedBins.length === 0}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Clear draft
                          </button>
                        </div>

                        {lastAppliedAt ? (
                          <div className="mt-2 text-[10px] text-emerald-200/90">
                            Last apply: {new Date(lastAppliedAt).toLocaleTimeString()}
                          </div>
                        ) : null}
                        {generationError ? (
                          <div className="mt-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] text-red-100">
                            {generationError}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
