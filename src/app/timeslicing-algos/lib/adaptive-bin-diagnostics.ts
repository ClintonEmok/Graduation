import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';
import { classifyBurstWindow, type BurstTaxonomy } from '@/lib/binning/burst-taxonomy';

const EPSILON = 1e-6;

export const WEEKEND_HEAVY_THRESHOLD = 0.6;
export const WEEKDAY_HEAVY_THRESHOLD = 0.6;
export const NIGHT_HEAVY_THRESHOLD = 0.55;
export const DAYTIME_HEAVY_THRESHOLD = 0.55;
export const COMMUTE_HEAVY_THRESHOLD = 0.55;
export const LATE_NIGHT_HEAVY_THRESHOLD = 0.55;
export const BURST_PATTERN_RATIO = 2.0;
export const BURST_PATTERN_MIN_EVENTS = 4;

const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 6;
const COMMUTE_MORNING_START = 7;
const COMMUTE_MORNING_END = 10;
const COMMUTE_EVENING_START = 17;
const COMMUTE_EVENING_END = 20;
const LATE_NIGHT_END = 5;

export type AdaptiveBinTraitLabel =
  | 'weekend-heavy'
  | 'weekday-heavy'
  | 'night-heavy'
  | 'daytime-heavy'
  | 'commute-heavy'
  | 'late-night-heavy'
  | 'burst-pattern'
  | 'mixed-pattern'
  | 'no-events';

