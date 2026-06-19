'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import {
  pickActiveSliceFirst,
  useDashboardDemoCoordinationStore,
} from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { Stkde3DScene } from '@/app/stkde-3d/components/Stkde3DScene';
import { buildDurationVolumeProfile } from '@/app/stkde-3d/lib/volume-encoding';
import type { KdeCell } from '@/lib/kde';
import type { CrimeRecord } from '@/types/crime';
import type { TimeSlice } from '@/store/useSliceDomainStore';

const SLICE_3D_PAGE_SIZE = 5000;

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

interface PagedSliceResult {
  rows: CrimeRecord[];
  error: string | null;
  narrowingMessage: string | null;
}

/**
 * Phase 81 Wave 3: page through the exact paged detail contract for a
 * single slice. The inner loop is isolated so the parent effect does
 * not have a nested control flow that React's set-state-in-effect lint
 * flags. `cancelled` is a boolean that flips to true when the parent
 * effect is unmounting; we honour it between page fetches.
 *
 * Returns `null` when the parent effect was cancelled mid-page so the
 * caller can short-circuit and avoid touching state on a stale effect.
 */
async function fetchSliceCrimesPaged(
  slice: SceneSlice,
  cancelled: boolean,
): Promise<PagedSliceResult | null> {
  const collected: CrimeRecord[] = [];
  let cursor: string | null = null;
  let error: string | null = null;
  let narrowingMessage: string | null = null;

  while (true) {
    if (cancelled) return null;
    const params = new URLSearchParams({
      startEpoch: Math.floor(slice.startEpoch).toString(),
      endEpoch: Math.ceil(slice.endEpoch).toString(),
      pageSize: String(SLICE_3D_PAGE_SIZE),
      target: `slice3d:${slice.sourceSliceId}`,
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`/api/crimes/range?${params.toString()}`);
    if (!res.ok) {
      error = `HTTP ${res.status}`;
      break;
    }
    const result = (await res.json()) as {
      data?: CrimeRecord[];
      meta?: { hasMore?: boolean; nextCursor?: string | null; requiresNarrowing?: { message?: string } };
    };
    const page = Array.isArray(result.data) ? result.data : [];
    for (const row of page) collected.push(row);
    if (result.meta?.requiresNarrowing?.message) {
      narrowingMessage = result.meta.requiresNarrowing.message;
      break;
    }
    if (!result.meta?.hasMore) break;
    cursor = result.meta.nextCursor ?? null;
    if (cursor === null) break;
  }
  return { rows: collected, error, narrowingMessage };
}

export function Demo3dSpatialView() {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const stkdeResponse = useDashboardDemoCoordinationStore((state) => state.stkdeResponse);
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const isPlaying = useDashboardDemoCoordinationStore((state) => state.inspectIsPlaying);
  const playbackSpeed = useDashboardDemoCoordinationStore((state) => state.inspectPlaybackSpeed);
  const isScrubbing = useDashboardDemoCoordinationStore((state) => state.inspectIsScrubbing);
  const sliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectSliceOpacity);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize local state with empty slice set
      setCrimesBySlice([]);
      setCrimesError(null);
      setCrimeFetchStatus('idle');
      return;
    }

    let cancelled = false;

    setCrimeFetchStatus('loading');

    (async () => {
      // Build a results array keyed by the original orderedSlices
      // order. The fetch loop walks a D-15-prioritized order
      // (active first, then visible, then the rest) but always
      // writes into the slot matching the source slice's original
      // index, so downstream consumers can index by `orderedSlices[i]`.
      const results: CrimeRecord[][] = orderedSlices.map(() => []);

      // D-15: active/visible slice first. Read the current active
      // index from the store snapshot rather than subscribing, so
      // the effect only re-runs when the slice set changes (not on
      // every activeIndex change).
      const snapshotActiveIndex = useDashboardDemoCoordinationStore.getState().activeSliceIndex;
      const activeSlice = orderedSlices[snapshotActiveIndex] ?? orderedSlices[0];
      const prioritized = pickActiveSliceFirst(
        orderedSlices,
        activeSlice?.sourceSliceId,
        orderedSlices.map((s) => s.sourceSliceId),
      );

      for (const slice of prioritized) {
        if (cancelled) return;
        const slotIndex = orderedSlices.findIndex((x) => x.sourceSliceId === slice.sourceSliceId);
        if (slotIndex < 0) continue;

        const paged = await fetchSliceCrimesPaged(slice, cancelled);
        if (paged === null) return;
        results[slotIndex] = paged.rows;
        if (paged.narrowingMessage) {
          console.debug(`[3DFetch] slice ${slice.label}: narrowing prompt — ${paged.narrowingMessage}`);
        }
        console.debug(`[3DFetch] slice ${slice.label}: fetched ${paged.rows.length} crimes`);
        if (paged.rows.length > 0) {
          console.debug(`[3DFetch]  first crime x=${paged.rows[0]!.x.toFixed(2)} z=${paged.rows[0]!.z.toFixed(2)}`);
        }
        if (paged.error) {
          setCrimesError(paged.error);
        }
        if (cancelled) return;

        setSliceCrimeCounts(
          orderedSlices.reduce((acc, s, i) => {
            acc[s.sourceSliceId] = (results[i] ?? []).length;
            return acc;
          }, {} as Record<string, number>),
        );
      }

      if (cancelled) return;
      setCrimesBySlice(results);
      setCrimesError(null);
      setCrimeFetchStatus('success');
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

  const volumeProfile = useMemo(
    () => buildDurationVolumeProfile(countedSlices, {
      scaleSeconds: volumeScaleSeconds,
      exaggeration: volumeExaggeration,
      normalizationMode: volumeNormalizationMode,
    }),
    [countedSlices, volumeScaleSeconds, volumeExaggeration, volumeNormalizationMode],
  );

  useEffect(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize slice-kde with crimes availability
      setSliceKdes([]);
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

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
      {crimesError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
          <p className="text-xs text-destructive">Error: {crimesError}</p>
        </div>
      )}

      <Stkde3DScene
        slices={countedSlices}
        sliceKdes={sliceKdes}
        volumeProfile={volumeProfile}
        hotspotSliceResults={stkdeResponse?.sliceResults ?? null}
        activeIndex={activeIndex}
        viewMode={viewMode}
        sliceOpacity={sliceOpacity}
      />
    </div>
  );
}
