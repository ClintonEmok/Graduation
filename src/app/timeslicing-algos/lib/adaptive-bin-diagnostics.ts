import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';

const EPSILON = 1e-6;

export interface AdaptiveBinDiagnosticRow {
  binIndex: number;
  startSec: number;
  endSec: number;
  widthSec: number;
  rawCount: number;
  densityPerSecond: number;
  normalizedDensity: number;
  adaptiveMultiplier: number;
  weightShare: number;
  warpedStartSec: number;
  warpedEndSec: number;
  warpedSpanSec: number;
  warpedSpanShare: number;
  cumulativeWarpOffsetSec: number;
}

interface BuildAdaptiveBinDiagnosticsOptions {
  selectedStrategy: AdaptiveBinningMode;
  domain: [number, number];
  timestamps: ArrayLike<number>;
  countMap: ArrayLike<number> | null;
  densityMap: ArrayLike<number> | null;
  warpMap: ArrayLike<number> | null;
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
  for (let i = 1; i < boundaries.length; i += 1) {
    const previous = boundaries[i - 1] ?? domainStart;
    const current = boundaries[i] ?? domainEnd;
    if (!Number.isFinite(current) || current <= previous) {
      boundaries[i] = previous + EPSILON;
    }
  }
  const lastIndex = boundaries.length - 1;
  boundaries[lastIndex] = Math.max(domainEnd, (boundaries[lastIndex - 1] ?? domainStart) + EPSILON);
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

const toFiniteDomain = (domain: [number, number]): [number, number] => {
  const start = Number.isFinite(domain[0]) ? domain[0] : 0;
  const end = Number.isFinite(domain[1]) ? domain[1] : start + 1;
  if (end > start) {
    return [start, end];
  }
  return [start, start + 1];
};

const normalizeDensity = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value as number);
};

const buildUniformTimeBoundaries = (domain: [number, number], binCount: number): Float64Array => {
  const [start, end] = toFiniteDomain(domain);
  const span = end - start;
  const boundaries = new Float64Array(binCount + 1);
  for (let i = 0; i <= binCount; i += 1) {
    boundaries[i] = start + (i / binCount) * span;
  }
  return boundaries;
};

const filterToDomain = (timestamps: ArrayLike<number>, domain: [number, number]): number[] => {
  const [start, end] = toFiniteDomain(domain);
  return Array.from(timestamps).filter((value) => Number.isFinite(value) && value >= start && value <= end);
};

const buildUniformEventsBoundaries = (
  timestamps: ArrayLike<number>,
  domain: [number, number],
  binCount: number,
): Float64Array => {
  const [start, end] = toFiniteDomain(domain);
  const boundaries = new Float64Array(binCount + 1);
  boundaries[0] = start;
  boundaries[binCount] = end;

  const sorted = filterToDomain(timestamps, [start, end]).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return buildUniformTimeBoundaries([start, end], binCount);
  }

  const maxTimestampIndex = sorted.length - 1;
  for (let edgeIndex = 1; edgeIndex < binCount; edgeIndex += 1) {
    const target = (edgeIndex * sorted.length) / binCount;
    const sampleIndex = Math.min(maxTimestampIndex, Math.floor(target));
    boundaries[edgeIndex] = sorted[sampleIndex] ?? end;
  }

  ensureStrictlyMonotonicBoundaries(boundaries, start, end);
  return boundaries;
};

const buildBoundaries = (
  selectedStrategy: AdaptiveBinningMode,
  timestamps: ArrayLike<number>,
  domain: [number, number],
  binCount: number,
): Float64Array => {
  if (selectedStrategy === 'uniform-events') {
    return buildUniformEventsBoundaries(timestamps, domain, binCount);
  }
  return buildUniformTimeBoundaries(domain, binCount);
};

export const assignUniformEventsCounts = (
  timestamps: ArrayLike<number>,
  domain: [number, number],
  binCount: number,
): number[] => {
  const [start, end] = toFiniteDomain(domain);
  const sorted = filterToDomain(timestamps, [start, end]).sort((a, b) => a - b);
  const boundaries = buildUniformEventsBoundaries(sorted, [start, end], binCount);
  const counts = Array.from({ length: binCount }, () => 0);

  for (const timestamp of sorted) {
    const boundaryIndex = findBoundaryBin(timestamp, boundaries);
    const idx = clampToBin(boundaryIndex, binCount);
    counts[idx] += 1;
  }

  return counts;
};

export const buildAdaptiveBinDiagnostics = ({
  selectedStrategy,
  domain,
  timestamps,
  countMap,
  densityMap,
  warpMap,
}: BuildAdaptiveBinDiagnosticsOptions): AdaptiveBinDiagnosticRow[] => {
  if (!countMap || !densityMap || !warpMap) {
    return [];
  }

  const binCount = countMap.length;
  if (binCount === 0 || densityMap.length !== binCount || warpMap.length !== binCount) {
    return [];
  }

  const [start, end] = toFiniteDomain(domain);
  const span = end - start;
  const boundaries = buildBoundaries(selectedStrategy, timestamps, [start, end], binCount);

  const weights = Array.from({ length: binCount }, (_, index) => 1 + normalizeDensity(densityMap[index]) * 5);
  let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    totalWeight = binCount;
    weights.fill(1);
  }

  return Array.from({ length: binCount }, (_, binIndex) => {
    const startSec = boundaries[binIndex] ?? start;
    const endSec = boundaries[binIndex + 1] ?? end;
    const widthSec = Math.max(0, endSec - startSec);
    const rawCount = Number(countMap[binIndex] ?? 0);
    const normalizedDensity = normalizeDensity(densityMap[binIndex]);
    const adaptiveMultiplier = weights[binIndex] ?? 1;
    const weightShare = adaptiveMultiplier / totalWeight;
    const warpedStartSec = Number.isFinite(warpMap[binIndex]) ? Number(warpMap[binIndex]) : startSec;
    const warpedEndSec =
      binIndex === binCount - 1
        ? end
        : Number.isFinite(warpMap[binIndex + 1])
          ? Number(warpMap[binIndex + 1])
          : Math.min(end, warpedStartSec + weightShare * span);
    const warpedSpanSec = Math.max(0, warpedEndSec - warpedStartSec);

    return {
      binIndex,
      startSec,
      endSec,
      widthSec,
      rawCount,
      densityPerSecond: widthSec > 0 ? rawCount / widthSec : 0,
      normalizedDensity,
      adaptiveMultiplier,
      weightShare,
      warpedStartSec,
      warpedEndSec,
      warpedSpanSec,
      warpedSpanShare: span > 0 ? warpedSpanSec / span : 0,
      cumulativeWarpOffsetSec: warpedStartSec - startSec,
    };
  });
};
