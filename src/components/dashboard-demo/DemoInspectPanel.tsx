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
            <div className="h-8 w-20 rounded-lg bg-slate-800/80" />
            <div className="h-8 w-16 rounded-lg bg-slate-800/80" />
            <div className="ml-auto h-7 w-16 rounded-lg bg-slate-800/80" />
          </div>

          <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-2.5 w-24 rounded-full bg-slate-800/80" />
                <div className="h-3 w-32 rounded-full bg-slate-800/60" />
              </div>
              <div className="h-3 w-28 rounded-full bg-slate-800/60" />
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="h-3 w-32 rounded-full bg-slate-800/60" />
              <div className="h-3 w-40 rounded-full bg-slate-800/60" />
            </div>
          </div>
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
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((s) => s.setSliceCrimeCounts);
  const setCrimeFetchStatus = useDashboardDemoCoordinationStore((s) => s.setCrimeFetchStatus);

  const visibleSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice, originalIndex) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        const rawBurstScore = slice.burstScore ?? 0;
        return {
          index: originalIndex,
          label: slice.name || `Slice ${originalIndex + 1}`,
          startEpoch,
          endEpoch,
          burstScore: rawBurstScore > 1 ? rawBurstScore / 100 : rawBurstScore,
          burstiness: slice.burstinessCoefficient ?? null,
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

  const hasZeroCountSlices = visibleSlices.some((s) => s.crimeCount === 0);

  const isFocusedView = viewMode === 'focus';
  const hasDefaultedFocusRef = useRef(false);

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
          <CardTitle className="text-sm">{activeEvolvingSlice?.label ?? 'Inspect applied slices'}</CardTitle>
          <CardDescription className="text-xs leading-snug">
            {crimeFetchStatus === 'idle' && (
              <span className="text-amber-400">
                crime data not loaded
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-amber-300">Load</button>
              </span>
            )}
            {crimeFetchStatus === 'loading' && <span className="text-muted-foreground">loading crime data...</span>}
            {crimeFetchStatus === 'error' && (
              <span className="text-destructive">
                crime fetch failed
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-red-300">Retry</button>
              </span>
            )}
            {crimeFetchStatus === 'success' && hasZeroCountSlices && (
              <span className="text-amber-400">
                0-count slice
                <button type="button" onClick={handleRefetchCrimeCounts} className="ml-1 underline hover:text-amber-300">Recalc</button>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
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
                  <span>Slice emphasis</span>
                  <span className="font-mono text-muted-foreground/80">×{sliceOpacity.toFixed(2)}</span>
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
                  burstiness={activeEvolvingSlice?.burstiness ?? null}
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
