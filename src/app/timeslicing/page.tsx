"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMeasure } from '@/hooks/useMeasure';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { SuggestionPanel } from './components/SuggestionPanel';
import { SuggestionToolbar } from './components/SuggestionToolbar';

// Default to full date range if no real data loaded yet
const DEFAULT_START_EPOCH = 978307200; // 2001-01-01
const DEFAULT_END_EPOCH = 1767571200; // 2026-01-01

export default function TimeslicingPage() {
  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();
  
  // Get domain from adaptive store (populated when real data loads)
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  
  // Get data from data store for fallback
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  
  // Determine actual domain
  const domainStartSec = mapDomain[0] !== 0 || mapDomain[1] !== 0 
    ? mapDomain[0] 
    : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = mapDomain[0] !== 0 || mapDomain[1] !== 0 
    ? mapDomain[1] 
    : (maxTimestampSec ?? DEFAULT_END_EPOCH);
  
  const hasRealData = domainStartSec !== DEFAULT_START_EPOCH || domainEndSec !== DEFAULT_END_EPOCH;
  
  // Fetch crime data if we have real domain
  const { data: crimes, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));

  // Calculate data stats
  const dataStats = useMemo(() => {
    if (!crimes || crimes.length === 0) {
      return { count: 0, hasData: false };
    }
    return { 
      count: crimes.length, 
      hasData: true 
    };
  }, [crimes]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Semi-Automated Timeslicing</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Generate and review warp profile and interval boundary suggestions. 
            Accept, modify, or reject suggestions to create adaptive time slices.
          </p>
        </header>

        {/* Status Bar */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <span>
                Data:{' '}
                <strong className="text-slate-100">
                  {isLoading ? 'Loading...' : dataStats.hasData ? `${dataStats.count.toLocaleString()} crimes` : 'No data'}
                </strong>
              </span>
              {hasRealData && (
                <span>
                  Range:{' '}
                  <strong className="text-slate-100">
                    {new Date(domainStartSec * 1000).toLocaleDateString()} - {new Date(domainEndSec * 1000).toLocaleDateString()}
                  </strong>
                </span>
              )}
            </div>
            
            {/* Suggestion Toolbar */}
            <SuggestionToolbar />
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
            Timeline
          </h2>
          <div 
            ref={timelineContainerRef} 
            className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3"
          >
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
                  <span>Loading crime data...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center text-red-400">
                Error loading data: {error.message}
              </div>
            ) : timelineWidth > 0 ? (
              <DualTimeline />
            ) : (
              <div className="h-40" />
            )}
          </div>
        </section>

        {/* Suggestion Side Panel Placeholder - for future phases */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-900/65 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300 mb-4">
            Suggestion Panel
          </h2>
          <p className="text-sm text-slate-400">
            Suggestion generation and review UI will appear here. 
            This is the foundation for semi-automated timeslicing workflows.
          </p>
        </section>
      </div>
      
      {/* Suggestion Side Panel */}
      <SuggestionPanel />
    </main>
  );
}
