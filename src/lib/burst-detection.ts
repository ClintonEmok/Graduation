import { computeSliceKde } from '@/lib/kde';

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

function computeTemporalB(interEventGaps: number[]): number {
  if (interEventGaps.length < 2) return 0;
  const mean = interEventGaps.reduce((a, b) => a + b, 0) / interEventGaps.length;
  if (mean <= 0) return 0;
  const variance = interEventGaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / interEventGaps.length;
  const std = Math.sqrt(variance);
  return (std - mean) / (std + mean);
}

function computeSpatialB(points: Array<{ x: number; z: number }>): number {
  if (points.length < 3) return 0;
  const { cells, maxIntensity } = computeSliceKde(points);
  if (maxIntensity <= 0 || cells.length === 0) return 0;
  const meanIntensity = cells.reduce((sum, c) => sum + c.intensity, 0) / cells.length;
  return 1 - meanIntensity / maxIntensity;
}

export async function fetchBurstBins(params: {
  startEpoch: number;
  endEpoch: number;
  binCount?: number;
  granularity?: string;
  crimeTypes?: string[];
}): Promise<BurstResponse> {
  const searchParams = new URLSearchParams({
    startEpoch: params.startEpoch.toString(),
    endEpoch: params.endEpoch.toString(),
    binCount: (params.binCount ?? 10).toString(),
    granularity: params.granularity ?? 'daily',
  });

  if (params.crimeTypes?.length) {
    searchParams.set('crimeTypes', params.crimeTypes.join(','));
  }

  const response = await fetch(`/api/adaptive/bursts?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Burst API error: ${response.status}`);
  }

  return response.json() as Promise<BurstResponse>;
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
): number {
  return computeSpatialB(points);
}
