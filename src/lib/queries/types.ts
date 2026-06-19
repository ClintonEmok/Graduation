export type QueryFragment = {
  sql: string;
  params: unknown[];
};

// Re-export CrimeRecord and related types from canonical location
export type { CrimeRecord, CrimeRecordInput, CrimeViewport, UseCrimeDataOptions, CrimeDataMeta } from '@/types/crime';

export interface QueryCrimesOptions {
  limit?: number;
  sampleStride?: number;
  crimeTypes?: string[];
  districts?: string[];
}

export interface QueryFilters {
  crimeTypes?: string[];
  districts?: string[];
}

import type { AdaptiveBinningMode } from '@/types/adaptive';

export interface GlobalAdaptiveMaps {
  binCount: number;
  kernelWidth: number;
   binningMode: AdaptiveBinningMode;
  domain: [number, number];
  rowCount: number;
  densityMap: Float32Array;
   countMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  generatedAt: string;
}

export interface DensityBin {
  x: number;
  y: number;
  z: number;
  count: number;
  dominantType: string;
}
