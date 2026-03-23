/**
 * Hook for fetching and aggregating neighborhood crime statistics.
 * Subscribes to useStatsStore for filter state.
 */
import { useMemo } from 'react';
import { useCrimeData } from '@/hooks/useCrimeData';
import {
  aggregateStats,
  padDistrict,
  type NeighborhoodStats,
} from '@/lib/stats/aggregation';
import { useStatsStore } from '@/store/useStatsStore';
import type { CrimeRecord } from '@/types/crime';

export interface UseNeighborhoodStatsResult {
  stats: NeighborhoodStats | null;
  crimes: CrimeRecord[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
  crimeCount: number | null;
}

export function useNeighborhoodStats(): UseNeighborhoodStatsResult {
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const timeRange = useStatsStore((s) => s.timeRange);

  const paddedDistricts = useMemo(() => {
    if (selectedDistricts.length === 0) return undefined;
    return selectedDistricts.map(padDistrict);
  }, [selectedDistricts]);

  const {
    data: crimes,
    meta,
    isLoading,
    isFetching,
    error,
  } = useCrimeData({
    startEpoch: timeRange.startEpoch,
    endEpoch: timeRange.endEpoch,
    districts: paddedDistricts,
    bufferDays: 0,
    limit: 1000000,
  });

  const stats = useMemo(() => {
    if (!crimes || crimes.length === 0) return null;
    return aggregateStats(crimes);
  }, [crimes]);

  return {
    stats,
    crimes,
    isLoading,
    isFetching,
    error,
    total: meta?.totalMatches ?? crimes.length,
    crimeCount: crimes.length,
  };
}
