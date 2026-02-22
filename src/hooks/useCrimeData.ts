/**
 * Unified hook for fetching crime data.
 * Single entry point for all crime data fetching in the application.
 * 
 * This hook:
 * - Accepts viewport bounds as parameters (not from store - let caller decide)
 * - Applies buffer to range (start - buffer, end + buffer)
 * - Calls /api/crimes/range with params
 * - Returns CrimeRecord[] format
 * - Handles errors gracefully
 */
import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { 
  CrimeRecord, 
  UseCrimeDataOptions, 
  UseCrimeDataResult 
} from '@/types/crime'

/**
 * Fetch crime data for a date range from the API
 */
async function fetchCrimesInRange(
  startEpoch: number,
  endEpoch: number,
  crimeTypes?: string[],
  districts?: string[],
  limit?: number
): Promise<CrimeRecord[]> {
  try {
    const params = new URLSearchParams({
      startEpoch: startEpoch.toString(),
      endEpoch: endEpoch.toString(),
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
      if (response.status === 404) {
        return []
      }
      throw new Error(`HTTP error: ${response.status}`)
    }
    
    const result = await response.json()
    
    // API returns { data: CrimeRecord[], meta: {...} }
    return result.data || []
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
  
  // Convert epoch seconds to Date objects for buffer calculation
  const start = new Date(startEpoch * 1000)
  const end = new Date(endEpoch * 1000)
  
  // Calculate buffered range
  const bufferedStart = addDays(start, -bufferDays)
  const bufferedEnd = addDays(end, bufferDays)
  
  // Convert back to epoch seconds for API
  const bufferedStartEpoch = Math.floor(bufferedStart.getTime() / 1000)
  const bufferedEndEpoch = Math.floor(bufferedEnd.getTime() / 1000)
  
  const queryKey = [
    'crimes',
    'range',
    bufferedStartEpoch,
    bufferedEndEpoch,
    crimeTypes,
    districts,
    limit
  ]
  
  const query = useQuery({
    queryKey,
    queryFn: () => fetchCrimesInRange(
      bufferedStartEpoch,
      bufferedEndEpoch,
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
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    bufferedRange: {
      start: bufferedStartEpoch,
      end: bufferedEndEpoch,
    },
  }
}
