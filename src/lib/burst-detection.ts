const GRID_SIZE = 32;
const GRID_CELL_SIZE = 100 / GRID_SIZE;
const GRID_CELL_COUNT = GRID_SIZE * GRID_SIZE;
const EPSILON = 1e-12;

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

function computeSpatialB(
  points: Array<{ x: number; z: number }>,
  baselinePoints: Array<{ x: number; z: number }> = points,
): number {
  if (points.length === 0) return 0;

  const concentration = 1 - normalizedEntropy(buildDistribution(points));
  const baselineDistribution = buildDistribution(baselinePoints);
  const surprise = baselinePoints.length >= 3
    ? jensenShannonDivergence(buildDistribution(points), baselineDistribution)
    : 1;
  const surpriseLift = 0.25 + 0.75 * surprise;

  return clamp01(concentration * surpriseLift);
}

export async function fetchBurstBins(params: {
  partitions: BurstBinRange[];
  crimeTypes?: string[];
  granularity?: string;
}): Promise<BurstResponse> {
  const baselineRange = params.partitions.reduce(
    (acc, partition) => ({
      startEpoch: Math.min(acc.startEpoch, partition.startEpoch),
      endEpoch: Math.max(acc.endEpoch, partition.endEpoch),
    }),
    { startEpoch: Number.POSITIVE_INFINITY, endEpoch: Number.NEGATIVE_INFINITY },
  );

  const bins = await Promise.all(
    params.partitions.map(async (partition) => {
      const searchParams = new URLSearchParams({
        startEpoch: Math.floor(partition.startEpoch).toString(),
        endEpoch: Math.floor(partition.endEpoch).toString(),
        baselineStartEpoch: Math.floor(baselineRange.startEpoch).toString(),
        baselineEndEpoch: Math.floor(baselineRange.endEpoch).toString(),
      });

      if (params.crimeTypes?.length) {
        searchParams.set('crimeTypes', params.crimeTypes.join(','));
      }

      if (params.granularity) {
        searchParams.set('granularity', params.granularity);
      }

      const response = await fetch(`/api/adaptive/bursts?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Burst API error: ${response.status}`);
      }

      const payload = (await response.json()) as BurstResponse;
      return payload.bins[0] ?? null;
    }),
  );

  const filteredBins = bins.filter((bin): bin is BurstBinResult => bin !== null);
  const totalB = filteredBins.reduce((sum, bin) => sum + bin.combinedB, 0);
  const targetSliceCount = filteredBins.reduce((sum, _, index) => {
    const granularity = params.granularity ?? 'daily';
    return sum + (GRANULARITY_TARGET_SLICE_COUNTS[granularity] ?? GRANULARITY_TARGET_SLICE_COUNTS.daily);
  }, 0);

  return {
    bins: filteredBins,
    targetSliceCount,
    totalB: Number(totalB.toFixed(4)),
  };
}

export function allocateSlices(
  bins: BurstBinResult[],
  targetCount: number,
): Array<{ sourceBinIndex: number; slicesAllocated: number }> {
  const totalB = bins.reduce((sum, b) => sum + b.combinedB, 0);
  if (totalB <= 0) {
    return bins.map((_, i) => ({ sourceBinIndex: i, slicesAllocated: 1 }));
  }

  const allocations = bins.map((bin, i) => {
    const raw = (bin.combinedB / totalB) * targetCount;
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
): number {
  return computeSpatialB(points, baselinePoints);
}
