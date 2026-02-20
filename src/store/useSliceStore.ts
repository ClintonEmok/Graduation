import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateRangeTolerance, rangesMatch } from '../lib/slice-utils';
import { useEffect, useRef } from 'react';
import { useAdaptiveStore } from './useAdaptiveStore';
import { useDataStore } from './useDataStore';
import { epochSecondsToNormalized, toEpochSeconds } from '../lib/time-domain';

export interface TimeSlice {
  id: string;
  name?: string;
  type: 'point' | 'range';
  time: number; // Normalized time 0-100 (for point)
  range?: [number, number]; // Normalized start/end (for range)
  isBurst?: boolean;
  burstSliceId?: string;
  isLocked: boolean;
  isVisible: boolean;
}

interface SliceStore {
  slices: TimeSlice[];
  activeSliceId: string | null;
  addSlice: (initial: Partial<TimeSlice>) => void;
  addBurstSlice: (burstWindow: { start: number; end: number }) => TimeSlice | null;
  findMatchingSlice: (
    start: number,
    end: number,
    tolerance?: number,
    options?: { burstOnly?: boolean }
  ) => TimeSlice | undefined;
  removeSlice: (id: string) => void;
  mergeSlices: (ids: string[]) => string | null;
  updateSlice: (id: string, updates: Partial<TimeSlice>) => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  clearSlices: () => void;
  setActiveSlice: (id: string | null) => void;
}

const BURST_TOLERANCE_RATIO = 0.005;

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const clampNormalized = (value: number): number => Math.min(100, Math.max(0, value));
const MERGE_TOUCH_TOLERANCE = 0.5;

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

const getSliceStart = (slice: TimeSlice): number => {
  if (slice.type === 'range' && slice.range) {
    return Math.min(slice.range[0], slice.range[1]);
  }

  return slice.time;
};

const sortSlices = (slices: TimeSlice[]): TimeSlice[] =>
  slices
    .map((slice, index) => ({ slice, index }))
    .sort((a, b) => {
      const startDelta = getSliceStart(a.slice) - getSliceStart(b.slice);
      if (startDelta !== 0) {
        return startDelta;
      }

      if (!a.slice.isBurst && b.slice.isBurst) {
        return -1;
      }

      if (a.slice.isBurst && !b.slice.isBurst) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ slice }) => slice);

const buildBurstSliceId = (start: number, end: number): string => {
  const [normalizedStart, normalizedEnd] = normalizeRange(start, end);
  return `burst-${normalizedStart}-${normalizedEnd}`;
};

export const useSliceStore = create<SliceStore>()(
  persist(
    (set, get) => ({
      slices: [],
      activeSliceId: null,
      addSlice: (initial) =>
        set((state) => {
          const id = crypto.randomUUID();
          const nextSlice: TimeSlice = {
            id,
            type: initial.type || 'point',
            time: initial.time ?? 50,
            range: initial.range || [40, 60],
            isLocked: false,
            isVisible: true,
            ...initial,
          };

          return {
            slices: sortSlices([...state.slices, nextSlice]),
            activeSliceId: id, // Automatically set as active on creation
          };
        }),
      findMatchingSlice: (start, end, tolerance, options) => {
        const [targetStart, targetEnd] = toNormalizedStoreRange(start, end);
        const resolvedTolerance =
          tolerance ?? calculateRangeTolerance([targetStart, targetEnd], BURST_TOLERANCE_RATIO);
        const burstOnly = options?.burstOnly ?? false;

        return get().slices.find((slice) => {
          if (slice.type !== 'range' || !slice.range) {
            return false;
          }

          if (burstOnly && !slice.isBurst) {
            return false;
          }

          return rangesMatch(slice.range, [targetStart, targetEnd], resolvedTolerance);
        });
      },
      addBurstSlice: (burstWindow) => {
        const [rangeStart, rangeEnd] = toNormalizedStoreRange(burstWindow.start, burstWindow.end);
        const existing = get().findMatchingSlice(rangeStart, rangeEnd, undefined, { burstOnly: true });
        if (existing) {
          set({ activeSliceId: existing.id });
          return existing;
        }

        const id = crypto.randomUUID();
        const burstNumber = get().slices.filter((slice) => slice.isBurst).length + 1;
        const burstSlice: TimeSlice = {
          id,
          name: `Burst ${burstNumber}`,
          type: 'range',
          time: (rangeStart + rangeEnd) / 2,
          range: [rangeStart, rangeEnd],
          isBurst: true,
          burstSliceId: buildBurstSliceId(rangeStart, rangeEnd),
          isLocked: false,
          isVisible: true,
        };

        set((state) => ({
          slices: sortSlices([...state.slices, burstSlice]),
          activeSliceId: id,
        }));

        return burstSlice;
      },
      removeSlice: (id) =>
        set((state) => ({
          slices: state.slices.filter((s) => s.id !== id),
          activeSliceId: state.activeSliceId === id ? null : state.activeSliceId,
        })),
      mergeSlices: (ids) => {
        if (ids.length < 2) {
          return null;
        }

        const uniqueIds = new Set(ids);
        const candidateSlices = get().slices
          .filter((slice) => uniqueIds.has(slice.id))
          .map((slice) => {
            if (slice.type === 'range' && slice.range) {
              const [start, end] = toNormalizedStoreRange(slice.range[0], slice.range[1]);
              return { slice, start, end };
            }

            const point = clampNormalized(slice.time);
            return { slice, start: point, end: point };
          });

        if (candidateSlices.length < 2) {
          return null;
        }

        const sortedCandidates = [...candidateSlices].sort((a, b) => a.start - b.start);
        for (let index = 1; index < sortedCandidates.length; index += 1) {
          const previous = sortedCandidates[index - 1];
          const current = sortedCandidates[index];
          if (current.start - previous.end > MERGE_TOUCH_TOLERANCE) {
            return null;
          }
        }

        const mergedStart = Math.min(...sortedCandidates.map((candidate) => candidate.start));
        const mergedEnd = Math.max(...sortedCandidates.map((candidate) => candidate.end));
        const mergedRange = toNormalizedStoreRange(mergedStart, mergedEnd);
        const mergedCount = get().slices.filter((slice) => slice.name?.startsWith('Merged Slice ')).length;
        const mergedId = crypto.randomUUID();

        const mergedSlice: TimeSlice = {
          id: mergedId,
          name: `Merged Slice ${mergedCount + 1}`,
          type: 'range',
          time: (mergedRange[0] + mergedRange[1]) / 2,
          range: mergedRange,
          isLocked: false,
          isVisible: true,
        };

        set((state) => ({
          slices: sortSlices([
            ...state.slices.filter((slice) => !uniqueIds.has(slice.id)),
            mergedSlice,
          ]),
          activeSliceId: mergedId,
        }));

        return mergedId;
      },
      updateSlice: (id, updates) =>
        set((state) => ({
          slices: sortSlices(
            state.slices.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            )
          ),
        })),
      toggleLock: (id) =>
        set((state) => ({
          slices: state.slices.map((s) =>
            s.id === id ? { ...s, isLocked: !s.isLocked } : s
          ),
        })),
      toggleVisibility: (id) =>
        set((state) => ({
          slices: state.slices.map((s) =>
            s.id === id ? { ...s, isVisible: !s.isVisible } : s
          ),
        })),
      clearSlices: () => set({ slices: [], activeSliceId: null }),
      setActiveSlice: (id) => set({ activeSliceId: id }),
    }),
    {
      name: 'slice-store-v1',
      partialize: (state) => ({ slices: state.slices }), // Don't persist activeSliceId if we want it ephemeral
    }
  )
);

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
