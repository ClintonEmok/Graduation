/**
 * Canonical crime record type - single source of truth for all crime data.
 * All components and hooks should use this format.
 * 
 * This type aligns with the API response from /api/crimes/range endpoint.
 */
export interface CrimeRecord {
  /** Unique identifier - generated client-side if not provided by API */
  id?: string
  /** Unix epoch timestamp in seconds */
  timestamp: number
  /** Geographic latitude */
  lat: number
  /** Geographic longitude */
  lon: number
  /** Normalized spatial x coordinate (-50 to +50) */
  x: number
  /** Normalized spatial z coordinate (-50 to +50) */
  z: number
  /** Crime category (e.g., "THEFT", "BATTERY") */
  type: string
  /** Police district */
  district: string
  /** Year extracted from date */
  year: number
  /** IUCR code */
  iucr: string
}

/**
 * Input type for creating crime records (partial - fields optional)
 */
export type CrimeRecordInput = Partial<CrimeRecord>

/**
 * Viewport bounds for querying crime data
 */
export interface CrimeViewport {
  startEpoch: number
  endEpoch: number
  crimeTypes?: string[]
  districts?: string[]
}

/**
 * Options for useCrimeData hook
 */
export interface UseCrimeDataOptions {
  startEpoch: number
  endEpoch: number
  crimeTypes?: string[]
  districts?: string[]
  /**
   * Phase 81 Wave 3: deprecated. The exact paged contract no longer
   * applies buffer days — the client controls the exact range it
   * wants. Kept for backward compatibility with existing dashboard
   * consumers; the value is ignored server-side.
   */
  bufferDays?: number
  /**
   * Phase 81 Wave 3: deprecated. The new exact paged contract uses
   * `pageSize` instead. Kept for backward compatibility with existing
   * consumers; if both are passed, `pageSize` wins.
   */
  limit?: number
  /**
   * Phase 81 Wave 3: page size for the keyset paged read against
   * the persisted fact table. Defaults to 5000 on the server.
   * Values above 50000 will trigger `requiresNarrowing`.
   */
  pageSize?: number
  /**
   * Phase 81 Wave 3: opaque cursor returned by the previous page.
   * Pass it back to fetch the next page in a stable order.
   */
  cursor?: string | null
  /**
   * Phase 81 Wave 3: optional target string (slice id, brush id, etc.)
   * forwarded to the API for server-side tracing.
   */
  target?: string | null
}

/**
 * Metadata returned with crime range responses.
 */
export interface CrimeDataMeta {
  viewport?: {
    start: number
    end: number
  }
  buffer?: {
    days: number
    applied: {
      start: number
      end: number
    }
  }
  returned: number
  limit: number
  totalMatches?: number
  /**
   * Phase 81 Wave 3: cursor metadata for keyset paged reads.
   * `hasMore = true` indicates the client can call the API again
   * with `nextCursor` to fetch the next page.
   */
  hasMore?: boolean
  nextCursor?: string | null
  /**
   * Phase 81 Wave 3: structured narrowing prompt payload. When set,
   * the client should surface a "narrow the range / filters" message
   * instead of silently falling back to a broader read.
   */
  requiresNarrowing?: {
    reason: 'range-too-broad' | 'page-size-too-large'
    maxRangeSec: number
    requestedRangeSec: number
    maxPageSize: number
    requestedPageSize: number
    message: string
  }
  /**
   * Legacy sampled-response fields. Phase 81 Wave 3 always returns
   * unsampled exact rows from the persisted fact table, so these
   * remain `undefined` for dashboard reads.
   */
  sampled?: boolean
  sampleStride?: number
  /**
   * Phase 81 Wave 3: optional identifier of the originating target
   * (slice id, brush id, etc.) for downstream tracing.
   */
  target?: string | null
}

/**
 * Result from useCrimeData hook
 */
export interface UseCrimeDataResult {
  data: CrimeRecord[]
  meta: CrimeDataMeta | null
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage?: boolean
  error: Error | null
  hasMore: boolean
  nextCursor: string | null
  requiresNarrowing: CrimeDataMeta['requiresNarrowing'] | null
  bufferedRange: {
    start: number
    end: number
  }
  /**
   * Fetch the next page using the `nextCursor` returned by the previous
   * call. Returns the freshly fetched records; appends them to the
   * internal cache (replaceable, not accumulate — D-09).
   */
  fetchNextPage: () => Promise<CrimeRecord[] | null>
}
