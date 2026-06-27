'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoFilterStore } from '@/store/useDashboardDemoFilterStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { normalizeTimeRange } from '@/lib/time-range';
import { Stkde3DScene } from '@/app/stkde-3d/components/Stkde3DScene';
import { buildDurationVolumeProfile } from '@/app/stkde-3d/lib/volume-encoding';
import type { KdeCell } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';
import type { TimeSlice } from '@/store/useSliceDomainStore';

interface SceneSlice {
  sourceSliceId: string;
  index: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
  crimeCount: number;
}

function normalizeBurstScore(score: number): number {
  if (!Number.isFinite(score)) return 0;

  const clamped = Math.max(0, score);
  return clamped > 1 ? Math.min(1, clamped / 100) : clamped;
}

const normalizeWarpBlend = (warpFactor: number): number => Math.min(1, Math.max(0, warpFactor / 3));

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

export function Demo3dSpatialView() {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const selectedTimeRange = useDashboardDemoFilterStore((state) => state.selectedTimeRange);
  const stkdeResponse = useDashboardDemoCoordinationStore((state) => state.stkdeResponse);
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const brushRange = useDashboardDemoCoordinationStore((state) => state.brushRange);
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const isScrubbing = useDashboardDemoCoordinationStore((state) => state.inspectIsScrubbing);
  const sliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectSliceOpacity);
  const timeScaleMode = useDashboardDemoCoordinationStore((state) => state.timeScaleMode);
  const warpFactor = useDashboardDemoCoordinationStore((state) => state.warpFactor);
  const warpMap = useDashboardDemoCoordinationStore((state) => state.warpMap);
  const mapDomain = useDashboardDemoCoordinationStore((state) => state.mapDomain);
  const cubeScopeMode = useDashboardDemoCoordinationStore((state) => state.cubeScopeMode);
  const volumeScaleSeconds = useDashboardDemoCoordinationStore((state) => state.volumeScaleSeconds);
  const volumeExaggeration = useDashboardDemoCoordinationStore((state) => state.volumeExaggeration);
  const volumeNormalizationMode = useDashboardDemoCoordinationStore((state) => state.volumeNormalizationMode);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((state) => state.setSliceCrimeCounts);
  const setCrimeFetchStatus = useDashboardDemoCoordinationStore((state) => state.setCrimeFetchStatus);
  const [crimesBySlice, setCrimesBySlice] = useState<CrimeRecord[][]>([]);
  const [crimesError, setCrimesError] = useState<string | null>(null);
  const [sliceKdes, setSliceKdes] = useState<KdeCell[][]>([]);
  const hasLoadedRef = useRef(false);
  const kdeWorkerRef = useRef<Worker | null>(null);
  const kdeRequestIdRef = useRef(0);
  const playbackTimeoutRef = useRef<number | null>(null);

  const orderedSlices = useMemo(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice, originalIndex) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return {
          sourceSliceId: slice.id,
          index: originalIndex,
          label: slice.name ?? '',
          startEpoch,
          endEpoch,
          burstScore: normalizeBurstScore(slice.burstScore ?? 0),
          crimeCount: 0,
        } satisfies SceneSlice;
      })
      .sort((left, right) => {
        const startDelta = left.startEpoch - right.startEpoch;
        if (startDelta !== 0) return startDelta;
        const endDelta = left.endEpoch - right.endEpoch;
        if (endDelta !== 0) return endDelta;
        return left.sourceSliceId.localeCompare(right.sourceSliceId);
      })
      .map((slice, index) => ({
        ...slice,
        index,
        label: slice.label || `Slice ${index + 1}`,
      }));
  }, [slices, minTimestampSec, maxTimestampSec]);

  useEffect(() => {
    if (orderedSlices.length === 0) {
      return;
    }

    let cancelled = false;

    setCrimeFetchStatus('loading');

    (async () => {
      const results: CrimeRecord[][] = [];

      for (const slice of orderedSlices) {
        if (cancelled) return;

        const params = new URLSearchParams({
          startEpoch: Math.floor(slice.startEpoch).toString(),
          endEpoch: Math.ceil(slice.endEpoch).toString(),
          bufferDays: '0',
          pageSize: '50000',
        });

        try {
          const res = await fetch(`/api/crimes/range?${params.toString()}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const result = (await res.json()) as { data?: CrimeRecord[] };
          const crimeBatch = result.data ?? [];
          console.debug(`[3DFetch] slice ${slice.label}: fetched ${crimeBatch.length} crimes`);
          if (crimeBatch.length > 0) {
            console.debug(`[3DFetch]  first crime x=${crimeBatch[0]!.x.toFixed(2)} z=${crimeBatch[0]!.z.toFixed(2)}`);
          }
          results.push(crimeBatch);

          if (!cancelled) {
            setSliceCrimeCounts(
              orderedSlices.reduce((acc, s, i) => {
                acc[s.sourceSliceId] = (results[i] ?? []).length;
                return acc;
              }, {} as Record<string, number>),
            );
          }
        } catch (err) {
          if (!cancelled) {
            setCrimesError(err instanceof Error ? err.message : 'Fetch failed');
            results.push([]);
          }
        }
      }

      if (!cancelled) {
        setCrimesBySlice(results);
        setCrimesError(null);
        setCrimeFetchStatus('success');
      }
    })();

    return () => { cancelled = true; };
  }, [orderedSlices, setCrimeFetchStatus, setSliceCrimeCounts]);

  const countedSlices = useMemo(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      return orderedSlices;
    }
    return orderedSlices.map((slice, i) => ({
      ...slice,
      crimeCount: (crimesBySlice[i] ?? []).length,
    }));
  }, [crimesBySlice, orderedSlices]);

  const fullTimeDomain = useMemo<[number, number]>(() => (
    Number.isFinite(viewportStart) && Number.isFinite(viewportEnd) && viewportEnd > viewportStart
      ? [viewportStart, viewportEnd]
      : [0, 1]
  ), [viewportEnd, viewportStart]);

  const brushedTimeDomain = useMemo<[number, number]>(() => {
    if (
      brushRange &&
      minTimestampSec !== null &&
      maxTimestampSec !== null &&
      maxTimestampSec > minTimestampSec
    ) {
      const [start, end] = brushRange;
      const brushedStart = normalizedToEpochSeconds(start, minTimestampSec, maxTimestampSec);
      const brushedEnd = normalizedToEpochSeconds(end, minTimestampSec, maxTimestampSec);
      if (Number.isFinite(brushedStart) && Number.isFinite(brushedEnd) && brushedEnd > brushedStart) {
        return [brushedStart, brushedEnd];
      }
    }

    if (slices.length > 0) {
      const appliedSlices = slices.filter((s) => s.source === 'generated-applied' && s.isVisible);
      if (appliedSlices.length > 0) {
        let minStart = Infinity;
        let maxEnd = -Infinity;
        for (const s of appliedSlices) {
          const [startSec, endSec] = resolveSliceEpochRange(s, minTimestampSec ?? 0, maxTimestampSec ?? 0);
          if (Number.isFinite(startSec) && startSec < minStart) minStart = startSec;
          if (Number.isFinite(endSec) && endSec > maxEnd) maxEnd = endSec;
        }
        if (Number.isFinite(minStart) && Number.isFinite(maxEnd) && maxEnd > minStart) {
          return [minStart, maxEnd];
        }
      }
    }

    const normalized = normalizeTimeRange(selectedTimeRange);
    return normalized && normalized[1] > normalized[0] ? normalized : fullTimeDomain;
  }, [brushRange, fullTimeDomain, maxTimestampSec, minTimestampSec, selectedTimeRange, slices]);

  const cubeTimeDomain = cubeScopeMode === 'brushed' ? brushedTimeDomain : fullTimeDomain;
  console.log('[CubeScope] cubeScopeMode:', cubeScopeMode, 'cubeTimeDomain:', cubeTimeDomain, 'brushedTimeDomain:', brushedTimeDomain, 'fullTimeDomain:', fullTimeDomain);

  const mapWarpDomain = useMemo<[number, number]>(() => (
    mapDomain[1] > mapDomain[0] ? mapDomain : cubeTimeDomain
  ), [cubeTimeDomain, mapDomain]);

  const volumeProfile = useMemo(
    () => buildDurationVolumeProfile(countedSlices, {
      scaleSeconds: volumeScaleSeconds,
      exaggeration: volumeExaggeration,
      normalizationMode: volumeNormalizationMode,
      timeScaleMode,
      warpBlend: normalizeWarpBlend(warpFactor),
      warpMap,
      warpDomain: mapWarpDomain,
    }),
    [countedSlices, mapWarpDomain, volumeScaleSeconds, volumeExaggeration, volumeNormalizationMode, timeScaleMode, warpFactor, warpMap],
  );

  const cubeSlices = useMemo(() => {
    const result = cubeScopeMode !== 'brushed'
      ? countedSlices
      : (() => {
          const [scopeStart, scopeEnd] = cubeTimeDomain;
          return countedSlices.filter((slice) => slice.endEpoch >= scopeStart && slice.startEpoch <= scopeEnd);
        })();
    console.log('[CubeScope] cubeSlices:', result.length, 'countedSlices:', countedSlices.length, 'mode:', cubeScopeMode);
    return result;
  }, [countedSlices, cubeScopeMode, cubeTimeDomain]);

  const cubeSliceKdes = useMemo(() => {
    if (cubeScopeMode !== 'brushed') {
      return sliceKdes;
    }

    const visibleIndexes = new Set(
      cubeSlices.map((slice) => countedSlices.findIndex((candidate) => candidate.sourceSliceId === slice.sourceSliceId)),
    );

    return sliceKdes.filter((_, index) => visibleIndexes.has(index));
  }, [countedSlices, cubeScopeMode, cubeSlices, sliceKdes]);

  const cubeVolumeProfile = useMemo(() => {
    if (cubeScopeMode !== 'brushed') {
      console.log('[CubeScope] cubeVolumeProfile: full mode, using volumeProfile with', volumeProfile.length, 'entries');
      return volumeProfile;
    }

    const result = buildDurationVolumeProfile(cubeSlices, {
      scaleSeconds: volumeScaleSeconds,
      exaggeration: volumeExaggeration,
      normalizationMode: volumeNormalizationMode,
      timeScaleMode,
      warpBlend: normalizeWarpBlend(warpFactor),
      warpMap,
      warpDomain: cubeTimeDomain,
    });
    console.log('[CubeScope] cubeVolumeProfile: brushed mode, recomputed with cubeTimeDomain:', cubeTimeDomain, 'entries:', result.length);
    return result;
  }, [cubeSlices, cubeScopeMode, cubeTimeDomain, volumeScaleSeconds, volumeExaggeration, volumeNormalizationMode, timeScaleMode, warpFactor, warpMap, volumeProfile]);

  const cubeActiveIndex = useMemo(() => {
    if (cubeSlices.length === 0) {
      return -1;
    }

    const activeSliceId = countedSlices[activeIndex]?.sourceSliceId;
    if (!activeSliceId) {
      return Math.min(activeIndex, cubeSlices.length - 1);
    }

    const nextIndex = cubeSlices.findIndex((slice) => slice.sourceSliceId === activeSliceId);
    return nextIndex;
  }, [activeIndex, countedSlices, cubeSlices]);

  useEffect(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      return;
    }

    let cancelled = false;
    const requestId = ++kdeRequestIdRef.current;

    if (!kdeWorkerRef.current) {
      kdeWorkerRef.current = new Worker(
        new URL('../../workers/kdeSlice.worker.ts', import.meta.url),
      );
    }

    const worker = kdeWorkerRef.current;

    const handler = (event: MessageEvent) => {
      const response = event.data as { requestId: number; results: Array<{ cells: Float32Array; maxIntensity: number; meanIntensity: number; cellCount: number }> };
      if (response.requestId !== requestId) return;

      const kdes: KdeCell[][] = response.results.map((r) => {
        const cells: KdeCell[] = [];
        const flat = r.cells;
        for (let i = 0; i < r.cellCount; i++) {
          cells.push({
            x: flat[i * 4],
            z: flat[i * 4 + 1],
            intensity: flat[i * 4 + 2],
            support: flat[i * 4 + 3],
          });
        }
        return cells;
      });

      if (!cancelled) {
        setSliceKdes(kdes);
      }
    };

    worker.addEventListener('message', handler);

    worker.postMessage({
      requestId,
      sliceGroups: crimesBySlice.map((sliceCrimes) => ({
        points: sliceCrimes.map((c) => ({ x: c.x, z: c.z })),
      })),
    });

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handler);
    };
  }, [crimesBySlice, orderedSlices]);

  useEffect(() => {
    return () => {
      kdeWorkerRef.current?.terminate();
      kdeWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (countedSlices.length === 0) return;
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    } else if (activeIndex >= countedSlices.length) {
      setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
    }
  }, [countedSlices.length, activeIndex, setActiveSliceIndex]);

  useEffect(() => {
    if (playbackTimeoutRef.current !== null) {
      window.clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }

    if (!isPlaying || isScrubbing || countedSlices.length === 0) return undefined;

    const lastIndex = countedSlices.length - 1;
    const stepDelay = Math.max(180, Math.round(1000 / Math.max(0.25, playbackSpeed)));
    const loopPauseMs = 260;
    const delay = activeIndex >= lastIndex ? loopPauseMs : stepDelay;

    playbackTimeoutRef.current = window.setTimeout(() => {
      playbackTimeoutRef.current = null;

      if (countedSlices.length === 0) return;
      if (activeIndex >= countedSlices.length - 1) {
        setActiveSliceIndex(0);
        return;
      }

      setActiveSliceIndex(activeIndex + 1);
    }, delay);

    return () => {
      if (playbackTimeoutRef.current !== null) {
        window.clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
      }
    };
  }, [activeIndex, countedSlices.length, isPlaying, isScrubbing, playbackSpeed, setActiveSliceIndex]);

  if (orderedSlices.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Apply generated slices to view 3D spatial distribution
        </p>
      </div>
    );
  }

  console.log('[CubeScope] rendering Stkde3DScene — slices:', cubeSlices.length, 'volumeProfile:', cubeVolumeProfile.length, 'timeDomain:', cubeTimeDomain, 'activeIndex:', cubeActiveIndex);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      {crimesError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
          <p className="text-xs text-destructive">Error: {crimesError}</p>
        </div>
      )}

      <Stkde3DScene
        slices={cubeSlices}
        sliceKdes={cubeSliceKdes}
        volumeProfile={cubeVolumeProfile}
        hotspotSliceResults={stkdeResponse?.sliceResults ?? null}
        activeIndex={cubeActiveIndex}
        viewMode={viewMode}
        sliceOpacity={sliceOpacity}
        timeDomain={cubeTimeDomain}
      />
    </div>
  );
}
