/**
 * Viewport-based crime data fetching hook.
 * Fetches data only for visible time range + buffer to optimize loading.
 * 
 * This is a thin wrapper around useCrimeData that:
 * - Gets viewport bounds from the viewport store
 * - Passes them to useCrimeData
 * - Returns CrimeRecord[] format
 * 
 * @deprecated Use useCrimeData directly for new code.
 * This hook is kept for backward compatibility with existing consumers.
 */
import { useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore'
import { useCrimeData } from './useCrimeData'
import { CrimeDataMeta, CrimeRecord } from '@/types/crime'

export interface UseViewportCrimeDataOptions {
  /** Number of days to buffer around viewport (default: 30) */
  bufferDays?: number
  /** Optional crime types filter */
  crimeTypes?: string[]
  /** Optional districts filter */
  districts?: string[]
  /** Optional limit on number of records (default: 50000) */
  limit?: number
}

export interface UseViewportCrimeDataResult {
  data: CrimeRecord[]
  meta: CrimeDataMeta | null
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  /** The buffered date range used for the query */
  bufferedRange: {
    start: number
    end: number
  }
}

/**
 * Hook to fetch crime data based on current viewport.
 * Re-fetches automatically when viewport changes.
 * 
 * @param options - Configuration options
 * @param options.bufferDays - Days to buffer around viewport (default: 30)
 * @param options.crimeTypes - Optional crime types filter
 * @param options.districts - Optional districts filter
 * @param options.limit - Optional max records (default: 50000)
 */
export function useViewportCrimeData(
  options: UseViewportCrimeDataOptions = {}
): UseViewportCrimeDataResult {
  const { 
    bufferDays = 30, 
    crimeTypes, 
    districts,
    limit = 50000 
  } = options
  
  // Subscribe to viewport bounds using individual selectors
  const startDate = useViewportStart()
  const endDate = useViewportEnd()
  
  // Use the unified useCrimeData hook with viewport bounds
  const result = useCrimeData({
    startEpoch: startDate,
    endEpoch: endDate,
    crimeTypes,
    districts,
    bufferDays,
    limit,
  })
  
  return {
    data: result.data,
    meta: result.meta,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    bufferedRange: result.bufferedRange,
  }
}
