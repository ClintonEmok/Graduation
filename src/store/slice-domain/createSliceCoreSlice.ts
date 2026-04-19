import { useAdaptiveStore } from '../useAdaptiveStore';
import { useTimelineDataStore } from '../useTimelineDataStore';
import { calculateRangeTolerance, rangesMatch } from '../../lib/slice-utils';
import { epochSecondsToNormalized, normalizedToEpochSeconds, toEpochSeconds } from '../../lib/time-domain';
import type { TimeBin } from '@/lib/binning/types';
import type { SliceCoreState, SliceDomainStateCreator, TimeSlice } from './types';

const BURST_TOLERANCE_RATIO = 0.005;
const MERGE_TOUCH_TOLERANCE = 0.5;

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const clampNormalized = (value: number): number => Math.min(100, Math.max(0, value));

const toNormalizedStoreRange = (start: number, end: number): [number, number] => {
  const [rawStart, rawEnd] = normalizeRange(start, end);

  if (rawStart >= 0 && rawEnd <= 100) {
    return [rawStart, rawEnd];
  }

  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
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

const toNormalizedBinRange = (bin: TimeBin, domain: [number, number]): [number, number] => {
  const [domainStart, domainEnd] = normalizeRange(domain[0], domain[1]);
  const span = Math.max(1, domainEnd - domainStart);
  const start = ((bin.startTime - domainStart) / span) * 100;
  const end = ((bin.endTime - domainStart) / span) * 100;
  return normalizeRange(clampNormalized(start), clampNormalized(end));
};

const hasBurstTaxonomy = (bin: TimeBin): boolean =>
  bin.burstClass !== undefined
  || bin.burstRuleVersion !== undefined
  || bin.burstScore !== undefined
  || bin.burstConfidence !== undefined
  || bin.burstProvenance !== undefined
  || bin.tieBreakReason !== undefined
  || bin.thresholdSource !== undefined
  || bin.neighborhoodSummary !== undefined;

const toDateTimeMs = (normalizedValue: number): number | null => {
  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
  if (minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
    return null;
  }

  return normalizedToEpochSeconds(normalizedValue, minTimestampSec, maxTimestampSec) * 1000;
};

const withDateTimeFields = (
  slice: TimeSlice,
  startNormalized: number,
  endNormalized?: number
): TimeSlice => ({
  ...slice,
  startDateTimeMs: slice.startDateTimeMs ?? toDateTimeMs(startNormalized),
  endDateTimeMs:
    slice.endDateTimeMs ?? (endNormalized === undefined ? null : toDateTimeMs(endNormalized)),
});

export const createSliceCoreSlice: SliceDomainStateCreator<SliceCoreState> = (set, get) => ({
  slices: [],
  activeSliceId: null,
  activeSliceUpdatedAt: 0,
  getOverlapCounts: () => {
    const visibleRanges = get()
      .slices
      .filter((slice) => slice.isVisible && slice.type === 'range' && Array.isArray(slice.range))
      .map((slice) => {
        const [start, end] = slice.range!;
        const [normalizedStart, normalizedEnd] = toNormalizedStoreRange(start, end);
        return {
          id: slice.id,
          start: normalizedStart,
          end: normalizedEnd,
        };
      });

    const overlapCounts: Record<string, number> = {};
    visibleRanges.forEach((slice) => {
      overlapCounts[slice.id] = 1;
    });

    for (let i = 0; i < visibleRanges.length; i += 1) {
      for (let j = i + 1; j < visibleRanges.length; j += 1) {
        const left = visibleRanges[i];
        const right = visibleRanges[j];
        if (left.start < right.end && right.start < left.end) {
          overlapCounts[left.id] += 1;
          overlapCounts[right.id] += 1;
        }
      }
    }

    return overlapCounts;
  },
  addSlice: (initial) =>
    set((state) => {
      const id = crypto.randomUUID();
      const nextSlice: TimeSlice = {
        id,
        type: initial.type || 'point',
        time: initial.time ?? 50,
        range: initial.range || [40, 60],
        warpEnabled: true,
        warpWeight: 1,
        isLocked: false,
        isVisible: true,
        ...initial,
      };

      const normalizedStart = nextSlice.type === 'range' && nextSlice.range
        ? nextSlice.range[0]
        : nextSlice.time;
      const normalizedEnd = nextSlice.type === 'range' && nextSlice.range ? nextSlice.range[1] : undefined;
      const hydratedSlice = withDateTimeFields(nextSlice, normalizedStart, normalizedEnd);

      return {
        slices: sortSlices([...state.slices, hydratedSlice]),
        activeSliceId: id,
        activeSliceUpdatedAt: Date.now(),
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
      set({ activeSliceId: existing.id, activeSliceUpdatedAt: Date.now() });
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
      warpEnabled: true,
      warpWeight: 1.25,
      isBurst: true,
      burstSliceId: buildBurstSliceId(rangeStart, rangeEnd),
      isLocked: false,
      isVisible: true,
    };

    const hydratedBurstSlice = withDateTimeFields(burstSlice, rangeStart, rangeEnd);

    set((state) => ({
      slices: sortSlices([...state.slices, hydratedBurstSlice]),
      activeSliceId: id,
      activeSliceUpdatedAt: Date.now(),
    }));

    return hydratedBurstSlice;
  },
  removeSlice: (id) =>
    set((state) => {
      const activeSliceId = state.activeSliceId === id ? null : state.activeSliceId;
      return {
        slices: state.slices.filter((slice) => slice.id !== id),
        activeSliceId,
        activeSliceUpdatedAt:
          activeSliceId !== state.activeSliceId ? Date.now() : state.activeSliceUpdatedAt,
      };
    }),
  mergeSlices: (ids) => {
    if (ids.length < 2) {
      return null;
    }

    const uniqueIds = new Set(ids);
    const candidateSlices = get()
      .slices
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
      warpEnabled: true,
      warpWeight: 1,
      isLocked: false,
      isVisible: true,
    };
    const hydratedMergedSlice = withDateTimeFields(mergedSlice, mergedRange[0], mergedRange[1]);

    set((state) => ({
      slices: sortSlices([...state.slices.filter((slice) => !uniqueIds.has(slice.id)), hydratedMergedSlice]),
      activeSliceId: mergedId,
      activeSliceUpdatedAt: Date.now(),
    }));

    return mergedId;
  },
  updateSlice: (id, updates) =>
    set((state) => ({
      slices: sortSlices(state.slices.map((slice) => (slice.id === id ? { ...slice, ...updates } : slice))),
    })),
  toggleLock: (id) =>
    set((state) => ({
      slices: state.slices.map((slice) =>
        slice.id === id ? { ...slice, isLocked: !slice.isLocked } : slice
      ),
    })),
  toggleVisibility: (id) =>
    set((state) => ({
      slices: state.slices.map((slice) =>
        slice.id === id ? { ...slice, isVisible: !slice.isVisible } : slice
      ),
    })),
  replaceSlicesFromBins: (bins, domain) => {
    const nextSlices = bins
      .map<TimeSlice | null>((bin, index) => {
        const [start, end] = toNormalizedBinRange(bin, domain);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return null;
        }

        const burstTaxonomyPresent = hasBurstTaxonomy(bin);

        if (burstTaxonomyPresent) {
          return {
            id: crypto.randomUUID(),
            name: `Burst ${index + 1}`,
            source: 'generated-applied' as const,
            type: 'range' as const,
            time: (start + end) / 2,
            range: [start, end] as [number, number],
            warpEnabled: true,
            warpWeight: bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25),
            notes: `${bin.count} events`,
            isBurst: true,
            burstSliceId: buildBurstSliceId(start, end),
            burstClass: bin.burstClass,
            burstRuleVersion: bin.burstRuleVersion,
            burstScore: bin.burstScore,
            burstConfidence: bin.burstConfidence,
            burstProvenance: bin.burstProvenance,
            tieBreakReason: bin.tieBreakReason,
            thresholdSource: bin.thresholdSource,
            neighborhoodSummary: bin.neighborhoodSummary,
            isLocked: false,
            isVisible: true,
            startDateTimeMs: bin.startTime,
            endDateTimeMs: bin.endTime,
          };
        }

        return {
          id: crypto.randomUUID(),
          name: `Slice ${index + 1}`,
          source: 'generated-applied' as const,
          type: 'range' as const,
          time: (start + end) / 2,
          range: [start, end] as [number, number],
          warpEnabled: true,
          warpWeight: 1,
          notes: `${bin.count} events`,
          isLocked: false,
          isVisible: true,
          startDateTimeMs: bin.startTime,
          endDateTimeMs: bin.endTime,
        };
      })
      .filter((slice): slice is TimeSlice => slice !== null);

    set({
      slices: sortSlices(nextSlices),
      activeSliceId: nextSlices[0]?.id ?? null,
      activeSliceUpdatedAt: Date.now(),
    });
  },
  clearSlices: () => set({ slices: [], activeSliceId: null, activeSliceUpdatedAt: Date.now() }),
  setActiveSlice: (id) => set({ activeSliceId: id, activeSliceUpdatedAt: Date.now() }),
});
