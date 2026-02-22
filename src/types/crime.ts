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
  bufferDays?: number
  limit?: number
}

/**
 * Result from useCrimeData hook
 */
export interface UseCrimeDataResult {
  data: CrimeRecord[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  bufferedRange: {
    start: number
    end: number
  }
}
