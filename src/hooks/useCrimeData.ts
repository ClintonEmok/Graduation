/**
 * Unified hook for fetching crime data.
 * Single entry point for all crime data fetching in the application.
 *
 * Phase 81 Wave 3: hook now fronts the exact paged detail contract.
 * The first page is fetched automatically when the caller passes a
 * valid (startEpoch, endEpoch). Follow-up pages can be requested via
 * the returned `fetchNextPage` helper, which appends rows to the
 * current cache. Pages are replaceable (D-09) — a new (start, end,
 * filters) invalidates the cache.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

interface RangeQueryKey {
  start: number
  end: number
  crimeTypes: readonly string[] | undefined
  districts: readonly string[] | undefined
  pageSize: number
  target: string | null
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
 * Phase 81 Wave 3: the dashboard default. Smaller than the legacy
 * 50000 to keep the first page of an exact working window fast.
 * Callers can pass `pageSize` to override; values above the API
 * policy max (50000) will surface as `requiresNarrowing`.
 */
const DEFAULT_PAGE_SIZE = 5000;

function buildPageUrl(key: RangeQueryKey, cursor: string | null): string {
  const params = new URLSearchParams({
    startEpoch: key.start.toString(),
    endEpoch: key.end.toString(),
    pageSize: key.pageSize.toString(),
  });
  if (key.crimeTypes?.length) params.set('crimeTypes', key.crimeTypes.join(','));
  if (key.districts?.length) params.set('districts', key.districts.join(','));
  if (cursor) params.set('cursor', cursor);
  if (key.target) params.set('target', key.target);
  return `/api/crimes/range?${params.toString()}`;
}

async function fetchPage(key: RangeQueryKey, cursor: string | null): Promise<CrimeRangeResponse> {
  const requestPath = buildPageUrl(key, cursor);
  try {
    const response = await fetch(requestPath)
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }
    const result = (await response.json()) as CrimeRangeResponse
    return {
      data: Array.isArray(result.data) ? result.data : [],
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
 * Phase 81 Wave 3: the hook returns the paged contract. Use
 * `fetchNextPage()` to progressively load more rows. When the
 * server returns a `requiresNarrowing` payload the hook surfaces
 * it on the result so the UI can prompt the user instead of
 * silently loading a giant query (D-14).
 */
export function useCrimeData(
  options: UseCrimeDataOptions
): UseCrimeDataResult {
  const queryClient = useQueryClient();
  const {
    startEpoch,
    endEpoch,
    crimeTypes,
    districts,
    pageSize = DEFAULT_PAGE_SIZE,
    cursor: initialCursor = null,
    target = null,
  } = options

  const normalizedRange = normalizeEpochRange(startEpoch, endEpoch)
  const hasValidRange = hasValidEpochRange(startEpoch, endEpoch)
  const shouldEnableQuery = hasValidRange && (typeof window !== 'undefined' || process.env.NODE_ENV === 'test')

  const stableCrimeTypes = useMemo(() => (crimeTypes ? [...crimeTypes] : undefined), [crimeTypes]);
  const stableDistricts = useMemo(() => (districts ? [...districts] : undefined), [districts]);

  const queryKey = useMemo(
    () => [
      'crimes',
      'paged',
      normalizedRange.start,
      normalizedRange.end,
      pageSize,
      stableCrimeTypes ?? [],
      stableDistricts ?? [],
      target,
    ],
    [normalizedRange.start, normalizedRange.end, pageSize, stableCrimeTypes, stableDistricts, target]
  );

  const rangeKey: RangeQueryKey = useMemo(
    () => ({
      start: normalizedRange.start,
      end: normalizedRange.end,
      crimeTypes: stableCrimeTypes,
      districts: stableDistricts,
      pageSize,
      target,
    }),
    [normalizedRange.start, normalizedRange.end, stableCrimeTypes, stableDistricts, pageSize, target]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPage(rangeKey, initialCursor),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: shouldEnableQuery,
  })

  const isFetchingNextRef = useRef(false);

  const fetchNextPage = useCallback(async (): Promise<CrimeRecord[] | null> => {
    if (!query.data) return null;
    const meta = query.data.meta;
    if (!meta?.hasMore || !meta.nextCursor) return null;
    if (isFetchingNextRef.current) return null;
    isFetchingNextRef.current = true;
    try {
      const next = await fetchPage(rangeKey, meta.nextCursor);
      const existing = queryClient.getQueryData<CrimeRangeResponse>(queryKey);
      const merged: CrimeRangeResponse = {
        data: [...(existing?.data ?? []), ...next.data],
        meta: next.meta,
      };
      queryClient.setQueryData(queryKey, merged);
      return next.data;
    } catch (error) {
      console.error('[useCrimeData] fetchNextPage failed:', error);
      throw error;
    } finally {
      isFetchingNextRef.current = false;
    }
  }, [queryClient, queryKey, query.data, rangeKey]);

  const hasMore = query.data?.meta?.hasMore ?? false;
  const nextCursor = query.data?.meta?.nextCursor ?? null;
  const requiresNarrowing = query.data?.meta?.requiresNarrowing ?? null;

  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: isFetchingNextRef.current,
    error: query.error as Error | null,
    hasMore,
    nextCursor,
    requiresNarrowing,
    bufferedRange: {
      start: query.data?.meta?.buffer?.applied.start ?? normalizedRange.start,
      end: query.data?.meta?.buffer?.applied.end ?? normalizedRange.end,
    },
    fetchNextPage,
  }
}
