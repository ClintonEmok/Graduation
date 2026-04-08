'use client';

import { StatsOverviewCards } from './components/StatsOverviewCards';
import { CrimeTypeBreakdown } from './components/CrimeTypeBreakdown';
import { TemporalPatternChart } from './components/TemporalPatternChart';
import { NeighborhoodSelector } from './components/NeighborhoodSelector';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { SpatialHotspotMap } from './components/SpatialHotspotMap';
import { NeighborhoodContext } from './components/NeighborhoodContext';
import { DistrictBreakdown } from './components/DistrictBreakdown';
import { StatsSectionLayout } from './components/StatsSectionLayout';
import { useNeighborhoodStats } from '../hooks/useNeighborhoodStats';

export function StatsRouteShell() {
  const { stats, isLoading, isFetching, error } = useNeighborhoodStats();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Crime Statistics</h1>
          <p className="text-sm text-slate-400">
            Explore crime patterns by neighborhood, time, and type
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
            Error loading data: {error.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="space-y-6 lg:col-span-1">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <TimeRangeSelector />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <NeighborhoodSelector />
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-3">
            <StatsOverviewCards />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CrimeTypeBreakdown />
              <TemporalPatternChart />
            </div>

            <SpatialHotspotMap />

            <DistrictBreakdown />

            <NeighborhoodContext />

            {(isLoading || isFetching) && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                  <span className="text-sm text-slate-400">Loading statistics...</span>
                </div>
              </div>
            )}

            {!isLoading && !isFetching && !stats && (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500">No data available for the selected filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
