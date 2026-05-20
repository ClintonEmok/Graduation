'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { computeSliceKde } from '@/lib/kde';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { Stkde3DScene } from '@/app/stkde-3d/components/Stkde3DScene';
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
  const activeIndex = useDashboardDemoCoordinationStore((state) => state.activeSliceIndex);
  const viewMode = useDashboardDemoCoordinationStore((state) => state.viewMode);
  const sliceOpacity = useDashboardDemoCoordinationStore((state) => state.inspectSliceOpacity);
  const setActiveSliceIndex = useDashboardDemoCoordinationStore((state) => state.setActiveSliceIndex);
  const setSliceCrimeCounts = useDashboardDemoCoordinationStore((state) => state.setSliceCrimeCounts);
  const setCrimeFetchStatus = useDashboardDemoCoordinationStore((state) => state.setCrimeFetchStatus);
  const [crimesBySlice, setCrimesBySlice] = useState<CrimeRecord[][]>([]);
  const [crimesError, setCrimesError] = useState<string | null>(null);

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
          burstScore: slice.burstScore ?? 0,
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
      setCrimesBySlice([]);
      setCrimesError(null);
      setCrimeFetchStatus('idle');
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
          limit: '50000',
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

  const { sliceKdes, countedSlices } = useMemo(() => {
    if (crimesBySlice.length === 0 || orderedSlices.length === 0) {
      return { sliceKdes: [] as KdeCell[][], countedSlices: orderedSlices };
    }

    const updated = orderedSlices.map((slice, i) => {
      const sliceCrimes = crimesBySlice[i] ?? [];
      return {
        ...slice,
        crimeCount: sliceCrimes.length,
      };
    });

    const kdes = crimesBySlice.map((sliceCrimes, i) => {
      const tag = orderedSlices[i]?.label ?? i;
      if (sliceCrimes.length === 0) {
        console.debug(`[KDE] slice ${tag}: 0 events → no KDE`);
        return [];
      }
      const pts = sliceCrimes.map((c) => ({ x: c.x, z: c.z }));
      console.debug(`[KDE] slice ${tag}: ${pts.length} events, sample xz:`, pts[0]);
      const result = computeSliceKde(pts);
      console.debug(`[KDE] slice ${tag}: ${result.cells.length} cells, max=${result.maxIntensity.toFixed(1)}`);
      return result.cells;
    });

    return { sliceKdes: kdes, countedSlices: updated };
  }, [crimesBySlice, orderedSlices]);

  useEffect(() => {
    setActiveSliceIndex(Math.max(0, countedSlices.length - 1));
  }, [countedSlices.length, setActiveSliceIndex]);

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
        activeIndex={activeIndex}
        viewMode={viewMode}
        sliceOpacity={sliceOpacity}
      />
    </div>
  );
}
