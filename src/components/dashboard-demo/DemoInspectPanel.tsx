"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Focus, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { computeSliceKde } from '@/lib/kde';
import { SliceScrubber } from '@/app/stkde-3d/components/SliceScrubber';
import { SliceInspector } from '@/app/stkde-3d/components/SliceInspector';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import type { CrimeRecord } from '@/types/crime';

function resolveSliceEpochRange(
  slice: TimeSlice,
  minTimestampSec: number,
  maxTimestampSec: number,
): [number, number] {
  if (slice.startDateTimeMs !== undefined || slice.endDateTimeMs !== undefined) {
    const startMs = slice.startDateTimeMs ?? slice.endDateTimeMs ?? 0;
    const endMs = slice.endDateTimeMs ?? slice.startDateTimeMs ?? startMs;
    const start = startMs / 1000;
    const end = endMs / 1000;
    return start <= end ? [start, end] : [end, start];
  }

  if (slice.type === 'range' && slice.range) {
    const start = normalizedToEpochSeconds(slice.range[0], minTimestampSec, maxTimestampSec);
    const end = normalizedToEpochSeconds(slice.range[1], minTimestampSec, maxTimestampSec);
    return start <= end ? [start, end] : [end, start];
  }

  const time = normalizedToEpochSeconds(slice.time, minTimestampSec, maxTimestampSec);
  return [time, time];
}

