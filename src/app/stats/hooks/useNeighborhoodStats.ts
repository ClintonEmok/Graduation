/**
 * Hook for fetching and aggregating neighborhood crime statistics.
 * Subscribes to useStatsStore for filter state.
 */
import { useMemo } from 'react';
import { useCrimeData } from '@/hooks/useCrimeData';
import {
  aggregateStats,
  type NeighborhoodStats,
} from '@/lib/stats/aggregation';
import { useStatsStore } from '@/store/useStatsStore';

export interface UseNeighborhoodStatsResult {
  stats: NeighborhoodStats | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
  crimeCount: number | null;
}

export function useNeighborhoodStats(): UseNeighborhoodStatsResult {
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const timeRange = useStatsStore((s) => s.timeRange);

  const {
    data: crimes,
    meta,
    isLoading,
    isFetching,
    error,
  } = useCrimeData({
    startEpoch: timeRange.startEpoch,
    endEpoch: timeRange.endEpoch,
    districts: selectedDistricts.length > 0 ? selectedDistricts : undefined,
    bufferDays: 0,
    limit: 100000,
  });

  const stats = useMemo(() => {
    if (!crimes || crimes.length === 0) return null;
    return aggregateStats(crimes);
  }, [crimes]);

  return {
    stats,
    isLoading,
    isFetching,
    error,
    total: meta?.totalMatches ?? crimes.length,
    crimeCount: crimes.length,
  };
}
