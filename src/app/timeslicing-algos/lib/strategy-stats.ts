import type { AdaptiveBinningMode } from '@/types/adaptive';

const EPSILON = 1e-6;

export interface BinningStrategyStats {
  strategy: AdaptiveBinningMode;
  binCount: number;
  totalEvents: number;
  nonEmptyBins: number;
  emptyBins: number;
  maxBinEvents: number;
  meanBinEvents: number;
  varianceBinEvents: number;
  medianBinWidthSec: number;
  minBinWidthSec: number;
  maxBinWidthSec: number;
  occupiedBinShare: number;
  peakBinShare: number;
  topThreeBinShare: number;
  widthSpreadRatio: number;
}

const clampToBin = (index: number, binCount: number): number => {
  if (index < 0) return 0;
  if (index >= binCount) return binCount - 1;
  return index;
};

const ensureStrictlyMonotonicBoundaries = (
  boundaries: Float64Array,
  domainStart: number,
  domainEnd: number,
): void => {
  if (boundaries.length === 0) return;
  boundaries[0] = domainStart;
  for (let i = 1; i < boundaries.length; i++) {
    const previous = boundaries[i - 1];
    const current = boundaries[i];
    if (!Number.isFinite(current) || current <= previous) {
      boundaries[i] = previous + EPSILON;
    }
  }
  const lastIndex = boundaries.length - 1;
  boundaries[lastIndex] = Math.max(domainEnd, boundaries[lastIndex - 1] + EPSILON);
};

const findBoundaryBin = (value: number, boundaries: Float64Array): number => {
  let low = 0;
  let high = boundaries.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if ((boundaries[mid] ?? Number.POSITIVE_INFINITY) <= value) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
};

const buildStats = (
  strategy: AdaptiveBinningMode,
  counts: Uint32Array,
  binWidthsSec: Float64Array,
  totalEvents: number,
): BinningStrategyStats => {
  let nonEmptyBins = 0;
  let maxBinEvents = 0;
  let sum = 0;
  const sortedCounts = Array.from(counts).sort((a, b) => b - a);

  for (const count of counts) {
    if (count > 0) nonEmptyBins += 1;
    if (count > maxBinEvents) maxBinEvents = count;
    sum += count;
  }

  const meanBinEvents = counts.length > 0 ? sum / counts.length : 0;
  let sumSquaredDeviation = 0;
  for (const count of counts) {
    const delta = count - meanBinEvents;
    sumSquaredDeviation += delta * delta;
  }
  const varianceBinEvents = counts.length > 0 ? sumSquaredDeviation / counts.length : 0;

  const widths = Array.from(binWidthsSec).filter((value) => Number.isFinite(value) && value > 0);
  const minBinWidthSec = widths.length > 0 ? Math.min(...widths) : 0;
  const maxBinWidthSec = widths.length > 0 ? Math.max(...widths) : 0;
  const topThreeBinEvents = sortedCounts.slice(0, 3).reduce((total, count) => total + count, 0);

  return {
    strategy,
    binCount: counts.length,
    totalEvents,
    nonEmptyBins,
    emptyBins: counts.length - nonEmptyBins,
    maxBinEvents,
    meanBinEvents,
    varianceBinEvents,
    medianBinWidthSec: computeMedian(widths),
    minBinWidthSec,
    maxBinWidthSec,
    occupiedBinShare: counts.length > 0 ? nonEmptyBins / counts.length : 0,
    peakBinShare: totalEvents > 0 ? maxBinEvents / totalEvents : 0,
    topThreeBinShare: totalEvents > 0 ? topThreeBinEvents / totalEvents : 0,
    widthSpreadRatio: minBinWidthSec > 0 ? maxBinWidthSec / minBinWidthSec : 0,
  };
};

const filterToDomain = (timestamps: number[], domain: [number, number]): number[] => {
  const [start, end] = domain;
  return timestamps.filter((value) => Number.isFinite(value) && value >= start && value <= end);
};

const computeUniformTimeStats = (
  timestamps: number[],
  domain: [number, number],
  binCount: number,
): BinningStrategyStats => {
  const [start, end] = domain;
  const safeBinCount = Math.max(1, Math.floor(binCount));
  const span = Math.max(EPSILON, end - start);
  const width = span / safeBinCount;
  const counts = new Uint32Array(safeBinCount);

  for (const timestamp of timestamps) {
    const norm = (timestamp - start) / span;
    const idx = clampToBin(Math.floor(norm * safeBinCount), safeBinCount);
    counts[idx] += 1;
  }

  const widths = new Float64Array(safeBinCount);
  widths.fill(width);

  return buildStats('uniform-time', counts, widths, timestamps.length);
};

const computeUniformEventsStats = (
  timestamps: number[],
  domain: [number, number],
  binCount: number,
): BinningStrategyStats => {
  const [start, end] = domain;
  const safeBinCount = Math.max(1, Math.floor(binCount));
  const sorted = [...timestamps].sort((a, b) => a - b);
  const counts = new Uint32Array(safeBinCount);
  const widths = new Float64Array(safeBinCount);

  if (sorted.length === 0) {
    widths.fill(Math.max(EPSILON, end - start) / safeBinCount);
    return buildStats('uniform-events', counts, widths, 0);
  }

  const boundaries = new Float64Array(safeBinCount + 1);
  boundaries[0] = start;
  boundaries[safeBinCount] = end;

  const maxTimestampIndex = sorted.length - 1;
  for (let edgeIndex = 1; edgeIndex < safeBinCount; edgeIndex++) {
    const target = (edgeIndex * sorted.length) / safeBinCount;
    const sampleIndex = Math.min(maxTimestampIndex, Math.floor(target));
    boundaries[edgeIndex] = sorted[sampleIndex] ?? end;
  }

  ensureStrictlyMonotonicBoundaries(boundaries, start, end);

  for (const timestamp of sorted) {
    const boundaryIndex = findBoundaryBin(timestamp, boundaries);
    const idx = clampToBin(boundaryIndex, safeBinCount);
    counts[idx] += 1;
  }

  for (let i = 0; i < safeBinCount; i++) {
    widths[i] = Math.max(EPSILON, (boundaries[i + 1] ?? end) - (boundaries[i] ?? start));
  }

  return buildStats('uniform-events', counts, widths, sorted.length);
};

export const computeBinningStrategyStats = (
  allTimestamps: number[],
  domain: [number, number],
  binCount = 96,
): BinningStrategyStats[] => {
  const timestamps = filterToDomain(allTimestamps, domain);
  return [
    computeUniformTimeStats(timestamps, domain, binCount),
    computeUniformEventsStats(timestamps, domain, binCount),
  ];
};
