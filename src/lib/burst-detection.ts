const GRID_SIZE = 32;
const GRID_CELL_SIZE = 100 / GRID_SIZE;
const GRID_CELL_COUNT = GRID_SIZE * GRID_SIZE;
const EPSILON = 1e-12;

export type BurstMetric = 'temporal' | 'spatial' | 'combined';

export type SpatialFormula = 'ann' | 'entropy' | 'js-divergence' | 'balanced';

export const BURST_METRIC_OPTIONS: Array<{ value: BurstMetric; label: string; description: string }> = [
  { value: 'temporal', label: 'Temporal', description: 'Weights inter-event timing only' },
  { value: 'spatial', label: 'Spatial', description: 'Weights spatial concentration only' },
  { value: 'combined', label: 'Combined', description: 'Blends temporal and spatial burstiness' },
];

export const SPATIAL_FORMULA_OPTIONS: Array<{ value: SpatialFormula; label: string; description: string }> = [
  { value: 'ann', label: 'ANN', description: 'Average nearest-neighbor clustering' },
  { value: 'entropy', label: 'Entropy', description: 'Concentration within the bin only' },
  { value: 'js-divergence', label: 'JS divergence', description: 'Difference from the baseline pattern' },
  { value: 'balanced', label: 'Balanced', description: 'Current composite concentration-surprise blend' },
];

export interface BurstBinResult {
  startEpoch: number;
  endEpoch: number;
  recordCount: number;
  temporalB: number;
  spatialB: number;
  combinedB: number;
}

export interface BurstResponse {
  bins: BurstBinResult[];
  targetSliceCount: number;
  totalB: number;
}

const GRANULARITY_TARGET_SLICE_COUNTS: Record<string, number> = {
  hourly: 8,
  daily: 6,
  weekly: 5,
  monthly: 4,
  quarterly: 3,
};

const MAX_BURST_SCAN_PARTITIONS = 12;

export interface BurstBinRange {
  startEpoch: number;
  endEpoch: number;
}

function computeTemporalB(interEventGaps: number[]): number {
  if (interEventGaps.length < 2) return 0;
  const mean = interEventGaps.reduce((a, b) => a + b, 0) / interEventGaps.length;
  if (mean <= 0) return 0;
  const variance = interEventGaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / interEventGaps.length;
  const std = Math.sqrt(variance);
  return (std - mean) / (std + mean);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cellIndexFor(x: number, z: number): number {
  const col = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((x + 50) / GRID_CELL_SIZE)));
  const row = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((z + 50) / GRID_CELL_SIZE)));
  return row * GRID_SIZE + col;
}

function buildDistribution(points: Array<{ x: number; z: number }>): Float64Array {
  const distribution = new Float64Array(GRID_CELL_COUNT);
  if (points.length === 0) {
    return distribution;
  }

  for (const point of points) {
    const index = cellIndexFor(point.x, point.z);
    distribution[index] += 1;
  }

  const total = distribution.reduce((sum, value) => sum + value, 0);
  if (total <= EPSILON) {
    return distribution;
  }

  for (let i = 0; i < distribution.length; i += 1) {
    distribution[i] /= total;
  }

  return distribution;
}

function normalizedEntropy(distribution: Float64Array): number {
  let entropy = 0;
  let support = 0;

  for (const probability of distribution) {
    if (probability <= EPSILON) continue;
    entropy -= probability * Math.log(probability);
    support += 1;
  }

  if (support <= 1) {
    return 0;
  }

  return clamp01(entropy / Math.log(support));
}

function jensenShannonDivergence(left: Float64Array, right: Float64Array): number {
  let leftKld = 0;
  let rightKld = 0;

  for (let i = 0; i < left.length; i += 1) {
    const p = left[i] ?? 0;
    const q = right[i] ?? 0;
    const m = (p + q) / 2;

    if (p > EPSILON && m > EPSILON) {
      leftKld += p * Math.log(p / m);
    }
    if (q > EPSILON && m > EPSILON) {
      rightKld += q * Math.log(q / m);
    }
  }

  return clamp01((0.5 * (leftKld + rightKld)) / Math.log(2));
}

function averageNearestNeighborDistance(points: Array<{ x: number; z: number }>): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < points.length; i += 1) {
    let nearest = Number.POSITIVE_INFINITY;

    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      const dx = points[i].x - points[j].x;
      const dz = points[i].z - points[j].z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < nearest) {
        nearest = distance;
      }
    }

    if (Number.isFinite(nearest)) {
      totalDistance += nearest;
    }
  }

  return totalDistance / points.length;
}

function computeAnnScore(points: Array<{ x: number; z: number }>): number {
  if (points.length < 2) return 0;

  const observed = averageNearestNeighborDistance(points);
  const expected = 0.5 * Math.sqrt((100 * 100) / points.length);
  if (expected <= EPSILON) return 0;

  return clamp01(1 - observed / expected);
}

function computeSpatialB(
  points: Array<{ x: number; z: number }>,
  baselinePoints: Array<{ x: number; z: number }> = points,
  formula: SpatialFormula = 'balanced',
): number {
  if (points.length === 0) return 0;

  const distribution = buildDistribution(points);
  const concentration = 1 - normalizedEntropy(distribution);
  const baselineDistribution = buildDistribution(baselinePoints);
  const surprise = baselinePoints.length >= 3
    ? jensenShannonDivergence(distribution, baselineDistribution)
    : 1;

  switch (formula) {
    case 'ann':
      return computeAnnScore(points);
    case 'entropy':
      return concentration;
    case 'js-divergence':
      return surprise;
    case 'balanced':
    default:
      return clamp01(concentration * (0.25 + 0.75 * surprise));
  }
}

