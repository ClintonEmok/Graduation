import type { CrimeDataMeta, CrimeRecord } from '@/types/crime';

export const selectionDetailLimit = 200000;
export const selectionDetailRenderMaxPoints = 4000;
export const selectionDetailDiagnosticsMaxPoints = 120000;
export const selectionDetailSafetyThreshold = 180000;

export type SelectionDetailFallbackReason =
  | 'selection-fetch-error'
  | 'selection-empty'
  | 'selection-exceeded-safety-threshold';

export interface SelectionDetailDataset {
  renderTimestamps: number[];
  diagnosticsTimestamps: number[];
  diagnosticsSource: 'selection' | 'context';
  fallbackToContextReason: SelectionDetailFallbackReason | null;
  renderDownsampled: boolean;
  renderDownsampleStride: number;
  diagnosticsCapped: boolean;
  diagnosticsCapReason: 'diagnostics-max-points' | null;
  selectionPopulation: {
    rawSelectionCount: number;
    returnedCount: number;
    totalMatches: number;
    sampled: boolean;
    sampleStride: number | null;
    fullPopulation: boolean;
  };
}

interface BuildSelectionDetailDatasetOptions {
  rangeStartSec: number;
  rangeEndSec: number;
  selectionData: CrimeRecord[];
  selectionMeta: CrimeDataMeta | null;
  selectionError: Error | null;
  contextTimestamps: number[];
}

const toNonNegativeInteger = (value: number | null | undefined): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.floor(value as number));
};

const filterToFiniteRange = (timestamps: number[], startSec: number, endSec: number): number[] => {
  const start = Math.min(startSec, endSec);
  const end = Math.max(startSec, endSec);
  return timestamps.filter((value) => Number.isFinite(value) && value >= start && value <= end);
};

const downsampleToMaxPoints = (
  timestamps: number[],
  maxPoints: number,
): { points: number[]; downsampled: boolean; stride: number } => {
  if (timestamps.length <= maxPoints) {
    return {
      points: timestamps,
      downsampled: false,
      stride: 1,
    };
  }

  const stride = Math.max(1, Math.ceil(timestamps.length / maxPoints));
  const points = timestamps.filter((_, index) => index % stride === 0).slice(0, maxPoints);

  return {
    points,
    downsampled: true,
    stride,
  };
};

export const buildSelectionDetailDataset = ({
  rangeStartSec,
  rangeEndSec,
  selectionData,
  selectionMeta,
  selectionError,
  contextTimestamps,
}: BuildSelectionDetailDatasetOptions): SelectionDetailDataset => {
  const selectionTimestamps = filterToFiniteRange(
    selectionData.map((record) => record.timestamp),
    rangeStartSec,
    rangeEndSec,
  );
  const contextRangeTimestamps = filterToFiniteRange(contextTimestamps, rangeStartSec, rangeEndSec);

  const inferredReturnedCount = selectionTimestamps.length;
  const metaReturnedCount = toNonNegativeInteger(selectionMeta?.returned);
  const returnedCount = metaReturnedCount ?? inferredReturnedCount;
  const metaTotalMatches = toNonNegativeInteger(selectionMeta?.totalMatches);
  const totalMatches = Math.max(metaTotalMatches ?? returnedCount, returnedCount);
  const rawSelectionCount = totalMatches;
  const sampled = selectionMeta?.sampled ?? totalMatches > returnedCount;
  const sampleStride = selectionMeta?.sampleStride ?? null;
  const fullPopulation = !sampled && returnedCount >= totalMatches;
  const effectiveSelectionCount = Math.max(returnedCount, inferredReturnedCount);

  let fallbackToContextReason: SelectionDetailFallbackReason | null = null;
  if (selectionError) {
    fallbackToContextReason = 'selection-fetch-error';
  } else if (effectiveSelectionCount === 0) {
    fallbackToContextReason = 'selection-empty';
  } else if (effectiveSelectionCount > selectionDetailSafetyThreshold) {
    fallbackToContextReason = 'selection-exceeded-safety-threshold';
  }

  const usingSelection = fallbackToContextReason === null;
  const sourceTimestamps = usingSelection ? selectionTimestamps : contextRangeTimestamps;

  const renderDownsample = downsampleToMaxPoints(sourceTimestamps, selectionDetailRenderMaxPoints);
  const diagnosticsCap = downsampleToMaxPoints(sourceTimestamps, selectionDetailDiagnosticsMaxPoints);

  return {
    renderTimestamps: renderDownsample.points,
    diagnosticsTimestamps: diagnosticsCap.points,
    diagnosticsSource: usingSelection ? 'selection' : 'context',
    fallbackToContextReason,
    renderDownsampled: renderDownsample.downsampled,
    renderDownsampleStride: renderDownsample.stride,
    diagnosticsCapped: diagnosticsCap.downsampled,
    diagnosticsCapReason: diagnosticsCap.downsampled ? 'diagnostics-max-points' : null,
    selectionPopulation: {
      rawSelectionCount,
      returnedCount,
      totalMatches,
      sampled,
      sampleStride,
      fullPopulation,
    },
  };
};
