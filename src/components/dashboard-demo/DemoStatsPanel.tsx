"use client";

import { useMemo } from 'react';
import { ChevronUp, Minus } from 'lucide-react';
import { ALL_DEMO_DISTRICTS, useDashboardDemoAnalysisStore } from '@/store/useDashboardDemoAnalysisStore';
import { useDemoNeighborhoodStats } from '@/components/dashboard-demo/lib/useDemoNeighborhoodStats';
import { getDistrictDisplayName } from '@/app/stats/lib/stats-view-model';

const toDateInputValue = (epochSec: number) => new Date(epochSec * 1000).toISOString().slice(0, 10);

const parseDateInput = (value: string, fallback: number, edge: 'start' | 'end') => {
  if (!value) return fallback;
  const parsed = Date.parse(edge === 'start' ? `${value}T00:00:00Z` : `${value}T23:59:59Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : fallback;
};

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

export function DemoStatsPanel() {
  const { summary, stats, isLoading } = useDemoNeighborhoodStats();
  const selectedDistricts = useDashboardDemoAnalysisStore((state) => state.selectedDistricts);
  const timeRange = useDashboardDemoAnalysisStore((state) => state.timeRange);
  const toggleDistrict = useDashboardDemoAnalysisStore((state) => state.toggleDistrict);
  const setSelectedDistricts = useDashboardDemoAnalysisStore((state) => state.setSelectedDistricts);
  const setTimeRange = useDashboardDemoAnalysisStore((state) => state.setTimeRange);

  const topTypes = useMemo(() => stats?.byType.slice(0, 4) ?? [], [stats]);
  const hourBins = useMemo(() => stats?.byHour ?? [], [stats]);
  const maxHourCount = useMemo(() => Math.max(...hourBins, 1), [hourBins]);
  const selectedDistrictLabels = useMemo(
    () => (selectedDistricts.length > 0 ? selectedDistricts.map((district) => getDistrictDisplayName(district)) : ['All districts']),
    [selectedDistricts]
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100">
      <header className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Stats Summary</div>
        <p className="text-[11px] text-slate-400">District-first entry surface for the demo analysis flow.</p>
        <div className="text-[11px] text-slate-500">Selected districts: {selectedDistrictLabels.join(', ')}</div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Total Crimes" value={summary?.totalCrimes ?? 0} />
        <MetricCard label="Avg / Day" value={summary?.avgPerDay ?? 0} />
        <MetricCard label="Peak Hour" value={summary?.peakHourLabel ?? '--'} />
        <MetricCard label="Top Crime" value={summary?.mostCommonCrime ?? '--'} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-500">
          <span>Districts</span>
          <div className="flex items-center gap-2 text-slate-400">
            <button type="button" onClick={() => setSelectedDistricts([])} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">
              <Minus className="h-3 w-3" />
              Clear
            </button>
            <button type="button" onClick={() => setSelectedDistricts(ALL_DEMO_DISTRICTS)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">
              <ChevronUp className="h-3 w-3" />
              All
            </button>
          </div>
        </div>

        <div className="mt-2 grid max-h-28 grid-cols-5 gap-1 overflow-y-auto pr-1 text-[11px]">
          {ALL_DEMO_DISTRICTS.map((district) => {
            const active = selectedDistricts.includes(district);
            return (
              <button
                key={district}
                type="button"
                onClick={() => toggleDistrict(district)}
                className={`rounded border px-2 py-1 text-center transition-colors ${
                  active ? 'border-sky-400/70 bg-sky-500/15 text-sky-100' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                {district}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Spatial distribution</div>
        <p className="mt-1 text-[11px] text-slate-400">Keep the hotspot map visible as the balanced spatial context for these district summaries.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px]">
        <label className="space-y-1 text-slate-400">
          <span>Start</span>
          <input
            type="date"
            value={toDateInputValue(timeRange.startEpoch)}
            onChange={(event) => setTimeRange(parseDateInput(event.target.value, timeRange.startEpoch, 'start'), timeRange.endEpoch)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
          />
        </label>
        <label className="space-y-1 text-slate-400">
          <span>End</span>
          <input
            type="date"
            value={toDateInputValue(timeRange.endEpoch)}
            onChange={(event) => setTimeRange(timeRange.startEpoch, parseDateInput(event.target.value, timeRange.endEpoch, 'end'))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Top types</h3>
          <span className="text-[11px] text-slate-500">{selectedDistricts.length || 'all'} districts</span>
        </div>
        <div className="mt-2 space-y-2">
          {topTypes.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate pr-2">{item.name}</span>
                <span>{item.count.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(6, Math.min(100, item.percentage))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Hourly pulse</h3>
          <span className="text-[11px] text-slate-500">24h read</span>
        </div>
        <div className="mt-2 flex h-24 items-end gap-1">
          {hourBins.slice(0, 24).map((count, hour) => {
            return (
              <div key={hour} className="flex-1">
                <div className="h-full rounded-t bg-slate-800">
                  <div className="w-full rounded-t bg-violet-500" style={{ height: `${(count / maxHourCount) * 100}%`, minHeight: count > 0 ? '4px' : '0px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        {isLoading ? 'Loading demo stats…' : summary ? `Loaded ${summary.totalCrimes.toLocaleString()} crimes for the current demo context.` : 'No demo stats loaded yet.'}
      </div>
    </section>
  );
}
