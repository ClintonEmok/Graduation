"use client";

import React, { useCallback, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FastForward,
  Lock,
  Pause,
  Play,
  Plus,
  Settings2,
  Trash2,
  Unlock,
} from 'lucide-react';

import { DemoDualTimeline } from '@/components/timeline/DemoDualTimeline';
import { Slider } from '@/components/ui/slider';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { useSliceStore } from '@/store/useSliceStore';
import type { TimeSlice } from '@/store/useSliceStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';

const TIME_RESOLUTION_OPTIONS: Array<ReturnType<typeof useTimeStore>['timeResolution']> = [
  'seconds',
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
];

export function DemoTimelinePanel() {
  const [isCompanionOpen, setIsCompanionOpen] = useState(true);

  const {
    currentTime,
    isPlaying,
    timeRange,
    speed,
    timeResolution,
    timeScaleMode,
    togglePlay,
    setTime,
    setTimeResolution,
    setSpeed,
    setTimeScaleMode,
  } = useTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);
  const { isComputing } = useDebouncedDensity();

  const slices = useSliceStore((state) => state.slices);
  const addSlice = useSliceStore((state) => state.addSlice);
  const removeSlice = useSliceStore((state) => state.removeSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  const toggleLock = useSliceStore((state) => state.toggleLock);
  const toggleVisibility = useSliceStore((state) => state.toggleVisibility);
  const clearSlices = useSliceStore((state) => state.clearSlices);

  const mode = useTimeslicingModeStore((state) => state.mode);
  const generationStatus = useTimeslicingModeStore((state) => state.generationStatus);
  const pendingGeneratedBins = useTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const lastAppliedAt = useTimeslicingModeStore((state) => state.lastAppliedAt);

  const activeWindowLabel = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) {
      return null;
    }

    const [windowStart, windowEnd] = timeRange;
    const startSec = normalizedToEpochSeconds(windowStart, minTimestampSec, maxTimestampSec);
    const endSec = normalizedToEpochSeconds(windowEnd, minTimestampSec, maxTimestampSec);

    return {
      start: new Date(startSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      end: new Date(endSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }, [maxTimestampSec, minTimestampSec, timeRange]);

  const sliceStats = useMemo(() => {
    return {
      total: slices.length,
      visible: slices.filter((slice) => slice.isVisible).length,
      locked: slices.filter((slice) => slice.isLocked).length,
      burst: slices.filter((slice) => slice.isBurst).length,
    };
  }, [slices]);

  const formatNormalizedValue = useCallback(
    (value: number) => {
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        const epochSec = normalizedToEpochSeconds(value, minTimestampSec, maxTimestampSec);
        return new Date(epochSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return `${value.toFixed(1)}%`;
    },
    [maxTimestampSec, minTimestampSec]
  );

  const formatSliceLabel = useCallback(
    (slice: TimeSlice, index: number) => {
      const fallback = slice.type === 'point' ? `Slice ${index + 1}` : `Range ${index + 1}`;
      const title = slice.name?.trim() || fallback;

      if (slice.type === 'range' && slice.range) {
        return `${title} • ${formatNormalizedValue(slice.range[0])} → ${formatNormalizedValue(slice.range[1])}`;
      }

      return `${title} • ${formatNormalizedValue(slice.time)}`;
    },
    [formatNormalizedValue]
  );

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
    const nextMode = timeScaleMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    if (nextMode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
  }, [setTimeScaleMode, setWarpFactor, timeScaleMode, warpFactor]);

  const handleAddPointSlice = useCallback(() => {
    addSlice({ type: 'point', time: currentTime, source: 'manual', isLocked: false, isVisible: true });
  }, [addSlice, currentTime]);

  const handleAddRangeSlice = useCallback(() => {
    const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
    const start = Math.max(timeRange[0], currentTime - stepSize * 2);
    const end = Math.min(timeRange[1], currentTime + stepSize * 2);
    const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];

    addSlice({
      type: 'range',
      time: (normalizedRange[0] + normalizedRange[1]) / 2,
      range: normalizedRange,
      source: 'manual',
      isLocked: false,
      isVisible: true,
    });
  }, [addSlice, currentTime, maxTimestampSec, minTimestampSec, timeRange, timeResolution]);

  const handleClearSlices = useCallback(() => {
    clearSlices();
  }, [clearSlices]);

  return (
    <div className="w-full h-full bg-background border-t p-4 flex flex-col gap-4" aria-busy={isComputing}>
      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/10 px-4 py-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Phase 3 demo temporal control</div>
            <div className="text-sm font-semibold">Demo timeline</div>
            <div className="max-w-2xl text-xs text-muted-foreground">
              The demo keeps slices in a companion layer above the timeline while preserving the full playback and resolution control set.
            </div>
          </div>

          {activeWindowLabel ? (
            <div className="rounded-md border bg-background/80 px-3 py-2 text-xs shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active window</div>
              <div className="font-medium">
                {activeWindowLabel.start} → {activeWindowLabel.end}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border bg-muted/10 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Slice companion</div>
              <div className="text-sm font-medium">Collapsible slice editing layer</div>
              <div className="text-[10px] text-muted-foreground">Shared store boundary verified; demo isolation stays in composition.</div>
            </div>

            <button
              type="button"
              onClick={() => setIsCompanionOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
              aria-expanded={isCompanionOpen}
            >
              {isCompanionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isCompanionOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {isCompanionOpen ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border bg-background px-2 py-1">Slices {sliceStats.total}</span>
                <span className="rounded-full border bg-background px-2 py-1">Visible {sliceStats.visible}</span>
                <span className="rounded-full border bg-background px-2 py-1">Locked {sliceStats.locked}</span>
                <span className="rounded-full border bg-background px-2 py-1">Burst {sliceStats.burst}</span>
                <span className="rounded-full border bg-background px-2 py-1">Mode {mode}</span>
                <span className="rounded-full border bg-background px-2 py-1">Status {generationStatus}</span>
                <span className="rounded-full border bg-background px-2 py-1">Draft bins {pendingGeneratedBins.length}</span>
                {lastAppliedAt ? <span className="rounded-full border bg-background px-2 py-1">Applied {new Date(lastAppliedAt).toLocaleDateString()}</span> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddPointSlice}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Point
                </button>
                <button
                  type="button"
                  onClick={handleAddRangeSlice}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Range
                </button>
                <button
                  type="button"
                  onClick={handleClearSlices}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <div className="space-y-2">
                {slices.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-background/70 px-3 py-4 text-sm text-muted-foreground">
                    No slices active. Add a point or range to inspect the timeline in the demo companion.
                  </div>
                ) : (
                  slices.map((slice, index) => {
                    const fallbackName = slice.type === 'point' ? `Slice ${index + 1}` : `Range ${index + 1}`;

                    return (
                      <div key={slice.id} className="grid gap-2 rounded-md border bg-background/80 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            <span className="rounded-full border bg-muted px-2 py-1">{slice.type}</span>
                            {slice.isBurst ? <span className="rounded-full border bg-muted px-2 py-1">burst</span> : null}
                            {slice.source ? <span className="rounded-full border bg-muted px-2 py-1">{slice.source}</span> : null}
                          </div>

                          <input
                            type="text"
                            value={slice.name ?? ''}
                            onChange={(event) => {
                              const nextName = event.target.value.trim();
                              updateSlice(slice.id, { name: nextName || undefined });
                            }}
                            placeholder={fallbackName}
                            aria-label={`Slice name for ${fallbackName}`}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          />

                          <div className="text-xs text-muted-foreground">{formatSliceLabel(slice, index)}</div>
                        </div>

                        <div className="flex items-center gap-1 md:justify-end">
                          <button
                            type="button"
                            onClick={() => toggleVisibility(slice.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title={slice.isVisible ? 'Hide slice' : 'Show slice'}
                          >
                            {slice.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLock(slice.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title={slice.isLocked ? 'Unlock slice' : 'Lock slice'}
                          >
                            {slice.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlice(slice.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Remove slice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pb-2">
            <span>Demo timeline • Detail view</span>
            <span>Brush overview to resize the window • click detail to inspect a moment</span>
          </div>
          <DemoDualTimeline />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-[120px]">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStep.bind(null, -1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background transition-colors hover:bg-accent"
              title="Step backward"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleStep.bind(null, 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background transition-colors hover:bg-accent"
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
              {timeScaleMode === 'linear' ? 'Linear' : 'Adaptive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
