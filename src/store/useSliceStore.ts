import { useEffect, useRef } from 'react';
import { useAdaptiveStore } from './useAdaptiveStore';
import { useDataStore } from './useDataStore';
import { epochSecondsToNormalized, toEpochSeconds } from '../lib/time-domain';
import { useSliceDomainStore } from './useSliceDomainStore';

export type { TimeSlice } from './useSliceDomainStore';

const noNewRootGuard = <T>(store: T): T => store;

export const useSliceStore = noNewRootGuard(useSliceDomainStore);

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const clampNormalized = (value: number): number => Math.min(100, Math.max(0, value));

const toNormalizedStoreRange = (start: number, end: number): [number, number] => {
  const [rawStart, rawEnd] = normalizeRange(start, end);

  if (rawStart >= 0 && rawEnd <= 100) {
    return [rawStart, rawEnd];
  }

  const { minTimestampSec, maxTimestampSec } = useDataStore.getState();
  if (minTimestampSec !== null && maxTimestampSec !== null && maxTimestampSec > minTimestampSec) {
    const startSec = toEpochSeconds(rawStart);
    const endSec = toEpochSeconds(rawEnd);
    const normalizedStart = epochSecondsToNormalized(startSec, minTimestampSec, maxTimestampSec);
    const normalizedEnd = epochSecondsToNormalized(endSec, minTimestampSec, maxTimestampSec);
    return normalizeRange(clampNormalized(normalizedStart), clampNormalized(normalizedEnd));
  }

  const mapDomain = useAdaptiveStore.getState().mapDomain;
  if (mapDomain[1] > mapDomain[0]) {
    const span = mapDomain[1] - mapDomain[0];
    const normalizedStart = ((rawStart - mapDomain[0]) / span) * 100;
    const normalizedEnd = ((rawEnd - mapDomain[0]) / span) * 100;
    return normalizeRange(clampNormalized(normalizedStart), clampNormalized(normalizedEnd));
  }

  return [clampNormalized(rawStart), clampNormalized(rawEnd)];
};

// Auto-create burst slices when burst data becomes available
export const useAutoBurstSlices = (
  burstWindows: { start: number; end: number }[]
) => {
  const addBurstSlice = useSliceStore((state) => state.addBurstSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  const isComputing = useAdaptiveStore((state) => state.isComputing);
  const slices = useSliceStore((state) => state.slices);
  
  // Track which burst window signatures we've already processed to avoid duplicates
  const processedRef = useRef<Set<string>>(new Set());
  
  // Create a signature for a burst window for tracking
  const getWindowSignature = (start: number, end: number) => {
    // Round to avoid floating point precision issues with epoch timestamps
    const precision = 1000; // 3 decimal places
    return `${Math.round(start * precision) / precision}-${Math.round(end * precision) / precision}`;
  };

  useEffect(() => {
    // Only auto-create when:
    // 1. Burst windows exist (computed/available)
    // 2. Not currently computing (avoid creating mid-computation)
    if (!burstWindows.length || isComputing) return;

    // Auto-create burst slices for each burst window
    // addBurstSlice handles reuse if matching slice exists
    burstWindows.forEach((window) => {
      const signature = getWindowSignature(window.start, window.end);
      
      // Skip if we've already processed this window signature
      if (processedRef.current.has(signature)) {
        return;
      }
      
      // Mark as processed before calling to prevent race conditions
      processedRef.current.add(signature);
      
      addBurstSlice({ start: window.start, end: window.end });
    });
  }, [burstWindows, isComputing, addBurstSlice]);

  useEffect(() => {
    const burstSlicesNeedingNormalization = slices.filter(
      (slice) =>
        slice.isBurst &&
        slice.type === 'range' &&
        !!slice.range &&
        (slice.range[0] < 0 || slice.range[0] > 100 || slice.range[1] < 0 || slice.range[1] > 100)
    );

    if (burstSlicesNeedingNormalization.length === 0) {
      return;
    }

    burstSlicesNeedingNormalization.forEach((slice) => {
      if (!slice.range) return;
      const [normalizedStart, normalizedEnd] = toNormalizedStoreRange(slice.range[0], slice.range[1]);
      updateSlice(slice.id, {
        range: [normalizedStart, normalizedEnd],
        time: (normalizedStart + normalizedEnd) / 2,
      });
    });
  }, [slices, updateSlice]);
  
  // Clear processed set when all burst slices are removed
  useEffect(() => {
    const hasBurstSlices = slices.some(s => s.isBurst);
    if (!hasBurstSlices && processedRef.current.size > 0) {
      processedRef.current.clear();
    }
  }, [slices]);
};
