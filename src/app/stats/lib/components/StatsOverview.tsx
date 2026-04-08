'use client';

import type { NeighborhoodStats } from '@/lib/stats/aggregation';

interface StatsOverviewProps {
  stats: NeighborhoodStats;
  total: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function StatsOverview({ stats, total }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Total Crimes"
        value={stats.total.toLocaleString()}
        subtitle={`${total.toLocaleString()} in range`}
      />
      <StatCard
        title="Peak Hour"
        value={`${stats.peakHour.hour}:00`}
        subtitle={`${stats.peakHour.count.toLocaleString()} crimes`}
      />
      <StatCard
        title="Peak Day"
        value={stats.peakDay.label}
        subtitle={`${stats.peakDay.count.toLocaleString()} crimes`}
      />
      <StatCard
        title="Top Crime Type"
        value={stats.byType[0]?.name || 'N/A'}
        subtitle={
          stats.byType[0]
            ? `${stats.byType[0].count.toLocaleString()} (${stats.byType[0].percentage}%)`
            : undefined
        }
      />
    </div>
  );
}