function formatComparisonSpan(seconds: number): string {
  const absolute = Math.abs(seconds);

  if (absolute >= 86_400) {
    const days = absolute / 86_400;
    return `${days >= 10 ? Math.round(days) : days.toFixed(1)} days`;
  }

  if (absolute >= 3_600) {
    const hours = absolute / 3_600;
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hours`;
  }

  if (absolute >= 60) {
    const minutes = absolute / 60;
    return `${minutes >= 10 ? Math.round(minutes) : minutes.toFixed(1)} minutes`;
  }

  return `${Math.round(absolute)} seconds`;
}

function formatBurstPercent(score: number): string {
  const percent = score > 1 ? score : score * 100;
  return `${Math.round(percent)}%`;
}

function normalizeBurstPercent(score: number): number {
  return score > 1 ? score : score * 100;
}

function normalizeBurstScore(score: number): number {
  return score > 1 ? score / 100 : score;
}

type InspectSliceSummary = {
  label: string;
  crimeCount: number;
};

type InspectComparisonMetric = {
  label: string;
  value: string;
};

function ComparisonSlotCard({
  label,
  slice,
  emptyText,
}: {
  label: string;
  slice: InspectSliceSummary | null;
  emptyText: string;
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-background/60 p-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-50">{slice?.label ?? 'Empty'}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {slice ? `${slice.crimeCount.toLocaleString()} events` : emptyText}
      </p>
    </article>
  );
}

function ComparisonMetricCard({ label, value }: InspectComparisonMetric) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-slate-50">{value}</p>
    </div>
  );
}

function InspectLoadingSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-sm shadow-slate-950/20 backdrop-blur-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded-full bg-slate-800/80" />
          <div className="h-4 w-40 rounded-full bg-slate-800/80" />
          <div className="h-3 w-56 rounded-full bg-slate-800/60" />
        </div>
        <div className="h-9 w-20 rounded-full bg-slate-800/80" />
      </header>

      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-slate-800/80" />
              <div className="h-4 w-36 rounded-full bg-slate-800/80" />
              <div className="h-3 w-44 rounded-full bg-slate-800/60" />
            </div>
            <div className="h-10 w-16 rounded-xl bg-slate-800/80" />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <div className="h-8 w-28 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-20 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-20 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="h-20 rounded-xl bg-slate-800/60" />
            <div className="h-20 rounded-xl bg-slate-800/60" />
          </div>

          <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-2.5 w-24 rounded-full bg-slate-800/80" />
                <div className="h-3 w-32 rounded-full bg-slate-800/60" />
              </div>
              <div className="h-3 w-28 rounded-full bg-slate-800/60" />
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-16 rounded-xl bg-slate-800/60" />
              <div className="h-16 rounded-xl bg-slate-800/60" />
              <div className="h-16 rounded-xl bg-slate-800/60" />
              <div className="h-16 rounded-xl bg-slate-800/60" />
            </div>
            <div className="mt-2.5 h-3 w-64 rounded-full bg-slate-800/60" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
            <div className="ml-auto h-7 w-20 rounded-lg bg-slate-800/80" />
          </div>
          <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-2.5">
            <div className="h-2.5 w-24 rounded-full bg-slate-800/80" />
            <div className="mt-2.5 h-2.5 w-full rounded-full bg-slate-800/80" />
          </div>
          <div className="mt-3 h-48 rounded-xl border border-slate-800/70 bg-slate-950/70" />
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-2.5">
          <div className="h-5 w-28 rounded-full bg-slate-800/80" />
          <div className="mt-2.5 h-40 rounded-xl bg-slate-800/60" />
        </div>
      </div>
    </section>
  );
}

export function DemoInspectPanel() {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((s) => s.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((s) => s.maxTimestampSec);

  const activeIndex = useDashboardDemoCoordinationStore((s) => s.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((s) => s.viewMode);
  const isPlaying = useDashboardDemoCoordinationStore((s) => s.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((s) => s.inspectPlaybackSpeed);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((s) => s.setActiveSliceIndex);
  const setViewMode = useDashboardDemoCoordinationStore((s) => s.setViewMode);
  const setInspectIsPlaying = useDashboardDemoCoordinationStore((s) => s.setInspectIsPlaying);
  const togglePlayback = useDashboardDemoCoordinationStore((s) => s.toggleInspectPlayback);
  const setPlaybackSpeed = useDashboardDemoCoordinationStore((s) => s.setInspectPlaybackSpeed);
  const sliceOpacity = useDashboardDemoCoordinationStore((s) => s.inspectSliceOpacity);
  const setSliceOpacity = useDashboardDemoCoordinationStore((s) => s.setInspectSliceOpacity);
  const sliceCrimeCounts = useDashboardDemoCoordinationStore((s) => s.sliceCrimeCounts);
  const crimeFetchStatus = useDashboardDemoCoordinationStore((s) => s.crimeFetchStatus);
  const comparisonSliceIds = useDashboardDemoCoordinationStore((s) => s.comparisonSliceIds);
  const comparisonSelectionOrder = useDashboardDemoCoordinationStore((s) => s.comparisonSelectionOrder);
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((s) => s.setSliceCrimeCounts);
  const setCrimeFetchStatus = useDashboardDemoCoordinationStore((s) => s.setCrimeFetchStatus);
  const setComparisonSliceId = useDashboardDemoCoordinationStore((s) => s.setComparisonSliceId);
  const pushComparisonSlice = useDashboardDemoCoordinationStore((s) => s.pushComparisonSlice);
  const swapComparisonSlices = useDashboardDemoCoordinationStore((s) => s.swapComparisonSlices);
  const clearComparisonSlices = useDashboardDemoCoordinationStore((s) => s.clearComparisonSlices);

  const visibleSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice, originalIndex) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return {
          index: originalIndex,
          label: slice.name || `Slice ${originalIndex + 1}`,
          startEpoch,
          endEpoch,
          burstScore: normalizeBurstScore(slice.burstScore ?? 0),
          crimeCount: sliceCrimeCounts[slice.id] ?? 0,
          sourceSliceId: slice.id,
        };
      })
      .sort((left, right) => {
        const startDelta = left.startEpoch - right.startEpoch;
        if (startDelta !== 0) return startDelta;
        const endDelta = left.endEpoch - right.endEpoch;
        if (endDelta !== 0) return endDelta;
        return left.label.localeCompare(right.label);
      })
      .map((slice, index) => ({
        ...slice,
        index,
        label: slice.label || `Slice ${index + 1}`,
      }));
  }, [slices, minTimestampSec, maxTimestampSec, sliceCrimeCounts]);

  const isFocusedView = viewMode === 'focus';
  const hasDefaultedFocusRef = useRef(false);

  const hasZeroCountSlices = visibleSlices.some((s) => s.crimeCount === 0);

  useEffect(() => {
    if (visibleSlices.length === 0) {
      hasDefaultedFocusRef.current = false;
      return;
    }

    if (!hasDefaultedFocusRef.current && viewMode !== 'focus') {
      setViewMode('focus');
    }

    hasDefaultedFocusRef.current = true;
  }, [viewMode, visibleSlices.length, setViewMode]);

  const activeEvolvingSlice = visibleSlices[activeIndex] ?? visibleSlices[0] ?? null;
  const activeSliceCrimeData = useCrimeData({
    startEpoch: activeEvolvingSlice?.startEpoch ?? 0,
    endEpoch: activeEvolvingSlice?.endEpoch ?? 0,
    bufferDays: 0,
    limit: 50000,
  });

  const activeSliceKde = useMemo(
    () => (activeSliceCrimeData.data.length > 0 ? computeSliceKde(activeSliceCrimeData.data) : undefined),
    [activeSliceCrimeData.data],
  );

  const comparisonBySliceId = useMemo(() => {
    const entries = visibleSlices.map((slice) => [slice.sourceSliceId, slice] as const);
    return new Map(entries);
  }, [visibleSlices]);

  const comparisonSummary = useMemo(
    () =>
      (['left', 'right'] as const).map((slot) => {
        const sliceId = comparisonSliceIds[slot];
        const slice = sliceId ? comparisonBySliceId.get(sliceId) ?? null : null;

        return {
          slot,
          label: slot === 'left' ? 'Left' : 'Right',
          slice,
        };
      }),
    [comparisonBySliceId, comparisonSliceIds]
  );

  const comparisonSelectionSummary = useMemo(() => {
    if (comparisonSelectionOrder.length === 0) return 'No comparison slices selected';
    return `Selection order: ${comparisonSelectionOrder.join(' → ')}`;
  }, [comparisonSelectionOrder]);

  const comparisonMetrics = useMemo(() => {
    const left = comparisonSummary.find((item) => item.slot === 'left')?.slice ?? null;
    const right = comparisonSummary.find((item) => item.slot === 'right')?.slice ?? null;

    if (!left || !right) return null;

    const leftDuration = Math.max(0, left.endEpoch - left.startEpoch);
    const rightDuration = Math.max(0, right.endEpoch - right.startEpoch);
    const eventDelta = right.crimeCount - left.crimeCount;
     const leftBurstPercent = normalizeBurstPercent(left.burstScore);
     const rightBurstPercent = normalizeBurstPercent(right.burstScore);
     const burstDelta = rightBurstPercent - leftBurstPercent;
     const durationDelta = rightDuration - leftDuration;
    const overlapStart = Math.max(left.startEpoch, right.startEpoch);
    const overlapEnd = Math.min(left.endEpoch, right.endEpoch);
    const overlapSeconds = overlapEnd - overlapStart;

    const timing = overlapSeconds > 0
      ? `Shared window ${formatComparisonSpan(overlapSeconds)}`
      : `${formatComparisonSpan(Math.abs(right.startEpoch - left.endEpoch))} gap between slices`;

    const lead = eventDelta === 0
      ? 'Same event count'
      : `${Math.abs(eventDelta).toLocaleString()} more events on ${eventDelta > 0 ? 'right' : 'left'}`;

    const burst = burstDelta === 0
      ? 'Same burst intensity'
      : `${Math.abs(Math.round(burstDelta))}% higher burst intensity on ${burstDelta > 0 ? 'right' : 'left'}`;

    const duration = durationDelta === 0
      ? 'Same duration'
      : `${formatComparisonSpan(durationDelta)} longer on ${durationDelta > 0 ? 'right' : 'left'}`;

    const ordering = left.startEpoch <= right.startEpoch
      ? `${left.label} starts first`
      : `${right.label} starts first`;

    return [
      { label: 'Event count', value: lead },
      { label: 'Duration', value: duration },
      { label: 'Burst intensity', value: burst },
      { label: 'Timing', value: `${ordering} · ${timing}` },
    ];
  }, [comparisonSummary]);

  const handleCompareActiveSlice = useCallback(() => {
    if (!activeEvolvingSlice) return;
    pushComparisonSlice(activeEvolvingSlice.sourceSliceId);
    setViewMode('focus');
  }, [activeEvolvingSlice, pushComparisonSlice, setViewMode]);

  const handleSetComparisonSlot = useCallback(
    (slot: 'left' | 'right') => {
      if (!activeEvolvingSlice) return;
      setComparisonSliceId(slot, activeEvolvingSlice.sourceSliceId);
      setViewMode('focus');
    },
    [activeEvolvingSlice, setComparisonSliceId, setViewMode]
  );

  const handleRefetchCrimeCounts = useCallback(async () => {
    if (minTimestampSec === null || maxTimestampSec === null) return;

    const storeSlices = useSliceDomainStore.getState().slices;
    const currentMin = useTimelineDataStore.getState().minTimestampSec;
    const currentMax = useTimelineDataStore.getState().maxTimestampSec;
    if (currentMin === null || currentMax === null) return;

    const sliceRows = storeSlices
      .filter((sl) => sl.isVisible && sl.type === 'range')
      .map((sl) => ({
        sourceSliceId: sl.id,
        startEpoch: resolveSliceEpochRange(sl, currentMin, currentMax)[0],
        endEpoch: resolveSliceEpochRange(sl, currentMin, currentMax)[1],
      }));

    if (sliceRows.length === 0) return;

    setCrimeFetchStatus('loading');

    const counts: Record<string, number> = {};
    let totalFetched = 0;

    for (const slice of sliceRows) {
      const params = new URLSearchParams({
        startEpoch: Math.floor(slice.startEpoch).toString(),
        endEpoch: Math.ceil(slice.endEpoch).toString(),
        bufferDays: '0',
        limit: '50000',
      });

      try {
        const res = await fetch(`/api/crimes/range?${params.toString()}`);
        if (!res.ok) continue;
        const result = (await res.json()) as { data?: CrimeRecord[] };
        const crimes = result.data ?? [];
        counts[slice.sourceSliceId] = crimes.length;
        totalFetched += crimes.length;
      } catch {
        counts[slice.sourceSliceId] = 0;
      }
    }

    console.debug('[InspectPanel] Recalc computed counts:', JSON.stringify(counts), 'total:', totalFetched);
    setSliceCrimeCounts(counts);
    setCrimeFetchStatus('success');
  }, [minTimestampSec, maxTimestampSec, setSliceCrimeCounts, setCrimeFetchStatus]);

  useEffect(() => {
    if (isFocusedView) {
      setInspectIsPlaying(false);
    }
  }, [isFocusedView, setInspectIsPlaying]);

  // Bridge: propagate activeSliceIndex → domain store activeSliceId so timeline stays in sync
  useEffect(() => {
    if (visibleSlices.length === 0) return;
    const slice = visibleSlices[activeIndex];
    if (slice?.sourceSliceId) {
      useSliceDomainStore.getState().setActiveSlice(slice.sourceSliceId);
    }
  }, [activeIndex, visibleSlices]);

  useEffect(() => {
    if (!isPlaying || visibleSlices.length === 0) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveSliceIndex((activeIndex + 1) % visibleSlices.length);
    }, Math.max(180, 1000 / playbackSpeed));

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isPlaying, playbackSpeed, visibleSlices, setActiveSliceIndex]);

  useEffect(() => {
    if (visibleSlices.length > 0 && activeIndex >= visibleSlices.length) {
      setActiveSliceIndex(0);
    }
  }, [visibleSlices.length, activeIndex, setActiveSliceIndex]);

  if (visibleSlices.length === 0) {
    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inspect applied slices</CardTitle>
            <CardDescription className="text-xs">
              No applied slices yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-xs text-muted-foreground">
              Review and apply slices in Slices first, then return here to inspect them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Card>
        <CardHeader className="pb-0.5">
          <CardTitle className="text-sm">Inspect applied slices</CardTitle>
          <CardDescription className="text-xs leading-snug">
            {visibleSlices.length} applied slice{visibleSlices.length !== 1 ? 's' : ''} · {isFocusedView ? 'Focus' : 'Stack'} view
            {crimeFetchStatus === 'idle' && (
              <span className="text-amber-400">
                {' · '}crime data not loaded
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-amber-300">Load</button>
              </span>
            )}
            {crimeFetchStatus === 'loading' && <span className="text-muted-foreground"> · loading crime data...</span>}
            {crimeFetchStatus === 'error' && (
              <span className="text-destructive">
                {' · '}crime fetch failed
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-red-300">Retry</button>
              </span>
            )}
            {crimeFetchStatus === 'success' && hasZeroCountSlices && (
              <span className="text-amber-400">
                {' · '}0-count slice
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-amber-300">Recalc</button>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <section className="rounded-md border border-sky-500/15 bg-slate-950/60 p-1.5">
            <header className="flex items-start justify-between gap-1.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300">
                  Active slice
                </div>
                <div className="mt-1 text-sm font-medium text-slate-50">
                  {activeEvolvingSlice?.label ?? 'Active slice'}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {activeEvolvingSlice ? (
                    <>
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(activeEvolvingSlice.startEpoch * 1000))}
                      {' '}to{' '}
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(activeEvolvingSlice.endEpoch * 1000))}
                    </>
                  ) : (
                    'No active slice'
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-300">
                  {(activeEvolvingSlice?.crimeCount ?? 0).toLocaleString()} events
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-sky-200">
                  burst intensity {formatBurstPercent(activeEvolvingSlice?.burstScore ?? 0)}
                </div>
              </div>
            </header>

            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleCompareActiveSlice}
                className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[11px] text-sky-100 transition hover:border-sky-300/60"
              >
                Add to compare
              </button>
              <button
                type="button"
                onClick={() => handleSetComparisonSlot('left')}
                className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:border-sky-400/60 hover:text-sky-100"
              >
                Set left
              </button>
              <button
                type="button"
                onClick={() => handleSetComparisonSlot('right')}
                className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:border-sky-400/60 hover:text-sky-100"
              >
                Set right
              </button>
              <button
                type="button"
                onClick={swapComparisonSlices}
                className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:border-sky-400/60 hover:text-sky-100"
              >
                Swap
              </button>
              <button
                type="button"
                onClick={clearComparisonSlices}
                className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:border-sky-400/60 hover:text-sky-100"
              >
                Clear
              </button>
            </div>

            <div className="mt-2 grid gap-1.5">
              {comparisonSummary.map(({ slot, label, slice }) => (
                <ComparisonSlotCard
                  key={slot}
                  label={label}
                  slice={slice ? { label: slice.label, crimeCount: slice.crimeCount } : null}
                  emptyText="Select a slice to compare"
                />
              ))}
            </div>

            <section className="mt-2 rounded-md border border-sky-500/15 bg-slate-950/60 p-2">
              <header className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300">Comparison overview</div>
                <div className="text-[10px] text-muted-foreground">Pairwise deltas</div>
              </header>

              {comparisonMetrics ? (
                <div className="mt-2 grid gap-1.5">
                  {comparisonMetrics.map((metric) => (
                    <ComparisonMetricCard key={metric.label} {...metric} />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Select both comparison slots to see direct deltas between slices.
                </p>
              )}
            </section>

            <div className="mt-1.5 text-[10px] text-muted-foreground">
              {comparisonSelectionSummary}
            </div>
          </section>

          {crimeFetchStatus === 'loading' ? (
            <InspectLoadingSkeleton />
          ) : (
            <>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:border-sky-400/60 hover:text-sky-100"
                >
                  {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  type="button"
                  aria-pressed={isFocusedView}
                  onClick={() => {
                    const nextView = isFocusedView ? 'stack' : 'focus';
                    setViewMode(nextView);
                  }}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                    isFocusedView
                      ? 'border-sky-400/60 bg-sky-400/10 text-sky-100'
                      : 'border-border bg-muted text-muted-foreground hover:border-sky-400/60 hover:text-sky-100'
                  }`}
                >
                  <Focus className="size-3.5" />
                  {isFocusedView ? 'Single' : 'Stack'}
                </button>

                <select
                  value={playbackSpeed}
                  onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                  className="ml-auto rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground outline-none transition focus:border-sky-400/60"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                  <option value={3}>3.0x</option>
                </select>
              </div>

              <div className="rounded-md border border-border/70 bg-background/60 p-2">
                <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Slice opacity</span>
                  <span className="font-mono text-muted-foreground/80">{sliceOpacity.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.2}
                  max={1.5}
                  step={0.05}
                  value={[sliceOpacity]}
                  onValueChange={([value]) => setSliceOpacity(value ?? 1)}
                />
              </div>

              {isFocusedView && (
                <SliceInspector
                  slice={activeEvolvingSlice}
                  sliceKde={activeSliceKde}
                  isFocusedView={isFocusedView}
                />
              )}

              <SliceScrubber
                slices={visibleSlices}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveSliceIndex}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
