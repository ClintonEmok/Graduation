"use client";

import React, { useCallback } from 'react';
import { ChevronRight, Settings2 } from 'lucide-react';

import { DemoDualTimeline } from '@/components/timeline/DemoDualTimeline';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useDashboardDemoWarpStore } from '@/store/useDashboardDemoWarpStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { resolutionToNormalizedStep, type TimeResolution } from '@/lib/time-domain';

const TIME_RESOLUTION_OPTIONS: TimeResolution[] = [
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
];

export function DemoTimelinePanel() {
  const {
    currentTime,
    timeResolution,
    setTime,
    setTimeResolution,
  } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const warpMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const warpSource = useDashboardDemoWarpStore((state) => state.warpSource);
  const setWarpFactor = useDashboardDemoWarpStore((state) => state.setWarpFactor);
  const setTimeScaleMode = useDashboardDemoWarpStore((state) => state.setTimeScaleMode);
  const setWarpSource = useDashboardDemoWarpStore((state) => state.setWarpSource);

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
    <div className="flex h-full w-full flex-col gap-4 border-t border-border bg-card/70 p-4">
      <div className="flex w-full flex-col gap-4">
        <DemoDualTimeline />

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <div className="flex min-w-[120px] shrink-0 items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Temporal Resolution</span>
          </div>
          <div className="flex-1 max-w-lg">
            <Slider
              min={0}
              max={6}
              step={1}
              value={[TIME_RESOLUTION_OPTIONS.indexOf(timeResolution)]}
              onValueChange={handleResolutionChange}
            />
          </div>
          <div className="w-12 text-right font-mono">{timeResolution}</div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-1">
            <Button
              type="button"
              onClick={handleStep.bind(null, -1)}
              variant="outline"
              size="icon-xs"
              className="rounded-full"
              title="Step backward"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <Button
              type="button"
              onClick={handleStep.bind(null, 1)}
              variant="outline"
              size="icon-xs"
              className="rounded-full"
              title="Step forward"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Time Scale</span>
            <Button
              type="button"
              onClick={handleScaleModeToggle}
              variant="secondary"
              size="sm"
              className="rounded-md px-3 py-1"
            >
              {warpMode === 'linear' ? 'Linear' : 'Adaptive'}
            </Button>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Warp source</span>
            <Button
              type="button"
              onClick={() => setWarpSource('slice-authored')}
              variant={warpSource === 'slice-authored' ? 'secondary' : 'outline'}
              size="sm"
              className={`rounded-md px-2 py-1 ${
                warpSource === 'slice-authored'
                  ? ''
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              Slice-authored
            </Button>
            <Button
              type="button"
              onClick={() => setWarpSource('density')}
              variant={warpSource === 'density' ? 'secondary' : 'outline'}
              size="sm"
              className={`rounded-md px-2 py-1 ${
                warpSource === 'density'
                  ? ''
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              Density
            </Button>
          </div>
          {warpMode === 'adaptive' ? (
            <div className="flex items-center gap-2 min-w-[220px]">
              <span>Warp factor</span>
              <div className="flex-1 max-w-48">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[warpFactor]}
                  onValueChange={(value) => setWarpFactor(value[0] ?? warpFactor)}
                />
              </div>
              <span className="w-12 text-right font-mono">{Math.round(warpFactor * 100)}%</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
