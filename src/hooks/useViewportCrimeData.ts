/**
 * Viewport-based crime data fetching hook.
 * Fetches data only for visible time range + buffer to optimize loading.
 * 
 * Key features:
 * - Buffers viewport range to prevent frequent refetches during scroll
 * - Uses viewport state from store (not props) for reactive updates
 * - Keeps old data while fetching new (placeholderData) to prevent flash
 * - Returns loading/fetching states for UI feedback
 */
import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore'

interface CrimeRecord {
  id: string
  date: number // epoch seconds
  type: string
  description: string
  latitude: number
  longitude: number
  district: string
}

interface UseViewportCrimeDataOptions {
  /** Number of days to buffer around viewport (default: 30) */
  bufferDays?: number
  /** Optional crime types filter */
  crimeTypes?: string[]
  /** Optional districts filter */
  districts?: string[]
}

interface UseViewportCrimeDataResult {
  data: CrimeRecord[] | undefined
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
 * Fetch crime data for a date range.
 * Currently returns mock data structure - will connect to /api/crimes/range in later plan.
 */
async function fetchCrimesInRange(
  startEpoch: number,
  endEpoch: number,
  crimeTypes?: string[],
  districts?: string[]
): Promise<CrimeRecord[]> {
  // TODO: Connect to /api/crimes/range endpoint in plan 34-03
  // For now, return mock data structure to allow hook to compile
  // and be ready for API integration
  
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
    
    const response = await fetch(`/api/crimes/range?${params.toString()}`)
    
    if (!response.ok) {
      // If API doesn't exist yet (404), return empty array
      if (response.status === 404) {
        return []
      }
      throw new Error(`HTTP error: ${response.status}`)
    }
    
    return response.json()
  } catch (error) {
    // API doesn't exist - return empty for now
    console.warn('Crime API not available, returning empty data')
    return []
  }
}

/**
 * Hook to fetch crime data based on current viewport.
 * Re-fetches automatically when viewport changes.
 * 
 * @param bufferDays - Days to buffer around viewport (default: 30)
 * @param crimeTypes - Optional crime types filter
 * @param districts - Optional districts filter
 */
export function useViewportCrimeData(
  options: UseViewportCrimeDataOptions = {}
): UseViewportCrimeDataResult {
  const { bufferDays = 30, crimeTypes, districts } = options
  
  // Subscribe to viewport bounds using individual selectors to avoid new object on each render
  const startDate = useViewportStart()
  const endDate = useViewportEnd()
  
  // Convert epoch seconds to Date objects for buffer calculation
  const start = new Date(startDate * 1000)
  const end = new Date(endDate * 1000)
  
  // Calculate buffered range
  const bufferedStart = addDays(start, -bufferDays)
  const bufferedEnd = addDays(end, bufferDays)
  
  // Convert back to epoch seconds for API
  const bufferedStartEpoch = Math.floor(bufferedStart.getTime() / 1000)
  const bufferedEndEpoch = Math.floor(bufferedEnd.getTime() / 1000)
  
  const query = useQuery({
    queryKey: [
      'crimes', 
      'viewport', 
      bufferedStartEpoch, 
      bufferedEndEpoch,
      crimeTypes,
      districts
    ],
    queryFn: () => fetchCrimesInRange(
      bufferedStartEpoch,
      bufferedEndEpoch,
      crimeTypes,
      districts
    ),
    // Keep old data while fetching new to prevent UI flash
    placeholderData: (previousData) => previousData,
    // Don't refetch on window focus - viewport changes should trigger refetch
    refetchOnWindowFocus: false,
    // Stale time matches QueryProvider default (5 min)
    staleTime: 5 * 60 * 1000,
  })
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    bufferedRange: {
      start: bufferedStartEpoch,
      end: bufferedEndEpoch,
    },
  }
}
