'use client';

import { useStatsStore } from '@/store/useStatsStore';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toISOString().split('T')[0];
}

function parseDate(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

const PRESETS = [
  { label: 'All Time', start: 978307200, end: 1767571200 },
  { label: 'Last Year', start: Math.floor(Date.now() / 1000) - 86400 * 365, end: Math.floor(Date.now() / 1000) },
  { label: 'Last 5 Years', start: Math.floor(Date.now() / 1000) - 86400 * 365 * 5, end: Math.floor(Date.now() / 1000) },
];

export function TimeRangeSelector() {
  const timeRange = useStatsStore((s) => s.timeRange);
  const setTimeRange = useStatsStore((s) => s.setTimeRange);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseDate(e.target.value);
    if (!isNaN(newStart)) {
      setTimeRange(newStart, timeRange.endEpoch);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseDate(e.target.value);
    if (!isNaN(newEnd)) {
      setTimeRange(timeRange.startEpoch, newEnd);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Time Range</h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Start</label>
          <input
            type="date"
            value={formatDate(timeRange.startEpoch)}
            onChange={handleStartChange}
            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">End</label>
          <input
            type="date"
            value={formatDate(timeRange.endEpoch)}
            onChange={handleEndChange}
            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setTimeRange(preset.start, preset.end)}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-300"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
