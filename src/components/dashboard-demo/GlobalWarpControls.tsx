"use client";

import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import {
  SIGNAL_SOURCE_OPTIONS,
  type AdaptiveSignalSource,
} from '@/lib/signal-sources/contract';
import {
  loadBaseline168,
  loadBaseline168Winsorized,
} from '@/lib/signal-sources';
import { cn } from '@/lib/utils';

const SECONDS_PER_DAY = 24 * 60 * 60;
const TEMPORAL_RES_MIN_DAYS = 0.25;
const TEMPORAL_RES_MAX_DAYS = 7;
const TEMPORAL_RES_STEP_DAYS = 0.25;
const WARP_FACTOR_MAX = 3;
const WARP_FACTOR_PERCENT_MAX = 100;

function clampDays(days: number): number {
  return Math.min(TEMPORAL_RES_MAX_DAYS, Math.max(TEMPORAL_RES_MIN_DAYS, days));
}

function formatDaysLabel(days: number): string {
  if (days >= 1) {
    const wholeOrHalf = days % 1 === 0 ? days.toFixed(0) : days.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${wholeOrHalf} day${days === 1 ? '' : 's'}`;
  }
  const hours = days * 24;
  return `${hours} hr`;
}

export function GlobalWarpControls() {
  const isEvaluationLocked = useIsEvaluationLocked();

  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);

  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);

  const volumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.volumeScaleSeconds);
  const setVolumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.setVolumeScaleSeconds);

  // Phase 84 (BFT-02 finalisation, BFT-10): adaptive signal source
  // selector. Doubly-gated: (1) `timeScaleMode === 'adaptive'` (the
  // Linear/Adaptive toggle); (2) `useFeatureFlagsStore.isEnabled(
  // 'adaptiveSignalSource')` so the UI can be hidden in evaluation
  // mode or via the Settings panel without code changes.
  const activeSignalSource = useAdaptiveStore((state) => state.activeSignalSource);
  const setActiveSignalSource = useAdaptiveStore((state) => state.setActiveSignalSource);
  const isSignalSourceEnabled = useFeatureFlagsStore((state) =>
    state.isEnabled('adaptiveSignalSource'),
  );
  const showSignalSource = isSignalSourceEnabled && !isEvaluationLocked;

  const handleSourceChange = useCallback(
    (value: string) => {
      const source = value as AdaptiveSignalSource;
      setActiveSignalSource(source);
      // Warm the baseline caches on first source switch so the
      // dispatch hot path has the baseline available immediately.
      // Failures are silent — the dispatch falls back to 1.0 if the
      // baseline isn't loaded.
      if (source === 'density') {
        void loadBaseline168().catch(() => undefined);
      } else if (source === 'contextual') {
        void loadBaseline168().catch(() => undefined);
        try {
          loadBaseline168Winsorized();
        } catch {
          /* baseline not loaded yet — see loadBaseline168 above */
        }
      }
    },
    [setActiveSignalSource],
  );

  const temporalDays = useMemo(() => volumeScaleSeconds / SECONDS_PER_DAY, [volumeScaleSeconds]);

  const handleTemporalSliderChange = useCallback(
    (value: number[]) => {
      const next = clampDays(value[0] ?? temporalDays);
      setVolumeScaleSeconds(next * SECONDS_PER_DAY);
    },
    [setVolumeScaleSeconds, temporalDays],
  );

  const handleTemporalStep = useCallback(
    (direction: number) => {
      const next = clampDays(temporalDays + direction * TEMPORAL_RES_STEP_DAYS);
      setVolumeScaleSeconds(next * SECONDS_PER_DAY);
    },
    [setVolumeScaleSeconds, temporalDays],
  );

  const handleWarpSliderChange = useCallback(
    (value: number[]) => {
      const next = Math.max(0, Math.min(WARP_FACTOR_MAX, value[0] ?? warpFactor));
      setWarpFactor(next);
    },
    [setWarpFactor, warpFactor],
  );

  const handleTimeScaleToggle = useCallback(() => {
    const nextMode = timeScaleMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    if (nextMode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
  }, [setTimeScaleMode, setWarpFactor, timeScaleMode, warpFactor]);

  const warpPercent = Math.round((warpFactor / WARP_FACTOR_MAX) * WARP_FACTOR_PERCENT_MAX);

  return (
    <section
      className={cn(
        'mx-2 mt-2 space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs text-muted-foreground',
        isEvaluationLocked && 'pointer-events-none opacity-60',
      )}
      aria-label="global adaptive warp controls"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Sliders className="size-3" aria-hidden />
        Adaptive warp
      </div>

      <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground">Temporal resolution</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatDaysLabel(temporalDays)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Slider
            min={TEMPORAL_RES_MIN_DAYS}
            max={TEMPORAL_RES_MAX_DAYS}
            step={TEMPORAL_RES_STEP_DAYS}
            value={[clampDays(temporalDays)]}
            onValueChange={handleTemporalSliderChange}
            aria-label="Temporal resolution in days"
            disabled={isEvaluationLocked}
          />
          <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => handleTemporalStep(-1)}
              aria-label="Decrease temporal resolution"
              disabled={isEvaluationLocked}
            >
              <ChevronLeft className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={() => handleTemporalStep(1)}
              aria-label="Increase temporal resolution"
              disabled={isEvaluationLocked}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground">Time scale</span>
          <Button
            type="button"
            onClick={handleTimeScaleToggle}
            variant={timeScaleMode === 'adaptive' ? 'secondary' : 'outline'}
            size="sm"
            className="h-6 rounded-sm px-2.5 text-[11px] font-medium"
            disabled={isEvaluationLocked}
            aria-label={`Time scale: ${timeScaleMode === 'adaptive' ? 'Adaptive' : 'Linear'}. Click to toggle.`}
          >
            {timeScaleMode === 'adaptive' ? 'Adaptive' : 'Linear'}
          </Button>
        </div>
        {timeScaleMode === 'adaptive' ? (
          <>
            {showSignalSource ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="shrink-0 text-foreground">Signal source</span>
                <Select
                  value={activeSignalSource}
                  onValueChange={handleSourceChange}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-6 w-[140px] rounded-sm px-2 text-[11px]"
                    aria-label="Adaptive signal source"
                    disabled={isEvaluationLocked}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNAL_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <span className="shrink-0 text-foreground">Warp factor</span>
              <Slider
                min={0}
                max={WARP_FACTOR_MAX}
                step={0.01}
                value={[warpFactor]}
                onValueChange={handleWarpSliderChange}
                aria-label="Warp factor"
                disabled={isEvaluationLocked}
              />
              <span className="w-10 shrink-0 text-right font-mono tabular-nums text-foreground">
                {warpPercent}%
              </span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
