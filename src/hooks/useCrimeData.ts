/**
 * Unified hook for fetching crime data.
 * Single entry point for all crime data fetching in the application.
 * 
 * This hook:
 * - Accepts viewport bounds as parameters (not from store - let caller decide)
 * - Passes the visible range to /api/crimes/range
 * - Lets the API apply any requested buffering
 * - Returns CrimeRecord[] format
 * - Handles errors gracefully
 */
import { useQuery } from '@tanstack/react-query'
import { 
  CrimeDataMeta,
  CrimeRecord, 
  UseCrimeDataOptions, 
  UseCrimeDataResult 
} from '@/types/crime'

interface CrimeRangeResponse {
  data: CrimeRecord[]
  meta?: CrimeDataMeta
}

/**
 * Fetch crime data for a date range from the API
 */
async function fetchCrimesInRange(
  startEpoch: number,
  endEpoch: number,
  bufferDays: number,
  crimeTypes?: string[],
  districts?: string[],
  limit?: number
): Promise<CrimeRangeResponse> {
  try {
    const params = new URLSearchParams({
      startEpoch: startEpoch.toString(),
      endEpoch: endEpoch.toString(),
      bufferDays: bufferDays.toString(),
    })
    
    if (crimeTypes?.length) {
      params.append('crimeTypes', crimeTypes.join(','))
    }
    if (districts?.length) {
      params.append('districts', districts.join(','))
    }
    if (limit) {
      params.append('limit', limit.toString())
    }
    
    const response = await fetch(`/api/crimes/range?${params.toString()}`)
    
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
    
    const result = (await response.json()) as CrimeRangeResponse
    
    // API returns { data: CrimeRecord[], meta: {...} }
    return {
      data: result.data || [],
      meta: result.meta,
    }
  } catch (error) {
    console.error('[useCrimeData] Error fetching crimes:', error)
    throw error
  }
}

/**
 * Unified hook for crime data fetching.
 * 
 * @param options - Query options including viewport bounds and filters
 * 
 * @example
 * const { data, isLoading, error } = useCrimeData({
 *   startEpoch: 978307200,  // 2001-01-01
 *   endEpoch: 1767571200,   // 2026-01-01
 *   bufferDays: 30,
 *   limit: 50000
 * })
 */
export function useCrimeData(
  options: UseCrimeDataOptions
): UseCrimeDataResult {
  const { 
    startEpoch, 
    endEpoch, 
    crimeTypes, 
    districts, 
    bufferDays = 30,
    limit = 50000 
  } = options
  
  const queryKey = [
    'crimes', 
    'viewport', 
    startEpoch,
    endEpoch,
    bufferDays,
    crimeTypes,
    districts
  ];
  
  console.log('[useCrimeData] queryKey (visible range):', queryKey);
  
  const query = useQuery({
    queryKey,
    queryFn: () => fetchCrimesInRange(
      startEpoch,
      endEpoch,
      bufferDays,
      crimeTypes,
      districts,
      limit
    ),
    // Keep old data while fetching new to prevent UI flash
    placeholderData: (previousData) => previousData,
    // Don't refetch on window focus - viewport changes should trigger refetch
    refetchOnWindowFocus: false,
    // Stale time matches QueryProvider default (5 min)
    staleTime: 5 * 60 * 1000,
  })
  
  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    bufferedRange: {
      start: query.data?.meta?.buffer?.applied.start ?? startEpoch,
      end: query.data?.meta?.buffer?.applied.end ?? endEpoch,
    },
  }
}
