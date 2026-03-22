'use client';

import { useMemo } from 'react';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';
import { useStatsStore } from '@/store/useStatsStore';
import { transformStatsSummary, type StatsSummary } from '../stats-view-model';

interface CardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  loading?: boolean;
}

function StatCard({ label, value, subvalue, loading }: CardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 animate-pulse">
        <div className="h-4 w-20 rounded bg-slate-700 mb-2" />
        <div className="h-8 w-24 rounded bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subvalue && <p className="text-xs text-slate-500 mt-1">{subvalue}</p>}
    </div>
  );
}

export function StatsOverviewCards() {
  const { stats, isLoading, crimeCount } = useNeighborhoodStats();
  const selectedDistricts = useStatsStore((s) => s.selectedDistricts);
  const timeRange = useStatsStore((s) => s.timeRange);

  const summary = useMemo<StatsSummary | null>(() => {
    if (!stats) return null;
    return transformStatsSummary(
      stats,
      selectedDistricts.length || 25,
      timeRange
    );
  }, [stats, selectedDistricts.length, timeRange]);

  const districtLabel = selectedDistricts.length === 0 
    ? 'All (25)' 
    : selectedDistricts.length === 25 
      ? 'All (25)' 
      : `${selectedDistricts.length} selected`;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Total Crimes"
        value={summary?.totalCrimes ?? 0}
        subvalue={`${crimeCount?.toLocaleString() ?? 0} loaded`}
        loading={isLoading}
      />
      <StatCard
        label="Avg/Day"
        value={summary?.avgPerDay ?? 0}
        loading={isLoading}
      />
      <StatCard
        label="Peak Hour"
        value={summary?.peakHourLabel ?? '--'}
        subvalue={stats?.peakHour ? `${stats.peakHour.count?.toLocaleString() ?? 0} crimes` : undefined}
        loading={isLoading}
      />
      <StatCard
        label="Top Crime"
        value={summary?.mostCommonCrime ?? '--'}
        subvalue={summary ? `${summary.mostCommonCrimeCount?.toLocaleString() ?? 0}` : undefined}
        loading={isLoading}
      />
      <StatCard
        label="Districts"
        value={districtLabel}
        loading={isLoading}
      />
    </div>
  );
}
