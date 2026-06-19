"use client";

import { useCallback } from 'react';
import { ChevronRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';
import { resolutionToNormalizedStep, type TimeResolution } from '@/lib/time-domain';
import { cn } from '@/lib/utils';

const TIME_RESOLUTION_OPTIONS: TimeResolution[] = [
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
];

export function DemoTimelineSettingsCard() {
  const { currentTime, timeResolution, setTime, setTimeResolution } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const warpMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const setWarpFactor = useDashboardDemoCoordinationStore((state) => state.setWarpFactor);
  const setTimeScaleMode = useDashboardDemoCoordinationStore((state) => state.setTimeScaleMode);
  const isEvaluationLocked = useIsEvaluationLocked();

  const handleResolutionChange = useCallback(
    (value: number[]) => {
      const next = TIME_RESOLUTION_OPTIONS[Math.round(value[0])] ?? 'days';
      if (next === timeResolution) return;
      setTimeResolution(next);
    },
    [setTimeResolution, timeResolution]
  );

  const handleStep = useCallback(
    (direction: number) => {
      const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
      setTime(currentTime + direction * stepSize);
    },
    [currentTime, maxTimestampSec, minTimestampSec, setTime, timeResolution]
  );

  const handleScaleModeToggle = useCallback(() => {
    const nextMode = warpMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    if (nextMode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
  }, [setTimeScaleMode, setWarpFactor, warpMode, warpFactor]);

  return (
    <Card className="rounded-lg border-border/70 bg-card/80 text-card-foreground shadow-sm">
      <CardContent className="flex flex-col gap-2.5 px-3 py-3">
        <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span>Temporal resolution</span>
            </div>
            <span className="font-mono text-foreground">{timeResolution}</span>
          </div>
          <div className={cn('mt-2 flex items-center gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}>
            <Slider
              min={0}
              max={6}
              step={1}
              value={[TIME_RESOLUTION_OPTIONS.indexOf(timeResolution)]}
              onValueChange={handleResolutionChange}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
            />
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
              <Button
                type="button"
                onClick={() => handleStep(-1)}
                variant="outline"
                size="icon-xs"
                className="rounded-sm"
                title="Step backward"
                disabled={isEvaluationLocked}
                aria-disabled={isEvaluationLocked}
                tabIndex={isEvaluationLocked ? -1 : undefined}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                type="button"
                onClick={() => handleStep(1)}
                variant="outline"
                size="icon-xs"
                className="rounded-sm"
                title="Step forward"
                disabled={isEvaluationLocked}
                aria-disabled={isEvaluationLocked}
                tabIndex={isEvaluationLocked ? -1 : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>Time scale</span>
            <Button
              type="button"
              onClick={handleScaleModeToggle}
              variant="secondary"
              size="sm"
              className={cn('rounded-sm px-2.5 py-1', isEvaluationLocked && 'pointer-events-none opacity-40')}
              disabled={isEvaluationLocked}
              aria-disabled={isEvaluationLocked}
              tabIndex={isEvaluationLocked ? -1 : undefined}
            >
              {warpMode === 'linear' ? 'Linear' : 'Adaptive'}
            </Button>
          </div>
          <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', isEvaluationLocked && 'pointer-events-none opacity-40')}>
            <span>Slice source</span>
            <div className="inline-flex items-center gap-2 self-start rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground sm:self-auto">
              Density
            </div>
          </div>
          {warpMode === 'adaptive' ? (
            <div className={cn('flex items-center gap-2', isEvaluationLocked && 'pointer-events-none opacity-40')}>
              <span>Warp factor</span>
              <div className="min-w-0 flex-1">
                <Slider
                  min={0}
                  max={3}
                  step={0.01}
                  value={[warpFactor]}
                  onValueChange={(value) => setWarpFactor(value[0] ?? warpFactor)}
                  disabled={isEvaluationLocked}
                  aria-disabled={isEvaluationLocked}
                  tabIndex={isEvaluationLocked ? -1 : undefined}
                />
              </div>
              <span className="w-12 text-right font-mono text-foreground">{Math.round(warpFactor * 100)}%</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
