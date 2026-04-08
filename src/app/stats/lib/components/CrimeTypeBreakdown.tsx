'use client';

import { useMemo } from 'react';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';

const CRIME_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

export function CrimeTypeBreakdown() {
  const { stats, isLoading } = useNeighborhoodStats();

  const chartData = useMemo(() => {
    if (!stats?.byType) return [];
    return stats.byType.slice(0, 10).map((item, i) => ({
      ...item,
      color: CRIME_COLORS[i % CRIME_COLORS.length],
    }));
  }, [stats]);

  const maxCount = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.count));
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Crime Type Breakdown</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-700 mb-1" />
              <div className="h-6 rounded bg-slate-700" style={{ width: `${100 - i * 15}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Crime Type Breakdown</h3>
        <p className="text-sm text-slate-500 text-center py-8">
          No data available
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Crime Type Breakdown</h3>
      
      <div className="space-y-3">
        {chartData.map((item) => {
          const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          
          return (
            <div key={item.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 truncate max-w-[120px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-xs text-slate-500">
                  {item.count.toLocaleString()} ({item.percentage}%)
                </span>
              </div>
              <div className="h-6 bg-slate-800 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: item.color,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
        {chartData.slice(0, 3).map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
