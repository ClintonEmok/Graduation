'use client';

import { useMemo } from 'react';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';
import { formatDistrictName } from '../stats-view-model';

export function DistrictBreakdown() {
  const { stats, isLoading, isFetching } = useNeighborhoodStats();

  const maxCount = useMemo(() => {
    if (!stats?.byDistrict || stats.byDistrict.length === 0) return 1;
    return Math.max(...stats.byDistrict.map(d => d.count), 1);
  }, [stats?.byDistrict]);

  if (isLoading || isFetching) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">District Breakdown</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.byDistrict.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">District Breakdown</h3>
        <p className="text-sm text-slate-500 text-center py-4">No district data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">District Breakdown</h3>
      <div className="space-y-2">
        {stats.byDistrict.slice(0, 15).map((d) => {
          const barWidth = (d.count / maxCount) * 100;
          return (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-12 text-sm text-slate-400 font-mono" title={`District ${formatDistrictName(d.name)}`}>
                D{formatDistrictName(d.name)}
              </span>
              <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="w-24 text-right text-sm text-slate-400">
                {d.count.toLocaleString()} ({d.percentage}%)
              </span>
            </div>
          );
        })}
      </div>
      {stats.byDistrict.length > 15 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          Showing top 15 of {stats.byDistrict.length} districts
        </p>
      )}
    </div>
  );
}
