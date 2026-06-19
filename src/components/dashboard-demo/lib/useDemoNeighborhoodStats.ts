import { useEffect, useMemo, useRef, useState } from 'react';
import { aggregateStats, padDistrict, type NeighborhoodStats } from '@/lib/stats/aggregation';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { transformStatsSummary, type StatsSummary } from '@/app/stats/lib/stats-view-model';
import type { CrimeRecord } from '@/types/crime';

const NEIGHBORHOOD_PAGE_SIZE = 5000;
const NEIGHBORHOOD_MAX_PAGES = 20; // 100k rows cap before stopping further paging

export interface UseDemoNeighborhoodStatsResult {
  stats: NeighborhoodStats | null;
  summary: StatsSummary | null;
  crimes: CrimeRecord[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  /**
   * Phase 81 Wave 3: the server returned a `requiresNarrowing` payload
   * for the most recent paging run. The UI should surface a prompt
   * instead of silently showing a partial dataset.
   */
  requiresNarrowing: { reason: string; message: string } | null;
}

/**
 * Phase 81 Wave 3: replaced the eager `limit: 1M` preload with
 * keyset paging through `/api/crimes/range`. The hook now:
 * - issues one request per page with a `pageSize` of 5000
 * - follows `nextCursor` until `hasMore` is false OR the page cap
 *   (`NEIGHBORHOOD_MAX_PAGES`) is reached
 * - surfaces `requiresNarrowing` as a flag instead of falling back
 *   to a broad preload
 *
 * The previous behavior requested one million rows up-front, which
 * was the biggest remaining eager preload in the dashboard-demo path.
 * The new contract keeps the data set accurate and prevents the
 * working window from being over-fetched.
 */
export function useDemoNeighborhoodStats(): UseDemoNeighborhoodStatsResult {
  const selectedDistricts = useDashboardDemoCoordinationStore((state) => state.selectedDistricts);
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);

  const timeRange = useMemo(
    () => ({ startEpoch: viewportStart, endEpoch: viewportEnd }),
    [viewportEnd, viewportStart]
  );

  const paddedDistricts = useMemo(() => {
    if (selectedDistricts.length === 0) return undefined;
    return selectedDistricts.map(padDistrict);
  }, [selectedDistricts]);

  const [crimes, setCrimes] = useState<CrimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [requiresNarrowing, setRequiresNarrowing] = useState<{ reason: string; message: string } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsLoading(true);
    setIsFetching(true);
    setError(null);
    setRequiresNarrowing(null);
    setCrimes([]);

    (async () => {
      const collected: CrimeRecord[] = [];
      let cursor: string | null = null;
      let pagesFetched = 0;
      try {
        do {
          if (cancelled) return;
          const params = new URLSearchParams({
            startEpoch: String(Math.floor(timeRange.startEpoch)),
            endEpoch: String(Math.floor(timeRange.endEpoch)),
            pageSize: String(NEIGHBORHOOD_PAGE_SIZE),
            target: 'demo-neighborhood-stats',
          });
          if (paddedDistricts?.length) {
            params.set('districts', paddedDistricts.join(','));
          }
          if (cursor) params.set('cursor', cursor);

          const response = await fetch(`/api/crimes/range?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`Neighborhood stats fetch failed with status ${response.status}`);
          }
          const result = (await response.json()) as {
            data?: CrimeRecord[];
            meta?: {
              hasMore?: boolean;
              nextCursor?: string | null;
              requiresNarrowing?: { reason?: string; message?: string };
            };
          };
          const page = Array.isArray(result.data) ? result.data : [];
          collected.push(...page);
          pagesFetched += 1;

          if (result.meta?.requiresNarrowing) {
            if (!cancelled) {
              setRequiresNarrowing({
                reason: result.meta.requiresNarrowing.reason ?? 'unknown',
                message: result.meta.requiresNarrowing.message ?? 'Narrow the viewport window.',
              });
            }
            break;
          }

          if (result.meta?.hasMore && result.meta.nextCursor && pagesFetched < NEIGHBORHOOD_MAX_PAGES) {
            cursor = result.meta.nextCursor;
          } else {
            cursor = null;
          }
        } while (cursor);

        if (cancelled) return;
        setCrimes(collected);
        setIsLoading(false);
        setIsFetching(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setCrimes(collected);
        setIsLoading(false);
        setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
      // requestId is captured in the closure; we intentionally
      // re-read the ref to detect a newer request that superseded
      // this one (D-09: replaceable, not accumulate).
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional ref re-read on cleanup
      if (requestId !== requestIdRef.current) {
        // Newer request superseded this one; nothing to do.
      }
    };
  }, [timeRange.startEpoch, timeRange.endEpoch, paddedDistricts]);

  const stats = useMemo(() => {
    if (!crimes || crimes.length === 0) return null;
    return aggregateStats(crimes);
  }, [crimes]);

  const summary = useMemo<StatsSummary | null>(() => {
    if (!stats) return null;

    return transformStatsSummary(stats, selectedDistricts.length || 25, timeRange);
  }, [selectedDistricts.length, stats, timeRange]);

  return {
    stats,
    summary,
    crimes,
    isLoading,
    isFetching,
    error,
    requiresNarrowing,
  };
}
