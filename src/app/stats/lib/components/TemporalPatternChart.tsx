'use client';

import { useState, useMemo } from 'react';
import { useNeighborhoodStats } from '../../hooks/useNeighborhoodStats';
import { DAY_LABELS, formatHourDetailed } from '../stats-view-model';

type ViewMode = 'heatmap' | 'hourly' | 'monthly';

export function TemporalPatternChart() {
  const { stats, isLoading } = useNeighborhoodStats();
  const [viewMode, setViewMode] = useState<ViewMode>('hourly');

  const hourlyData = useMemo(() => {
    if (!stats?.byHour) return [];
    return stats.byHour.map((count, hour) => ({
      hour,
      label: formatHourDetailed(hour),
      count,
    }));
  }, [stats]);

  const maxHourlyCount = useMemo(() => {
    return Math.max(...hourlyData.map(d => d.count), 1);
  }, [hourlyData]);

  const monthlyData = useMemo(() => {
    if (!stats?.byMonth) return [];
    return stats.byMonth.map((count, month) => ({
      month,
      label: DAY_LABELS[month] || String(month),
      count,
    }));
  }, [stats]);

  const maxMonthlyCount = useMemo(() => {
    return Math.max(...monthlyData.map(d => d.count), 1);
  }, [monthlyData]);

  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Temporal Patterns</h3>
        <div className="animate-pulse">
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Temporal Patterns</h3>
        <p className="text-sm text-slate-500 text-center py-8">
          No data available
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Temporal Patterns</h3>
        <div className="flex gap-1">
          {viewModes.map(mode => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === mode.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'hourly' && (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-1 h-32">
            {hourlyData.map((d) => (
              <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-slate-800 rounded-t relative" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-blue-600 rounded-t transition-all"
                    style={{ height: `${(d.count / maxHourlyCount) * 100}%` }}
                  />
                </div>
                {d.hour % 6 === 0 && (
                  <span className="text-[10px] text-slate-500">{d.label}</span>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>12AM</span>
            <span>6AM</span>
            <span>12PM</span>
            <span>6PM</span>
            <span>11PM</span>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2 h-32">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-slate-800 rounded-t relative" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-purple-600 rounded-t transition-all"
                    style={{ height: `${(d.count / maxMonthlyCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Oct</span>
            <span>Dec</span>
          </div>
        </div>
      )}
    </div>
  );
}
