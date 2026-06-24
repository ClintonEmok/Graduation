"use client";

/**
 * Phase 80 — Evaluation header.
 *
 * One overlaid header band that sits above the wrapped `DashboardDemoShell`
 * on the `/evaluation` route. Three horizontal zones:
 *
 *   1. Session zone (left)   — participant id, current step title, elapsed
 *      session timer, and a compact save-status readout.
 *   2. Stepper zone (center) — 8-step researcher-controlled phase stepper
 *      whose labels come from `STUDY_STEPS` and whose current step uses
 *      the accent fill from the UI spec.
 *   3. Researcher zone (right) — condition badge, unlabeled time-scale
 *      toggle, prev/next step navigation, start/end session actions, and
 *      a "rerun training" trigger.
 *
 * The header NEVER displays explicit "Uniform" / "Adaptive" text in the
 * session or stepper zones (per D-04 / D-05). The condition badge is the
 * only researcher-only place where the condition name surfaces, and it
 * uses the condition id (`uniform` / `adaptive`) as the value rather than
 * a participant-facing label.
 *
 * All stepper / step / participant data is read from
 * `useEvaluationStudyStore`. The unlabeled time-scale toggle is wired to
 * the existing `useDashboardDemoCoordinationStore.setTimeScaleMode` so
 * the warp effect inside the wrapped demo shell actually changes.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw, Square } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { submitConditionToggle } from '@/lib/logger';
import {
  selectActiveBlock,
  useEvaluationStudyStore,
  type SaveStatus,
} from '@/store/useEvaluationStudyStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import {
  STUDY_STEPS,
  stepIndex,
  type StudyStepId,
} from '@/lib/study/protocol';
import {
  ALL_BLOCK_ORDERS,
  type BlockOrder,
  conditionForBlock,
  type ConditionId,
} from '@/lib/study/condition-order';
import { ResearcherWarpControls } from '@/components/evaluation/ResearcherWarpControls';
import { RESET_TARGETS, type ResetOutcome } from '@/lib/study/resetTargets';

const STAGE_TRAINING_TOUR_EVENT = 'gsd:start-evaluation-training-tour';

const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const summarizeSaveStatus = (statuses: Record<string, SaveStatus>): {
  pending: number;
  error: number;
} => {
  let pending = 0;
  let error = 0;
  for (const value of Object.values(statuses)) {
    if (value === 'pending') pending += 1;
    else if (value === 'error') error += 1;
  }
  return { pending, error };
};

const labelForCurrentStep = (stepId: StudyStepId): string => {
  const step = STUDY_STEPS.find((entry) => entry.id === stepId);
  return step?.label ?? 'Welcome';
};

export interface EvaluationHeaderProps {
  /** When true, disables the prev/next step controls (e.g. during the training tour). */
  readOnlyStepper?: boolean;
}

