'use client';

import { useCallback, useMemo } from 'react';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { computeSliceKde } from '@/lib/kde';
import type { TimeSlice } from '@/store/useSliceDomainStore';
import type { SliceKdeResult } from '@/lib/kde';

export interface DemoComparableSlice {
  id: string;
  label: string;
  startEpoch: number;
  endEpoch: number;
  crimeCount: number;
  burstScore: number;
}

export interface DemoCompareData {
  comparableSlices: DemoComparableSlice[];
  leftId: string | null;
  rightId: string | null;
  leftSlice: DemoComparableSlice | null;
  rightSlice: DemoComparableSlice | null;
  leftKde: SliceKdeResult | undefined;
  rightKde: SliceKdeResult | undefined;
  leftIsLoading: boolean;
  rightIsLoading: boolean;
  leftDuration: number;
  rightDuration: number;
  leftBurstPercent: number;
  rightBurstPercent: number;
  leftCellCount: number;
  rightCellCount: number;
  setLeft: (id: string | null) => void;
  setRight: (id: string | null) => void;
  swap: () => void;
  clear: () => void;
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

function normalizeBurstPercent(score: number): number {
  return score > 1 ? score : score * 100;
}

export function useDemoCompareData(): DemoCompareData {
  const slices = useSliceDomainStore((state) => state.slices);
  const minTimestampSec = useTimelineDataStore((s) => s.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((s) => s.maxTimestampSec);
  const sliceCrimeCounts = useDashboardDemoCoordinationStore((s) => s.sliceCrimeCounts);

  const comparisonSliceIds = useDashboardDemoCoordinationStore((s) => s.comparisonSliceIds);
  const setComparisonSliceId = useDashboardDemoCoordinationStore((s) => s.setComparisonSliceId);
  const swapComparisonSlices = useDashboardDemoCoordinationStore((s) => s.swapComparisonSlices);
  const clearComparisonSlices = useDashboardDemoCoordinationStore((s) => s.clearComparisonSlices);

  const comparableSlices = useMemo<DemoComparableSlice[]>(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return [];

    return slices
      .filter((slice) => slice.isVisible && slice.type === 'range')
      .map((slice) => {
        const [startEpoch, endEpoch] = resolveSliceEpochRange(slice, minTimestampSec, maxTimestampSec);
        return {
          id: slice.id,
          label: slice.name || `Slice`,
          startEpoch,
          endEpoch,
          crimeCount: sliceCrimeCounts[slice.id] ?? 0,
          burstScore: slice.burstScore ?? 0,
        };
      })
      .sort((left, right) => left.startEpoch - right.startEpoch);
  }, [slices, minTimestampSec, maxTimestampSec, sliceCrimeCounts]);

  const comparisonById = useMemo(() => {
    const map = new Map<string, DemoComparableSlice>();
    for (const s of comparableSlices) map.set(s.id, s);
    return map;
  }, [comparableSlices]);

  const leftId = comparisonSliceIds.left;
  const rightId = comparisonSliceIds.right;
  const leftSlice = leftId ? comparisonById.get(leftId) ?? null : null;
  const rightSlice = rightId ? comparisonById.get(rightId) ?? null : null;

  const leftCrimeData = useCrimeData({
    startEpoch: leftSlice?.startEpoch ?? 0,
    endEpoch: leftSlice?.endEpoch ?? 0,
    bufferDays: 0,
    limit: 50000,
  });
  const rightCrimeData = useCrimeData({
    startEpoch: rightSlice?.startEpoch ?? 0,
    endEpoch: rightSlice?.endEpoch ?? 0,
    bufferDays: 0,
    limit: 50000,
  });

  const leftKde = useMemo(
    () => (leftCrimeData.data.length > 0 ? computeSliceKde(leftCrimeData.data) : undefined),
    [leftCrimeData.data],
  );
  const rightKde = useMemo(
    () => (rightCrimeData.data.length > 0 ? computeSliceKde(rightCrimeData.data) : undefined),
    [rightCrimeData.data],
  );

  const setLeft = useCallback(
    (id: string | null) => setComparisonSliceId('left', id),
    [setComparisonSliceId],
  );
  const setRight = useCallback(
    (id: string | null) => setComparisonSliceId('right', id),
    [setComparisonSliceId],
  );

  const leftDuration = leftSlice ? Math.max(0, leftSlice.endEpoch - leftSlice.startEpoch) : 0;
  const rightDuration = rightSlice ? Math.max(0, rightSlice.endEpoch - rightSlice.startEpoch) : 0;
  const leftBurstPercent = leftSlice ? normalizeBurstPercent(leftSlice.burstScore) : 0;
  const rightBurstPercent = rightSlice ? normalizeBurstPercent(rightSlice.burstScore) : 0;
  const leftCellCount = leftKde?.cells.length ?? 0;
  const rightCellCount = rightKde?.cells.length ?? 0;

  return {
    comparableSlices,
    leftId,
    rightId,
    leftSlice,
    rightSlice,
    leftKde,
    rightKde,
    leftIsLoading: leftCrimeData.isLoading,
    rightIsLoading: rightCrimeData.isLoading,
    leftDuration,
    rightDuration,
    leftBurstPercent,
    rightBurstPercent,
    leftCellCount,
    rightCellCount,
    setLeft,
    setRight,
    swap: swapComparisonSlices,
    clear: clearComparisonSlices,
  };
}