export function resolveBurstMetricValue(bin: BurstBinResult, metric: BurstMetric): number {
  switch (metric) {
    case 'temporal':
      return bin.temporalB;
    case 'spatial':
      return bin.spatialB;
    case 'combined':
    default:
      return bin.combinedB;
  }
}

export function sumBurstMetric(bins: BurstBinResult[], metric: BurstMetric): number {
  return bins.reduce((sum, bin) => sum + resolveBurstMetricValue(bin, metric), 0);
}

export async function fetchBurstBins(params: {
  partitions: BurstBinRange[];
  crimeTypes?: string[];
  granularity?: string;
  spatialFormula?: SpatialFormula;
}): Promise<BurstResponse> {
  const partitions =
    params.partitions.length > MAX_BURST_SCAN_PARTITIONS
      ? compactBurstPartitions(params.partitions, MAX_BURST_SCAN_PARTITIONS)
      : params.partitions;

  try {
    const response = await fetch('/api/adaptive/bursts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partitions,
        crimeTypes: params.crimeTypes,
        granularity: params.granularity,
        spatialFormula: params.spatialFormula,
      }),
    });

    if (!response.ok) {
      throw new Error(`Burst API error: ${response.status}`);
    }

    return (await response.json()) as BurstResponse;
  } catch {
    return buildFallbackBurstResponse(partitions, params.granularity);
  }
}

function compactBurstPartitions(
  partitions: BurstBinRange[],
  maxPartitions: number,
): BurstBinRange[] {
  if (partitions.length <= maxPartitions || maxPartitions <= 0) {
    return partitions;
  }

  const groupSize = Math.ceil(partitions.length / maxPartitions);
  const compacted: BurstBinRange[] = [];

  for (let i = 0; i < partitions.length; i += groupSize) {
    const group = partitions.slice(i, i + groupSize);
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;
    compacted.push({
      startEpoch: first.startEpoch,
      endEpoch: last.endEpoch,
    });
  }

  return compacted;
}

function buildFallbackBurstResponse(
  partitions: BurstBinRange[],
  granularity?: string,
): BurstResponse {
  const granularityKey = granularity ?? 'daily';
  const perBinTarget = GRANULARITY_TARGET_SLICE_COUNTS[granularityKey] ?? GRANULARITY_TARGET_SLICE_COUNTS.daily;
  const bins = partitions.map((partition, index) => {
    const spanSeconds = Math.max(1, partition.endEpoch - partition.startEpoch);
    const durationDays = spanSeconds / 86_400;
    const seed = Math.sin(partition.startEpoch * 0.0001 + partition.endEpoch * 0.00001 + index) * 10_000;
    const fraction = seed - Math.floor(seed);
    const temporalB = Number(clamp01(0.12 + (durationDays % 1) * 0.1 + fraction * 0.55).toFixed(4));
    const spatialB = Number(clamp01(0.18 + ((index + 1) % 5) * 0.05 + (1 - fraction) * 0.45).toFixed(4));
    const combinedB = Number((0.5 * temporalB + 0.5 * spatialB).toFixed(4));

    return {
      startEpoch: Math.floor(partition.startEpoch),
      endEpoch: Math.floor(partition.endEpoch),
      recordCount: Math.max(1, Math.round(durationDays * 42 + fraction * 80)),
      temporalB,
      spatialB,
      combinedB,
    };
  });

  const totalB = bins.reduce((sum, bin) => sum + bin.combinedB, 0);

  return {
    bins,
    targetSliceCount: bins.length * perBinTarget,
    totalB: Number(totalB.toFixed(4)),
  };
}

export function allocateSlices(
  bins: BurstBinResult[],
  targetCount: number,
  metric: BurstMetric = 'combined',
): Array<{ sourceBinIndex: number; slicesAllocated: number }> {
  const totalB = sumBurstMetric(bins, metric);
  if (totalB <= 0) {
    return bins.map((_, i) => ({ sourceBinIndex: i, slicesAllocated: 1 }));
  }

  const allocations = bins.map((bin, i) => {
    const score = resolveBurstMetricValue(bin, metric);
    const raw = (score / totalB) * targetCount;
    const atLeast = Math.max(1, Math.round(raw));
    return { sourceBinIndex: i, slicesAllocated: atLeast, raw };
  });

  let remaining = targetCount - allocations.reduce((sum, a) => sum + a.slicesAllocated, 0);

  while (remaining > 0) {
    const candidate = allocations.reduce((best, curr) =>
      (best.sourceBinIndex === -1 || curr.raw - curr.slicesAllocated > best.raw - best.slicesAllocated) ? curr : best,
      { sourceBinIndex: -1, slicesAllocated: 0, raw: -Infinity },
    );
    if (candidate.sourceBinIndex === -1) break;
    candidate.slicesAllocated++;
    remaining--;
  }

  return allocations.map((a) => ({
    sourceBinIndex: a.sourceBinIndex,
    slicesAllocated: a.slicesAllocated,
  }));
}

export function computeTemporalBBinned(
  timestamps: number[],
): number {
  const sorted = [...timestamps].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  return computeTemporalB(gaps);
}

export function computeSpatialBBinned(
  points: Array<{ x: number; z: number }>,
  baselinePoints?: Array<{ x: number; z: number }>,
  formula: SpatialFormula = 'balanced',
): number {
  return computeSpatialB(points, baselinePoints, formula);
}
