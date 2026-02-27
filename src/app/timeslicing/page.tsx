"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMeasure } from '@/hooks/useMeasure';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceStore, type TimeSlice } from '@/store/useSliceStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { SuggestionPanel } from './components/SuggestionPanel';
import { SuggestionToolbar } from './components/SuggestionToolbar';
import { useSuggestionStore, type WarpProfileData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { Toaster } from 'sonner';

// Default to full date range if no real data loaded yet
const DEFAULT_START_EPOCH = 978307200; // 2001-01-01
const DEFAULT_END_EPOCH = 1767571200; // 2026-01-01
const MIN_VALID_DATA_EPOCH = 946684800; // 2000-01-01

export default function TimeslicingPage() {
  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();
  
  // Get domain from adaptive store (populated when real data loads)
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  
  // Get data from data store for fallback
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  
  // mapDomain defaults to [0, 100] in adaptive store, which is not an epoch range.
  // Only treat adaptive domain as valid when it looks like real epoch seconds.
  const hasValidAdaptiveDomain =
    mapDomain[1] > mapDomain[0] && mapDomain[0] >= MIN_VALID_DATA_EPOCH;

  // Determine actual domain
  const domainStartSec = hasValidAdaptiveDomain
    ? mapDomain[0]
    : (minTimestampSec ?? DEFAULT_START_EPOCH);
  const domainEndSec = hasValidAdaptiveDomain
    ? mapDomain[1]
    : (maxTimestampSec ?? DEFAULT_END_EPOCH);

  const hasRealData = hasValidAdaptiveDomain || (minTimestampSec !== null && maxTimestampSec !== null);
  
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

  // Cross-route parity with /timeline-test:
  // DualTimeline overview histogram reads from useDataStore + adaptive maps.
  // Timeslicing fetches via useCrimeData, so mirror fetched records into those stores.
  useEffect(() => {
    if (!crimes || crimes.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    const timestamps = new Float32Array(crimes.length);
    const points = crimes.map((crime, index) => {
      minX = Math.min(minX, crime.x);
      maxX = Math.max(maxX, crime.x);
      minZ = Math.min(minZ, crime.z);
      maxZ = Math.max(maxZ, crime.z);
      timestamps[index] = crime.timestamp;

      return {
        id: `${crime.timestamp}-${index}`,
        timestamp: crime.timestamp,
        x: crime.x,
        y: 0,
        z: crime.z,
        type: crime.type,
      };
    });

    useDataStore.setState({
      data: points,
      columns: null,
      minTimestampSec: domainStartSec,
      maxTimestampSec: domainEndSec,
      minX: Number.isFinite(minX) ? minX : -50,
      maxX: Number.isFinite(maxX) ? maxX : 50,
      minZ: Number.isFinite(minZ) ? minZ : -50,
      maxZ: Number.isFinite(maxZ) ? maxZ : 50,
      dataCount: crimes.length,
      isMock: false,
    });

    useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec]);
  }, [crimes, domainEndSec, domainStartSec]);

  // Get time domain for slice creation
  const minTs = useDataStore((s) => s.minTimestampSec);
  const maxTs = useDataStore((s) => s.maxTimestampSec);
  const addSlice = useSliceStore((s) => s.addSlice);
  const addWarpSlice = useWarpSliceStore((s) => s.addSlice);
  const clearWarpSlices = useWarpSliceStore((s) => s.clearSlices);
  
  // Handle warp profile acceptance - create warp slices (replaces active warp)
  const handleAcceptWarpProfile = useCallback((suggestionId: string, data: WarpProfileData) => {
    if (!minTs || !maxTs) return;

    // Replace any existing warp profile slices (single active warp constraint)
    clearWarpSlices();

    useWarpSliceStore.getState().setActiveWarp(suggestionId);
    
    // Create new warp slices from intervals
    data.intervals.forEach((interval, index) => {
      addWarpSlice({
        label: `${data.name} ${index + 1}`,
        range: [interval.startPercent, interval.endPercent],
        weight: interval.strength,
        enabled: true,
        warpProfileId: suggestionId,
      });
    });
  }, [addWarpSlice, clearWarpSlices, minTs, maxTs]);
  
  // Handle interval boundary acceptance - create time slices
  const handleAcceptIntervalBoundary = useCallback((data: IntervalBoundaryData) => {
    if (!minTs || !maxTs || data.boundaries.length < 2) return;
    
    // Sort boundaries
    const sorted = [...data.boundaries].sort((a, b) => a - b);
    
    // Create slices for each pair of boundaries
    for (let i = 0; i < sorted.length - 1; i++) {
      const startEpoch = sorted[i];
      const endEpoch = sorted[i + 1];
      
      // Convert to normalized (0-100)
      const startPercent = ((startEpoch - minTs) / (maxTs - minTs)) * 100;
      const endPercent = ((endEpoch - minTs) / (maxTs - minTs)) * 100;
      
      addSlice({
        name: `Interval ${i + 1}`,
        type: 'range',
        range: [Math.max(0, Math.min(100, startPercent)), Math.max(0, Math.min(100, endPercent))],
        isLocked: false,
        isVisible: true,
      });
    }
  }, [addSlice, minTs, maxTs]);
  
  // Listen for suggestion acceptance events
  useEffect(() => {
    const handleWarpEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; data: WarpProfileData }>;
      handleAcceptWarpProfile(customEvent.detail.id, customEvent.detail.data);
    };
    
    const handleIntervalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ data: IntervalBoundaryData }>;
      handleAcceptIntervalBoundary(customEvent.detail.data);
    };
    
    window.addEventListener('accept-warp-profile', handleWarpEvent);
    window.addEventListener('accept-interval-boundary', handleIntervalEvent);
    
    return () => {
      window.removeEventListener('accept-warp-profile', handleWarpEvent);
      window.removeEventListener('accept-interval-boundary', handleIntervalEvent);
    };
  }, [handleAcceptWarpProfile, handleAcceptIntervalBoundary]);

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
      
      {/* Toast notifications */}
      <Toaster 
        position="bottom-right" 
        theme="dark" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            border: '#334155',
            color: '#e2e8f0',
          },
        }}
      />
    </main>
  );
}
