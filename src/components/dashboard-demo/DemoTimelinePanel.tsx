"use client";

import React, { useCallback } from 'react';
import { ChevronRight, FastForward, Pause, Play, Settings2 } from 'lucide-react';

import { DemoDualTimeline } from '@/components/timeline/DemoDualTimeline';
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
    isPlaying,
    speed,
    timeResolution,
    togglePlay,
    setTime,
    setTimeResolution,
    setSpeed,
  } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const warpFactor = useDashboardDemoWarpStore((state) => state.warpFactor);
  const warpMode = useDashboardDemoWarpStore((state) => state.timeScaleMode);
  const setWarpFactor = useDashboardDemoWarpStore((state) => state.setWarpFactor);
  const setTimeScaleMode = useDashboardDemoWarpStore((state) => state.setTimeScaleMode);

  const handleResolutionChange = useCallback(
    (value: number[]) => {
      const next = TIME_RESOLUTION_OPTIONS[Math.round(value[0])] ?? 'days';
      if (next === timeResolution) return;
      setTimeResolution(next);
    },
    [setTimeResolution, timeResolution]
  );

  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSpeed(Number(event.target.value));
    },
    [setSpeed]
  );

  const handleTogglePlay = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

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
    <div className="w-full h-full bg-background border-t p-4 flex flex-col gap-4">
      <div className="w-full flex flex-col gap-4">
        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <div className="pb-2 text-[10px] text-muted-foreground">
            Demo timeline • Focused track above • raw baseline below
          </div>
          <DemoDualTimeline />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-[120px] shrink-0">
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

          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background px-1.5 py-1">
            <button
              type="button"
              onClick={handleStep.bind(null, -1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background transition-colors hover:bg-accent"
              title="Step backward"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleStep.bind(null, 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background transition-colors hover:bg-accent"
              title="Step forward"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FastForward className="w-4 h-4" />
            <select
              value={speed}
              onChange={handleSpeedChange}
              className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-foreground"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={2}>2.0x</option>
              <option value={5}>5.0x</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Time Scale</span>
            <button
              type="button"
              onClick={handleScaleModeToggle}
              className="rounded bg-primary/10 px-3 py-1 font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {warpMode === 'linear' ? 'Linear' : 'Adaptive'}
            </button>
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
