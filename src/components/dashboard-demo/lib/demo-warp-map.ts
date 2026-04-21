import type { TimeSlice } from '@/store/useDashboardDemoSliceStore';
import {
  buildComparableWarpMap,
  scoreComparableWarpBins,
  type ComparableWarpBinInput,
  type ComparableWarpMapResult,
} from '@/lib/binning/warp-scaling';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const clampWeight = (value: number) => Math.min(3, Math.max(0, value));

const buildSampleWarpMapFromComparableWarp = (
  result: ComparableWarpMapResult,
  sampleCount: number,
  domain: [number, number]
): Float32Array => {
  const warpMap = new Float32Array(sampleCount);
  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const logicalPosition = domainStart + (ratio * domainSpan);

    let binIndex = result.bins.findIndex((bin, currentIndex) => {
      const isLast = currentIndex === result.bins.length - 1;
      return logicalPosition >= bin.startTime && (isLast ? logicalPosition <= bin.endTime : logicalPosition < bin.endTime);
    });

    if (binIndex < 0) {
      binIndex = logicalPosition <= result.bins[0]!.startTime ? 0 : result.bins.length - 1;
    }

    const bin = result.bins[binIndex] ?? result.bins[0];
    const start = bin?.startTime ?? domainStart;
    const end = bin?.endTime ?? domainEnd;
    const warpedStart = result.boundaries[binIndex] ?? domainStart;
    const warpedEnd = result.boundaries[binIndex + 1] ?? domainEnd;
    const localProgress = end > start ? (logicalPosition - start) / (end - start) : 0;
    warpMap[index] = warpedStart + (Math.max(0, Math.min(1, localProgress)) * (warpedEnd - warpedStart));
  }

  return warpMap;
};

const resolveSliceRange = (slice: TimeSlice): [number, number] | null => {
  if (slice.range) {
    const start = clampPercent(Math.min(slice.range[0], slice.range[1]));
    const end = clampPercent(Math.max(slice.range[0], slice.range[1]));
    return end > start ? [start, end] : null;
  }

  if (!Number.isFinite(slice.time)) {
    return null;
  }

  const center = clampPercent(slice.time);
  const halfWidth = slice.isBurst ? 2.5 : 1.5;
  return [clampPercent(center - halfWidth), clampPercent(center + halfWidth)];
};

export const buildDemoSliceAuthoredWarpMap = (
  slices: TimeSlice[],
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.isVisible && (slice.warpEnabled ?? true));
  if (enabledSlices.length === 0 || sampleCount < 2) {
    return null;
  }

  const comparableBins: ComparableWarpBinInput[] = enabledSlices.flatMap((slice) => {
    const range = resolveSliceRange(slice);
    if (!range) {
      return [];
    }

    const [start, end] = range;
    return [{
      id: slice.id,
      startTime: start,
      endTime: end,
      count: Math.max(1, Math.round((end - start) * 100)),
      granularity: 'daily',
      hintWeight: clampWeight(slice.warpWeight ?? 1),
    } satisfies ComparableWarpBinInput];
  });

  const comparableScores = scoreComparableWarpBins(comparableBins);
  const comparableWarp = buildComparableWarpMap(comparableScores.bins, domain, { minimumWidthShare: 0.08 });
  if (!comparableWarp || comparableWarp.bins.length === 0) {
    return null;
  }

  return buildSampleWarpMapFromComparableWarp(comparableWarp, sampleCount, domain);
};
