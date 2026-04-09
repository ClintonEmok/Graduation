"use client";

import { useCallback, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebouncedDensity } from '@/hooks/useDebouncedDensity';
import { useDashboardDemoSliceStore } from '@/store/useDashboardDemoSliceStore';
import type { TimeSlice } from '@/store/useDashboardDemoSliceStore';
import { useDashboardDemoTimeStore } from '@/store/useDashboardDemoTimeStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';

const toDateTimeLocalValue = (timestampMs: number | null | undefined) => {
  if (timestampMs === null || timestampMs === undefined || !Number.isFinite(timestampMs)) {
    return '';
  }

  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export function DemoSlicePanel() {
  const { currentTime, timeRange, timeResolution } = useDashboardDemoTimeStore();
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const { isComputing } = useDebouncedDensity();

   const slices = useDashboardDemoSliceStore((state) => state.slices);
   const addSlice = useDashboardDemoSliceStore((state) => state.addSlice);
   const removeSlice = useDashboardDemoSliceStore((state) => state.removeSlice);
   const updateSlice = useDashboardDemoSliceStore((state) => state.updateSlice);
   const toggleLock = useDashboardDemoSliceStore((state) => state.toggleLock);
   const toggleVisibility = useDashboardDemoSliceStore((state) => state.toggleVisibility);
   const clearSlices = useDashboardDemoSliceStore((state) => state.clearSlices);

  const mode = useDashboardDemoTimeslicingModeStore((state) => state.mode);
  const generationStatus = useDashboardDemoTimeslicingModeStore((state) => state.generationStatus);
  const pendingGeneratedBins = useDashboardDemoTimeslicingModeStore((state) => state.pendingGeneratedBins);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);

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

  const handleAddPointSlice = useCallback(() => {
    const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(currentTime, minTimestampSec, maxTimestampSec) * 1000
      : null;

    addSlice({
      type: 'point',
      time: currentTime,
      source: 'manual',
      isLocked: false,
      isVisible: true,
      startDateTimeMs,
    });
  }, [addSlice, currentTime, maxTimestampSec, minTimestampSec]);

  const handleAddRangeSlice = useCallback(() => {
    const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
    const start = Math.max(timeRange[0], currentTime - stepSize * 2);
    const end = Math.min(timeRange[1], currentTime + stepSize * 2);
    const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
    const startDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[0], minTimestampSec, maxTimestampSec) * 1000
      : null;
    const endDateTimeMs = minTimestampSec !== null && maxTimestampSec !== null
      ? normalizedToEpochSeconds(normalizedRange[1], minTimestampSec, maxTimestampSec) * 1000
      : null;

    addSlice({
      type: 'range',
      time: (normalizedRange[0] + normalizedRange[1]) / 2,
      range: normalizedRange,
      source: 'manual',
      isLocked: false,
      isVisible: true,
      startDateTimeMs,
      endDateTimeMs,
    });
  }, [addSlice, currentTime, maxTimestampSec, minTimestampSec, timeRange, timeResolution]);

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100" aria-busy={isComputing}>
      <header className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-slate-100">Slice Companion</h2>
        <p className="text-[11px] text-slate-400">A secondary review rail for slice edits, locks, and visibility.</p>
        <div className="text-[11px] text-slate-500">
          {lastAppliedAt ? `Applied state carried forward ${new Date(lastAppliedAt).toLocaleTimeString()}` : 'No applied state yet'}
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Slices {sliceStats.total}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Visible {sliceStats.visible}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Locked {sliceStats.locked}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Burst {sliceStats.burst}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Mode {mode}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Status {generationStatus}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-0.5">Draft bins {pendingGeneratedBins.length}</span>
        </div>

        {activeWindowLabel ? (
          <div className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-300">
            <div className="uppercase tracking-[0.24em] text-slate-500">Active window</div>
            <div className="mt-1 font-medium text-slate-100">
              {activeWindowLabel.start} → {activeWindowLabel.end}
            </div>
          </div>
        ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddPointSlice}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Point
            </button>
            <button
              type="button"
              onClick={handleAddRangeSlice}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Range
            </button>
            <button
              type="button"
              onClick={clearSlices}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
        </div>

        <div className="space-y-2">
          {slices.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-sm text-slate-400">
              No slices active. Add a point or range to inspect the demo timeline companion.
            </div>
          ) : (
            slices.map((slice, index) => {
              const fallbackName = slice.type === 'point' ? `Slice ${index + 1}` : `Range ${index + 1}`;

              return (
                <div key={slice.id} className="grid gap-2 rounded-md border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="space-y-2">
                    {slice.isBurst ? (
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1">burst</span>
                      </div>
                    ) : null}

                    <input
                      type="text"
                      value={slice.name ?? ''}
                      onChange={(event) => {
                        const nextName = event.target.value.trim();
                        updateSlice(slice.id, { name: nextName || undefined });
                      }}
                      placeholder={fallbackName}
                      aria-label={`Slice name for ${fallbackName}`}
                      className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100"
                    />

                    <div className="text-xs text-slate-400">{formatSliceLabel(slice, index)}</div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-[11px] text-slate-400">
                        <span>{slice.type === 'range' ? 'Start datetime' : 'Datetime'}</span>
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocalValue(slice.startDateTimeMs ?? null)}
                          onChange={(event) => {
                            updateSlice(slice.id, { startDateTimeMs: parseDateTimeLocalValue(event.target.value) });
                          }}
                          className="border-slate-700 bg-slate-950 text-slate-100"
                        />
                      </label>

                      {slice.type === 'range' ? (
                        <label className="space-y-1 text-[11px] text-slate-400">
                          <span>End datetime</span>
                          <Input
                            type="datetime-local"
                            value={toDateTimeLocalValue(slice.endDateTimeMs ?? null)}
                            onChange={(event) => {
                              updateSlice(slice.id, { endDateTimeMs: parseDateTimeLocalValue(event.target.value) });
                            }}
                            className="border-slate-700 bg-slate-950 text-slate-100"
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleVisibility(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title={slice.isVisible ? 'Hide slice' : 'Show slice'}
                    >
                      {slice.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLock(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title={slice.isLocked ? 'Unlock slice' : 'Lock slice'}
                    >
                      {slice.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlice(slice.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
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
    </div>
  );
}
