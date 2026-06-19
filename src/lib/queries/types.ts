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

/**
 * Phase 81: persisted analytics types.
 *
 * The overview response replaces the legacy sampled-timestamp contract with
 * server-side pre-binned counts plus explicit domain metadata so downstream
 * UI can render without rebucketing a large raw timestamp payload.
 */
export interface OverviewBin {
  binIndex: number;
  startEpoch: number;
  endEpoch: number;
  count: number;
}

export interface OverviewDomain {
  startEpoch: number;
  endEpoch: number;
  binCount: number;
  binSizeSec: number;
}

export interface OverviewFilter {
  crimeTypes: string[];
  districts: string[];
}

export interface OverviewResponse {
  domain: OverviewDomain;
  bins: OverviewBin[];
  filter: OverviewFilter;
  fingerprint: string;
  builtAt: string;
}

/**
 * Phase 81: persisted dataset metadata response shape.
 *
 * Extends the legacy metadata response with a `fingerprint` so callers can
 * reason about when the persisted tables were last rebuilt.
 */
export interface DatasetMetadata {
  minTime: number;
  maxTime: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  count: number;
  yearMin: number;
  yearMax: number;
  crimeTypes: string[];
  fingerprint: string;
  builtAt: string;
}
