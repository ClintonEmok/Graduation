"use client";

/**
 * Phase 80 — Researcher-only warp factor control path.
 *
 * This component is the only place in `/evaluation` where the warp
 * factor can be adjusted directly. The participant-facing
 * `DemoTimelineSettingsCard` (and its sibling panels) only exposes a
 * time-scale toggle; the deeper warp factor tuning is gated to the
 * researcher.
 *
 * Every adjustment is logged through the acknowledged study event path
 * (`submitWarpAdjustment`) so the thesis analysis step can reconstruct
 * the per-condition warp history for each participant. The logger
 * helper uses `event_type = 'warp-adjustment'` in
 * `study_condition_events`, which is intentionally distinct from the
 * `event_type = 'condition-toggle'` row that the unlabeled time-scale
 * toggle writes — see `src/lib/study/storage.ts`.
 *
 * Logging is suppressed when the active step is not part of a block
 * (`welcome` / `training` / `interview` / `done`). The warp value is
 * still applied to the coordination store so the researcher can verify
 * the effect during training without contaminating the analysis with
 * pre-block samples.
 */

import { useCallback, useRef } from 'react';
import { Gauge, ShieldCheck } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import {
  selectActiveBlock,
  selectActiveCondition,
  useEvaluationStudyStore,
} from '@/store/useEvaluationStudyStore';
import { submitWarpAdjustment } from '@/lib/logger';
import { cn } from '@/lib/utils';

const WARP_FACTOR_MIN = 0;
const WARP_FACTOR_MAX = 3;
const WARP_FACTOR_STEP = 0.05;

export interface ResearcherWarpControlsProps {
  /** Compact horizontal layout for header strips. Default: false (full width). */
  compact?: boolean;
  /** Optional className for the outer container. */
  className?: string;
}

export function ResearcherWarpControls({
  compact = false,
  className,
}: ResearcherWarpControlsProps) {
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);

  const sessionId = useEvaluationStudyStore((state) => state.sessionId);
  const participantId = useEvaluationStudyStore((state) => state.participantId);
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const activeBlock = useEvaluationStudyStore(selectActiveBlock);
  const activeCondition = useEvaluationStudyStore(selectActiveCondition);

  // Track the prior value so we can emit (warpFactorBefore,
  // warpFactorAfter) pairs without re-reading the store on every
  // onValueChange fire.
  const priorWarpRef = useRef<number>(warpFactor);

  const handleWarpChange = useCallback(
    (value: number[]) => {
      const nextValue = value[0] ?? warpFactor;
      const priorValue = priorWarpRef.current;
      if (nextValue === priorValue) return;

      // Always apply the change to the coordination store so the
      // researcher sees the visual effect immediately.
      setWarpFactor(nextValue);
      priorWarpRef.current = nextValue;

      // Only persist to the study event log when we are inside a block
      // (the API requires a `block` value). Outside a block the warp
      // value is still applied to the store but the change is not
      // counted as a study event.
      if (!activeBlock || !activeCondition) return;
      if (!sessionId || !participantId) return;

      void submitWarpAdjustment({
        sessionId,
        participantId,
        block: activeBlock,
        condition: activeCondition,
        warpFactorBefore: priorValue,
        warpFactorAfter: nextValue,
        occurredAt: Date.now(),
      });
    },
    [
      activeBlock,
      activeCondition,
      participantId,
      sessionId,
      setWarpFactor,
      warpFactor,
    ],
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-50',
        compact ? 'min-w-[220px]' : 'w-full',
        className,
      )}
      role="group"
      aria-label="researcher warp factor controls"
      data-active-block={activeBlock ?? 'none'}
      data-current-step={currentStep}
    >
      <div className="flex items-center gap-1.5 text-amber-200/90">
        <ShieldCheck className="size-3.5" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          Researcher warp
        </span>
      </div>
      <Gauge className="size-3.5 text-amber-200/80" aria-hidden />
      <Slider
        min={WARP_FACTOR_MIN}
        max={WARP_FACTOR_MAX}
        step={WARP_FACTOR_STEP}
        value={[warpFactor]}
        onValueChange={handleWarpChange}
        aria-label="Warp factor (researcher only)"
        className="min-w-[120px] flex-1 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-amber-400 [&_[data-slot=slider-thumb]]:size-3.5"
      />
      <span className="w-12 text-right font-mono text-amber-50">
        {Math.round(warpFactor * 100)}%
      </span>
    </div>
  );
}
