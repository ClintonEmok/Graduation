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

interface NormalizedEpochRange {
  start: number
  end: number
}

const FALLBACK_EPOCH_RANGE: NormalizedEpochRange = {
  start: 978307200,
  end: 1011878400,
}

function normalizeEpochRange(startEpoch: number, endEpoch: number): NormalizedEpochRange {
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
    return FALLBACK_EPOCH_RANGE
  }

  const start = Math.floor(Math.min(startEpoch, endEpoch))
  let end = Math.floor(Math.max(startEpoch, endEpoch))

  if (start === end) {
    end = start + 1
  }

  return { start, end }
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
  const normalizedRange = normalizeEpochRange(startEpoch, endEpoch)
  const requestPath = `/api/crimes/range?${new URLSearchParams({
    startEpoch: normalizedRange.start.toString(),
    endEpoch: normalizedRange.end.toString(),
    bufferDays: bufferDays.toString(),
    ...(crimeTypes?.length ? { crimeTypes: crimeTypes.join(',') } : {}),
    ...(districts?.length ? { districts: districts.join(',') } : {}),
    ...(limit ? { limit: limit.toString() } : {}),
  }).toString()}`;

  try {
    const response = await fetch(requestPath)
    
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
    if (error instanceof TypeError) {
      throw new Error(`Network error while fetching crimes from ${requestPath}`)
    }
    throw error
  }
}

function hasValidEpochRange(startEpoch: number, endEpoch: number): boolean {
  return Number.isFinite(startEpoch) && Number.isFinite(endEpoch) && endEpoch > startEpoch
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

  const normalizedRange = normalizeEpochRange(startEpoch, endEpoch)

  const hasValidRange = hasValidEpochRange(startEpoch, endEpoch)
  
  const queryKey = [
    'crimes', 
    'viewport', 
    normalizedRange.start,
    normalizedRange.end,
    bufferDays,
    limit,
    crimeTypes,
    districts
  ];
  
  console.log('[useCrimeData] queryKey (visible range):', queryKey);
  
  const query = useQuery({
    queryKey,
    queryFn: () => fetchCrimesInRange(
      normalizedRange.start,
      normalizedRange.end,
      bufferDays,
      crimeTypes,
      districts,
      limit
    ),
    enabled: hasValidRange,
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
      start: query.data?.meta?.buffer?.applied.start ?? normalizedRange.start,
      end: query.data?.meta?.buffer?.applied.end ?? normalizedRange.end,
    },
  }
}