export interface AdaptiveBinTraitPercent {
  label: AdaptiveBinTraitLabel;
  percent: number;
}

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
  characterizationLabels: AdaptiveBinTraitLabel[];
  traitPercents: AdaptiveBinTraitPercent[];
  burstClass?: BurstTaxonomy;
  burstRuleVersion?: string;
  burstScore?: number;
  burstConfidence?: number;
  burstProvenance?: string;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
  burstRationale?: string;
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
    if ((boundaries[mid] ?? Number.POSITIVE_INFINITY) < value) {
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

const isWeekendDay = (day: number): boolean => day === 0 || day === 6;

const isNightHour = (hour: number): boolean => hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;

const isCommuteHour = (hour: number): boolean =>
  (hour >= COMMUTE_MORNING_START && hour < COMMUTE_MORNING_END) ||
  (hour >= COMMUTE_EVENING_START && hour < COMMUTE_EVENING_END);

const isLateNightHour = (hour: number): boolean => hour < LATE_NIGHT_END;

const resolveBinTimestampTraits = (
  timestamps: number[],
  startSec: number,
  endSec: number,
  includeEnd: boolean,
): { labels: AdaptiveBinTraitLabel[]; traitPercents: AdaptiveBinTraitPercent[] } => {
  const inBin = timestamps.filter((timestamp) => {
    if (!Number.isFinite(timestamp)) return false;
    if (timestamp < startSec) return false;
    if (includeEnd) return timestamp <= endSec;
    return timestamp < endSec;
  });

  if (inBin.length === 0) {
    return {
      labels: ['no-events'],
      traitPercents: [{ label: 'no-events', percent: 100 }],
    };
  }

  let weekendCount = 0;
  let weekdayCount = 0;
  let nightCount = 0;
  let daytimeCount = 0;
  let commuteCount = 0;
  let lateNightCount = 0;

  for (const timestamp of inBin) {
    const date = new Date(timestamp * 1000);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const isWeekday = !isWeekendDay(day);

    if (isWeekday) {
      weekdayCount += 1;
    } else {
      weekendCount += 1;
    }

    if (isNightHour(hour)) {
      nightCount += 1;
    } else {
      daytimeCount += 1;
    }

    if (isWeekday && isCommuteHour(hour)) {
      commuteCount += 1;
    }

    if (isLateNightHour(hour)) {
      lateNightCount += 1;
    }
  }

  const total = inBin.length;
  const weekendShare = weekendCount / total;
  const weekdayShare = weekdayCount / total;
  const nightShare = nightCount / total;
  const daytimeShare = daytimeCount / total;
  const commuteShare = commuteCount / total;
  const lateNightShare = lateNightCount / total;

  const traitPercents: AdaptiveBinTraitPercent[] = [
    { label: 'weekend-heavy', percent: weekendShare * 100 },
    { label: 'weekday-heavy', percent: weekdayShare * 100 },
    { label: 'night-heavy', percent: nightShare * 100 },
    { label: 'daytime-heavy', percent: daytimeShare * 100 },
    { label: 'commute-heavy', percent: commuteShare * 100 },
    { label: 'late-night-heavy', percent: lateNightShare * 100 },
  ];

  const labels: AdaptiveBinTraitLabel[] = [];

  if (weekendShare >= WEEKEND_HEAVY_THRESHOLD) {
    labels.push('weekend-heavy');
  } else if (weekdayShare >= WEEKDAY_HEAVY_THRESHOLD) {
    labels.push('weekday-heavy');
  }

  if (nightShare >= NIGHT_HEAVY_THRESHOLD) {
    labels.push('night-heavy');
  } else if (daytimeShare >= DAYTIME_HEAVY_THRESHOLD) {
    labels.push('daytime-heavy');
  }

  if (commuteShare >= COMMUTE_HEAVY_THRESHOLD) {
    labels.push('commute-heavy');
  }

  if (lateNightShare >= LATE_NIGHT_HEAVY_THRESHOLD) {
    labels.push('late-night-heavy');
  }

  if (labels.length === 0) {
    labels.push('mixed-pattern');
  }

  return { labels, traitPercents };
};

const buildFallbackCountMap = (timestamps: number[], boundaries: Float64Array, binCount: number): Float32Array => {
  const counts = new Float32Array(binCount);
  for (const timestamp of timestamps) {
    const boundaryIndex = findBoundaryBin(timestamp, boundaries);
    const idx = clampToBin(boundaryIndex, binCount);
    counts[idx] += 1;
  }
  return counts;
};

const buildFallbackDensityMap = (counts: Float32Array, boundaries: Float64Array): Float32Array => {
  const density = new Float32Array(counts.length);
  for (let i = 0; i < counts.length; i += 1) {
    const width = Math.max(EPSILON, (boundaries[i + 1] ?? boundaries[i] ?? 0) - (boundaries[i] ?? 0));
    density[i] = counts[i] / width;
  }
  return density;
};

const buildFallbackWarpMap = (boundaries: Float64Array, binCount: number): Float32Array => {
  const warp = new Float32Array(binCount);
  for (let i = 0; i < binCount; i += 1) {
    warp[i] = boundaries[i] ?? 0;
  }
  return warp;
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
  const baseBinCount = countMap?.length ?? densityMap?.length ?? warpMap?.length ?? 0;
  if (baseBinCount === 0) {
    return [];
  }

  const [start, end] = toFiniteDomain(domain);
  const span = end - start;
  const timestampsInDomain = filterToDomain(timestamps, [start, end]);
  const boundaries = buildBoundaries(selectedStrategy, timestampsInDomain, [start, end], baseBinCount);

  const resolvedCountMap =
    countMap && countMap.length === baseBinCount
      ? Float32Array.from(countMap)
      : buildFallbackCountMap(timestampsInDomain, boundaries, baseBinCount);
  const resolvedDensityMap =
    densityMap && densityMap.length === baseBinCount
      ? Float32Array.from(densityMap)
      : buildFallbackDensityMap(resolvedCountMap, boundaries);
  const resolvedWarpMap =
    warpMap && warpMap.length === baseBinCount
      ? Float32Array.from(warpMap)
      : buildFallbackWarpMap(boundaries, baseBinCount);

  const weights = Array.from({ length: baseBinCount }, (_, index) => 1 + normalizeDensity(resolvedDensityMap[index]) * 5);
  let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    totalWeight = baseBinCount;
    weights.fill(1);
  }

  const totalEvents = timestampsInDomain.length;

  const baseRows = Array.from({ length: baseBinCount }, (_, binIndex) => {
    const startSec = boundaries[binIndex] ?? start;
    const endSec = boundaries[binIndex + 1] ?? end;
    const widthSec = Math.max(0, endSec - startSec);
    const rawCount = Number(resolvedCountMap[binIndex] ?? 0);
    const normalizedDensity = normalizeDensity(resolvedDensityMap[binIndex]);
    const adaptiveMultiplier = weights[binIndex] ?? 1;
    const weightShare = adaptiveMultiplier / totalWeight;
    const warpedStartSec = Number.isFinite(resolvedWarpMap[binIndex]) ? Number(resolvedWarpMap[binIndex]) : startSec;
    const warpedEndSec =
      binIndex === baseBinCount - 1
        ? end
        : Number.isFinite(resolvedWarpMap[binIndex + 1])
          ? Number(resolvedWarpMap[binIndex + 1])
          : Math.min(end, warpedStartSec + weightShare * span);
    const warpedSpanSec = Math.max(0, warpedEndSec - warpedStartSec);
    const { labels, traitPercents } = resolveBinTimestampTraits(
      timestampsInDomain,
      startSec,
      endSec,
      binIndex === baseBinCount - 1,
    );

    const characterizationLabels = [...labels];

    if (rawCount >= BURST_PATTERN_MIN_EVENTS && totalEvents > 0 && span > 0) {
      const eventShare = rawCount / totalEvents;
      const timeShare = Math.max(EPSILON, widthSec) / span;
      if (eventShare / timeShare >= BURST_PATTERN_RATIO) {
        characterizationLabels.push('burst-pattern');
        traitPercents.push({ label: 'burst-pattern', percent: (eventShare / timeShare) * 100 });
      }
    }

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
      characterizationLabels,
      traitPercents,
    };
  });

  return baseRows.map((row, binIndex) => {
    const neighbors = [baseRows[binIndex - 1], baseRows[binIndex + 1]]
      .filter((neighbor): neighbor is AdaptiveBinDiagnosticRow => neighbor !== undefined)
      .map((neighbor) => ({
        value: neighbor.normalizedDensity,
        count: neighbor.rawCount,
        durationSec: neighbor.widthSec,
      }));
    const taxonomy = classifyBurstWindow({
      value: row.normalizedDensity,
      count: row.rawCount,
      durationSec: row.widthSec,
      neighborhood: neighbors,
    });

    return {
      ...row,
      burstClass: taxonomy.burstClass,
      burstRuleVersion: taxonomy.burstRuleVersion,
      burstScore: taxonomy.burstScore,
      burstConfidence: taxonomy.burstConfidence,
      burstProvenance: taxonomy.burstProvenance,
      tieBreakReason: taxonomy.tieBreakReason,
      thresholdSource: taxonomy.thresholdSource,
      neighborhoodSummary: taxonomy.neighborhoodSummary,
      burstRationale: taxonomy.rationale,
    };
  });
};