export function EvaluationHeader({ readOnlyStepper = false }: EvaluationHeaderProps) {
  const sessionId = useEvaluationStudyStore((state) => state.sessionId);
  const participantId = useEvaluationStudyStore((state) => state.participantId);
  const startTime = useEvaluationStudyStore((state) => state.startTime);
  const assignment = useEvaluationStudyStore((state) => state.assignment);
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const saveStatus = useEvaluationStudyStore((state) => state.saveStatus);
  const trainingCompleted = useEvaluationStudyStore((state) => state.trainingCompleted);

  const advanceStep = useEvaluationStudyStore((state) => state.advanceStep);
  const previousStep = useEvaluationStudyStore((state) => state.previousStep);
  const goToStep = useEvaluationStudyStore((state) => state.goToStep);
  const startSession = useEvaluationStudyStore((state) => state.startSession);
  const endSession = useEvaluationStudyStore((state) => state.endSession);
  const resetForNewSession = useEvaluationStudyStore((state) => state.resetForNewSession);
  const setParticipantId = useEvaluationStudyStore((state) => state.setParticipantId);

  const activeBlock = useEvaluationStudyStore(selectActiveBlock);

  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startTime <= 0) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [startTime]);

  const elapsedMs = startTime > 0 ? now - startTime : 0;
  const saveSummary = useMemo(() => summarizeSaveStatus(saveStatus), [saveStatus]);
  const hasActiveSession = sessionId.length > 0 && participantId !== null;

  const conditionForActiveBlock =
    assignment && activeBlock ? conditionForBlock(assignment, activeBlock) : null;

  const handleRerunTraining = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(STAGE_TRAINING_TOUR_EVENT));
  };

  // Map the time-scale mode used by the demo coordination store to the
  // study protocol's condition id (`linear` => `uniform`, `adaptive`
  // stays `adaptive`). Used to log every condition toggle through the
  // acknowledged study event path so the unlabeled toggle and the
  // researcher warp adjustments remain distinct in `study_condition_events`.
  const timeScaleModeToCondition = (mode: 'linear' | 'adaptive'): ConditionId =>
    mode === 'adaptive' ? 'adaptive' : 'uniform';

  const handleConditionToggle = useCallback(
    (checked: boolean) => {
      const fromMode = timeScaleMode;
      const toMode = checked ? 'adaptive' : 'linear';
      if (fromMode === toMode) return;

      setTimeScaleMode(toMode);

      // Auto-activate warp when entering adaptive mode, matching every
      // other toggle in the codebase (TimelinePanel, DemoTimelineSettingsCard,
      // DemoSlicePanel). Without this the short-circuit in
      // applyAdaptiveWarping (warpFactor <= 0 returns linear scale) makes
      // the toggle appear to do nothing.
      if (toMode === 'adaptive' && warpFactor === 0) {
        setWarpFactor(1);
      }

      // The `block` column is required by the API route. Suppress the
      // log entry when the researcher toggles during a non-block step
      // (welcome / training / interview / done) — the demo shell still
      // observes the change but the study event log is block-scoped.
      if (!activeBlock) return;
      if (!sessionId || !participantId) return;

      void submitConditionToggle({
        sessionId,
        participantId,
        block: activeBlock,
        fromCondition: timeScaleModeToCondition(fromMode),
        toCondition: timeScaleModeToCondition(toMode),
        warpFactorAtEvent: warpFactor,
        occurredAt: Date.now(),
      });
    },
    [activeBlock, participantId, sessionId, setTimeScaleMode, timeScaleMode, warpFactor],
  );

  return (
    <header
      className={cn(
        'flex h-16 min-h-16 items-stretch border-b border-slate-800 bg-slate-900/80 text-slate-100',
        'shadow-sm backdrop-blur supports-[backdrop-filter]:bg-slate-900/70',
      )}
      aria-label="evaluation header"
    >
      {/* Session zone (left) */}
      <div className="flex min-w-0 flex-1 items-center gap-4 px-6">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Researcher
          </span>
          <span className="text-sm font-semibold text-slate-100">Evaluation Session</span>
        </div>
        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Participant
          </span>
          <span className="font-mono text-[12px] font-semibold text-slate-100">
            {participantId ?? '—'}
          </span>
        </div>
        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Current step
          </span>
          <span className="text-sm font-semibold text-slate-100">
            {labelForCurrentStep(currentStep)}
          </span>
        </div>
        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Session timer
          </span>
          <span className="font-mono text-[12px] font-semibold text-slate-100">
            {startTime > 0 ? formatElapsed(elapsedMs) : '00:00:00'}
          </span>
        </div>
        {saveSummary.pending > 0 || saveSummary.error > 0 ? (
          <>
            <Separator orientation="vertical" className="h-10 bg-slate-700/70" />
            <div className="flex flex-col" aria-live="polite">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Save status
              </span>
              <span
                className={cn(
                  'text-[12px] font-semibold',
                  saveSummary.error > 0 ? 'text-red-400' : 'text-slate-200',
                )}
              >
                {saveSummary.error > 0
                  ? `${saveSummary.error} error${saveSummary.error === 1 ? '' : 's'}`
                  : `${saveSummary.pending} pending`}
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* Stepper zone (center) */}
      <nav
        className="flex flex-1 items-center justify-center gap-1.5 px-4"
        aria-label="evaluation stepper"
      >
        {STUDY_STEPS.map((step) => {
          const isCurrent = step.id === currentStep;
          const stepIdx = stepIndex(step.id);
          const currentIdx = stepIndex(currentStep);
          const isCompleted = currentIdx > stepIdx && currentIdx >= 0;
          const isFuture = currentIdx < stepIdx;
          return (
            <button
              key={step.id}
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => {
                if (readOnlyStepper) return;
                goToStep(step.id);
              }}
              disabled={readOnlyStepper}
              className={cn(
                'group inline-flex h-9 min-w-[88px] items-center justify-center rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors',
                isCurrent &&
                  'border-violet-500/70 bg-violet-500/15 text-violet-100 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]',
                isCompleted &&
                  'border-slate-700 bg-slate-800 text-slate-200 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.55)]',
                isFuture && 'border-slate-800 bg-slate-900/60 text-slate-500',
                !readOnlyStepper && 'hover:bg-slate-800/80',
                readOnlyStepper && 'cursor-not-allowed opacity-70',
              )}
              title={step.description}
            >
              {step.label}
            </button>
          );
        })}
      </nav>

      {/* Researcher zone (right) */}
      <div
        className="flex items-center gap-3 border-l border-slate-700/70 pl-4 pr-6"
        aria-label="researcher utilities"
      >
        {/* Condition badge (researcher-only) */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Condition
          </span>
          <Badge
            variant="secondary"
            className="border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-100"
          >
            <span
              aria-hidden
              className={cn(
                'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                conditionForActiveBlock === 'adaptive'
                  ? 'bg-violet-500'
                  : conditionForActiveBlock === 'uniform'
                    ? 'bg-slate-400'
                    : 'bg-slate-600',
              )}
            />
            {conditionForActiveBlock ?? (assignment ? '—' : 'idle')}
          </Badge>
        </div>

        {/* Unlabeled time-scale toggle (per D-05) */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            View
          </span>
          <Switch
            aria-label="Change time-scale view"
            checked={timeScaleMode === 'adaptive'}
            onCheckedChange={handleConditionToggle}
          />
        </div>

        {/* Researcher-only warp factor control path (80-03). Mounted
            inside the researcher zone so the participant cannot reach
            the deeper warp tuning from any rail panel. Every adjustment
            is logged via `submitWarpAdjustment` so the analysis step
            can reconstruct the per-condition warp history. */}
        <ResearcherWarpControls compact />

        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />

        {/* Step navigation (researcher-only) */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Previous step"
            title="Previous step"
            disabled={readOnlyStepper || stepIndex(currentStep) <= 0}
            onClick={() => {
              previousStep();
            }}
            className="text-slate-200 hover:bg-slate-800 hover:text-slate-50"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Next step"
            title="Next step"
            disabled={readOnlyStepper || stepIndex(currentStep) >= STUDY_STEPS.length - 1}
            onClick={() => {
              advanceStep();
            }}
            className="text-slate-200 hover:bg-slate-800 hover:text-slate-50"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />

        {/* Session control */}
        {hasActiveSession ? (
          <div className="flex flex-col items-stretch gap-1">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const confirmed = window.confirm(
                    'End this session after confirming all task responses and questionnaires are saved?',
                  );
                  if (!confirmed) return;
                }
                endSession();
              }}
              className="h-7 px-2.5 text-[11px] font-semibold"
            >
              <Square className="size-3" />
              End session
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const confirmed = window.confirm(
                    'Reset evaluation state for the next participant? This will clear the demo shell and start a fresh session.',
                  );
                  if (!confirmed) return;
                }
                resetForNewSession();
              }}
              className="h-7 px-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          </div>
        ) : (
          <WelcomeActions
            onStart={startSession}
            onReset={resetForNewSession}
            onSetParticipantId={setParticipantId}
          />
        )}

        <Separator orientation="vertical" className="h-10 bg-slate-700/70" />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRerunTraining}
          disabled={!hasActiveSession}
          className="h-7 px-2.5 text-[11px] font-semibold"
          title={
            trainingCompleted
              ? 'Rerun the training tour for this participant'
              : 'Start the training tour'
          }
        >
          <RotateCcw className="size-3" />
          Rerun training
        </Button>
      </div>
    </header>
  );
}

