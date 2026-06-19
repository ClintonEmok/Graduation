export type QueryFragment = {
  sql: string;
  params: unknown[];
};

// Re-export CrimeRecord and related types from canonical location
export type { CrimeRecord, CrimeRecordInput, CrimeViewport, UseCrimeDataOptions, CrimeDataMeta } from '@/types/crime';

export interface QueryCrimesOptions {
  limit?: number;
  /**
   * Legacy stride for sampled reads against the `crimes_sorted` table.
   *
   * Phase 81 Wave 3: exact dashboard detail reads now go through
   * `queryCrimesInRangePaged` against the persisted `crimes_fact` table.
   * The `sampleStride` field is preserved only for non-dashboard consumers
   * (STKDE hotspots, adaptive bursts) that still rely on the legacy
   * sampled-timestamp contract. New dashboard detail code MUST NOT use it.
   */
  sampleStride?: number;
  crimeTypes?: string[];
  districts?: string[];
}

export interface QueryFilters {
  crimeTypes?: string[];
  districts?: string[];
}

/**
 * Phase 81 Wave 3: cursor for keyset paging over the persisted
 * `crimes_fact` table. The (timestamp_sec, row_id) tuple is the
 * stable sort key documented in `db.ts#ensureCrimesFactTable`.
 */
export interface RangeQueryCursor {
  ts: number;
  rowId: number;
}

export interface RangePagedRequest {
  tableName: string;
  startEpoch: number;
  endEpoch: number;
  crimeTypes?: string[];
  districts?: string[];
  pageSize: number;
  cursor?: RangeQueryCursor | null;
  /**
   * Optional target string (slice id, brush id, etc.) propagated for
   * server-side tracing. Has no effect on the SQL.
   */
  target?: string | null;
}

export interface RangePagedRow {
  timestamp: number;
  type: string;
  lat: number;
  lon: number;
  x: number;
  z: number;
  iucr: string;
  district: string;
  year: number;
  rowId: number;
}

export interface RangePagedResult {
  rows: RangePagedRow[];
  /**
   * `true` if the server returned at least one more row than `pageSize`,
   * signalling the client can fetch the next page via `nextCursor`.
   */
  hasMore: boolean;
  /**
   * Opaque, stable cursor pointing to the first row of the next page.
   * `null` when the current page is the last one.
   */
  nextCursor: RangeQueryCursor | null;
}

/**
 * Phase 81 Wave 3: product guardrail signal returned in the response meta
 * when a request is too broad to safely serve in one call. UI consumers
 * MUST prompt the user to narrow filters or the time window instead of
 * silently falling back to a sampled/over-broad read.
 */
export interface RequiresNarrowing {
  reason: 'range-too-broad' | 'page-size-too-large';
  maxRangeSec: number;
  requestedRangeSec: number;
  maxPageSize: number;
  requestedPageSize: number;
  message: string;
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
