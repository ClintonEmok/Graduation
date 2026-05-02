import { useMemo } from 'react';
import { ADAPTIVE_BIN_COUNT } from '@/lib/adaptive-utils';
import { clampToRange } from '@/components/timeline/lib/interaction-guards';

export const DETAIL_DENSITY_RECOMPUTE_MAX_DAYS = 60;
export const DETAIL_DENSITY_BIN_MULTIPLIER = 1.5;
export const DETAIL_DENSITY_KERNEL_WIDTH = 1;

export const computeDensityMap = (
  timestamps: number[],
  domain: [number, number],
  binCount: number,
  kernelWidth: number
): Float32Array => {
  const [start, end] = domain;
  const span = end - start || 1;
  const bins = new Float32Array(binCount);

  for (let i = 0; i < timestamps.length; i += 1) {
    const t = timestamps[i];
    if (!Number.isFinite(t)) continue;
    const norm = (t - start) / span;
    if (norm < 0 || norm > 1) continue;
    const idx = Math.min(Math.floor(norm * binCount), binCount - 1);
    bins[idx] += 1;
  }

  let smoothed = bins;
  if (kernelWidth > 1) {
    smoothed = new Float32Array(binCount);
    for (let i = 0; i < binCount; i += 1) {
      let sum = 0;
      let count = 0;
      for (let k = -kernelWidth; k <= kernelWidth; k += 1) {
        const idx = i + k;
        if (idx >= 0 && idx < binCount) {
          sum += bins[idx];
          count += 1;
        }
      }
      smoothed[i] = count > 0 ? sum / count : 0;
    }
  }

  let maxVal = 0;
  for (let i = 0; i < smoothed.length; i += 1) {
    if (smoothed[i] > maxVal) maxVal = smoothed[i];
  }
  if (maxVal === 0) maxVal = 1;

  const normalized = new Float32Array(binCount);
  for (let i = 0; i < binCount; i += 1) {
    normalized[i] = smoothed[i] / maxVal;
  }

  return normalized;
};

export interface DensityStripDerivationParams {
  detailPoints: number[];
  detailRangeSec: [number, number];
  densityMap: Float32Array | null;
  domainStart: number;
  domainEnd: number;
}

export interface DensityStripDerivationResult {
  detailSpanDays: number;
  detailDensityMap: Float32Array | null;
}

export const deriveDetailDensityMap = (
  detailPoints: number[],
  detailRangeSec: [number, number],
  densityMap: Float32Array | null,
  domainStart: number,
  domainEnd: number
): Float32Array | null => {
  const detailSpanDays = Math.abs(detailRangeSec[1] - detailRangeSec[0]) / 86400;
  const hasPoints = detailPoints.length > 0;
  const baseBinCount = densityMap?.length ?? ADAPTIVE_BIN_COUNT;
  if (hasPoints) {
    const detailBinCount = Math.max(baseBinCount, Math.round(baseBinCount * DETAIL_DENSITY_BIN_MULTIPLIER));
    return computeDensityMap(detailPoints, detailRangeSec, detailBinCount, DETAIL_DENSITY_KERNEL_WIDTH);
  }

  if (!densityMap || densityMap.length === 0) return densityMap;
  const span = domainEnd - domainStart || 1;
  const startRatio = clampToRange((detailRangeSec[0] - domainStart) / span, 0, 1);
  const endRatio = clampToRange((detailRangeSec[1] - domainStart) / span, 0, 1);
  const rangeStart = Math.min(startRatio, endRatio);
  const rangeEnd = Math.max(startRatio, endRatio);
  const lastIndex = Math.max(0, densityMap.length - 1);
  const startIndex = clampToRange(Math.floor(rangeStart * lastIndex), 0, lastIndex);
  const endIndex = clampToRange(Math.ceil(rangeEnd * lastIndex), startIndex, lastIndex);
  return densityMap.subarray(startIndex, Math.min(densityMap.length, endIndex + 1));
};

export const useDensityStripDerivation = ({
  detailPoints,
  detailRangeSec,
  densityMap,
  domainStart,
  domainEnd,
}: DensityStripDerivationParams): DensityStripDerivationResult => {
  const detailSpanDays = useMemo(() => {
    const spanSeconds = Math.abs(detailRangeSec[1] - detailRangeSec[0]);
    return spanSeconds / 86400;
  }, [detailRangeSec]);

  const detailDensityMap = useMemo(() => {
    return deriveDetailDensityMap(detailPoints, detailRangeSec, densityMap, domainStart, domainEnd);
  }, [densityMap, detailPoints, detailRangeSec, detailSpanDays, domainEnd, domainStart]);

  return {
    detailSpanDays,
    detailDensityMap,
  };
};