interface WelcomeActionsProps {
  onStart: (params: { participantId?: string; blockOrder: BlockOrder }) => string;
  onReset: (params?: { blockOrder?: BlockOrder }) => ResetOutcome[];
  onSetParticipantId: (id: string) => void;
}

function WelcomeActions({ onStart, onReset, onSetParticipantId }: WelcomeActionsProps) {
  const storedParticipantId = useEvaluationStudyStore((state) => state.participantId);
  const storedBlockOrder = useEvaluationStudyStore((state) => state.blockOrder);
  const lastResetReport = useEvaluationStudyStore((state) => state.resetReport);
  const lastResetSucceeded = useEvaluationStudyStore((state) => state.lastResetSucceeded);

  const [draft, setDraft] = useState<string>(storedParticipantId ?? '');
  const [order, setOrder] = useState<BlockOrder>(storedBlockOrder ?? ALL_BLOCK_ORDERS[0]);
  const [prevStored, setPrevStored] = useState<string | null>(storedParticipantId);

  if (storedParticipantId !== prevStored) {
    setPrevStored(storedParticipantId);
    setDraft(storedParticipantId ?? '');
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="flex items-center gap-1">
        <input
          aria-label="Participant ID"
          placeholder="Participant ID"
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            onSetParticipantId(next);
          }}
          className="h-7 w-32 rounded-md border border-slate-700 bg-slate-900/70 px-2 text-[11px] font-mono text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
        />
        <select
          aria-label="Block order"
          value={order}
          onChange={(event) => setOrder(event.target.value as BlockOrder)}
          className="h-7 rounded-md border border-slate-700 bg-slate-900/70 px-2 text-[11px] font-semibold text-slate-100 focus:border-violet-500 focus:outline-none"
        >
          {ALL_BLOCK_ORDERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onStart({ blockOrder: order, participantId: draft.trim() || undefined });
          }}
          className="h-7 px-2.5 text-[11px] font-semibold"
        >
          <Play className="size-3" />
          Start session
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onReset()}
          className="h-7 px-2.5 text-[11px] font-semibold"
          disabled={!lastResetReport}
          title={summarizeResetReport(lastResetReport, lastResetSucceeded)}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}

function summarizeResetReport(
  report: ResetOutcome[] | null,
  succeeded: boolean,
): string {
  if (!report) return 'Reset evaluation state for the next participant';
  if (succeeded) return 'Reset succeeded — start a fresh session';
  const failed = report.filter((entry) => entry.status === 'failed').length;
  return `Reset complete with ${failed} failed target${failed === 1 ? '' : 's'}`;
}

// Re-export the reset target list so the parent shell can render an
// optional "what was reset" panel without re-importing the study module.
export const EVAL_HEADER_RESET_TARGETS = RESET_TARGETS;
export type { ResetOutcome };
