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
import { useSuggestionStore, type Suggestion, type WarpProfileData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';
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

  // Get time domain for slice creation - prefer selection range, fallback to viewport
  const viewportStart = useViewportStore((s) => s.startDate);
  const viewportEnd = useViewportStore((s) => s.endDate);
  const viewportFilters = useCrimeFilters();
  const selectedTimeRange = useFilterStore((s) => s.selectedTimeRange);
  
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])) {
      const start = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
      const end = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
      if (start !== end) {
        return [start, end];
      }
    }
    return [viewportStart, viewportEnd];
  }, [selectedTimeRange, viewportStart, viewportEnd]);

  const {
    data: selectionCrimes,
    isLoading: isSelectionLoading,
  } = useCrimeData({
    startEpoch: rangeStart,
    endEpoch: rangeEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 0,
    limit: 50000,
  });

  const selectionTimestamps = useMemo(() => {
    if (!selectionCrimes || selectionCrimes.length === 0) {
      return [] as number[];
    }
    return selectionCrimes.map((crime) => crime.timestamp);
  }, [selectionCrimes]);

  const selectionDetailPoints = useMemo(() => {
    if (!selectionTimestamps.length) return [] as number[];
    const maxPoints = 4000;
    if (selectionTimestamps.length <= maxPoints) return selectionTimestamps;
    const step = Math.ceil(selectionTimestamps.length / maxPoints);
    return selectionTimestamps.filter((_, index) => index % step === 0);
  }, [selectionTimestamps]);

  const minTs = useDataStore((s) => s.minTimestampSec);
  const maxTs = useDataStore((s) => s.maxTimestampSec);
  const addSlice = useSliceStore((s) => s.addSlice);
  const addWarpSlice = useWarpSliceStore((s) => s.addSlice);
  const clearWarpSlices = useWarpSliceStore((s) => s.clearSlices);
  const warpSlices = useWarpSliceStore((state) => state.slices);
  const hoveredSuggestionId = useSuggestionStore((state) => state.hoveredSuggestionId);
  const suggestions = useSuggestionStore((state) => state.suggestions);

  const hoveredSuggestion = useMemo(
    () => suggestions.find((suggestion) => suggestion.id === hoveredSuggestionId) ?? null,
    [hoveredSuggestionId, suggestions]
  );

  const hoverPreviewSelection = useMemo(() => {
    if (!hoveredSuggestion || !rangeStart || !rangeEnd || rangeEnd <= rangeStart) {
      return { type: null as Suggestion['type'] | null, intervals: [] as Array<[number, number]>, boundaries: [] as number[] };
    }

    if (hoveredSuggestion.type === 'warp-profile' && 'intervals' in hoveredSuggestion.data) {
      const intervals = hoveredSuggestion.data.intervals.map((interval) => ([
        Math.max(0, Math.min(100, interval.startPercent)),
        Math.max(0, Math.min(100, interval.endPercent)),
      ] as [number, number]));

      return { type: hoveredSuggestion.type, intervals, boundaries: [] };
    }

    if (hoveredSuggestion.type === 'interval-boundary' && 'boundaries' in hoveredSuggestion.data) {
      const span = rangeEnd - rangeStart;
      const boundaries = hoveredSuggestion.data.boundaries
        .map((epoch) => ((epoch - rangeStart) / span) * 100)
        .map((percent) => Math.max(0, Math.min(100, percent)));

      return { type: hoveredSuggestion.type, intervals: [], boundaries };
    }

    return { type: null as Suggestion['type'] | null, intervals: [], boundaries: [] };
  }, [hoveredSuggestion, rangeStart, rangeEnd]);

  const hoverPreviewGlobal = useMemo(() => {
    if (!hoveredSuggestion || !rangeStart || !rangeEnd || rangeEnd <= rangeStart) {
      return { type: null as Suggestion['type'] | null, intervals: [] as Array<[number, number]>, boundaries: [] as number[] };
    }
    if (!domainStartSec || !domainEndSec || domainEndSec <= domainStartSec) {
      return { type: null as Suggestion['type'] | null, intervals: [] as Array<[number, number]>, boundaries: [] as number[] };
    }

    const selectionSpan = rangeEnd - rangeStart;
    const domainSpan = domainEndSec - domainStartSec;
    const toDomainPercent = (epoch: number) =>
      Math.max(0, Math.min(100, ((epoch - domainStartSec) / domainSpan) * 100));

    if (hoveredSuggestion.type === 'warp-profile' && 'intervals' in hoveredSuggestion.data) {
      const intervals = hoveredSuggestion.data.intervals.map((interval) => {
        const startEpoch = rangeStart + (interval.startPercent / 100) * selectionSpan;
        const endEpoch = rangeStart + (interval.endPercent / 100) * selectionSpan;
        return [toDomainPercent(startEpoch), toDomainPercent(endEpoch)] as [number, number];
      });

      return { type: hoveredSuggestion.type, intervals, boundaries: [] };
    }

    if (hoveredSuggestion.type === 'interval-boundary' && 'boundaries' in hoveredSuggestion.data) {
      const boundaries = hoveredSuggestion.data.boundaries.map((epoch) => toDomainPercent(epoch));
      return { type: hoveredSuggestion.type, intervals: [], boundaries };
    }

    return { type: null as Suggestion['type'] | null, intervals: [], boundaries: [] };
  }, [hoveredSuggestion, rangeStart, rangeEnd, domainStartSec, domainEndSec]);

  const acceptedSuggestionWarpIntervals = useMemo(
    () =>
      warpSlices
        .filter((slice) => slice.source === 'suggestion' && slice.enabled)
        .map((slice) => [slice.range[0], slice.range[1]] as [number, number]),
    [warpSlices]
  );
  
  // Handle warp profile acceptance - create warp slices (replaces active warp)
  const handleAcceptWarpProfile = useCallback((suggestionId: string, data: WarpProfileData) => {
    if (!rangeStart || !rangeEnd) return;

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
        source: 'suggestion',
        warpProfileId: suggestionId,
      });
    });
  }, [addWarpSlice, clearWarpSlices, rangeStart, rangeEnd]);
  
  // Handle interval boundary acceptance - create time slices
  const handleAcceptIntervalBoundary = useCallback((data: IntervalBoundaryData) => {
    if (!rangeStart || !rangeEnd || data.boundaries.length < 2) return;
    
    // Sort boundaries
    const sorted = [...data.boundaries].sort((a, b) => a - b);
    
    // Create slices for each pair of boundaries
    for (let i = 0; i < sorted.length - 1; i++) {
      const startEpoch = sorted[i];
      const endEpoch = sorted[i + 1];
      
      // Convert to normalized (0-100)
      const startPercent = ((startEpoch - rangeStart) / (rangeEnd - rangeStart)) * 100;
      const endPercent = ((endEpoch - rangeStart) / (rangeEnd - rangeStart)) * 100;
      
      addSlice({
        name: `Interval ${i + 1}`,
        type: 'range',
        range: [Math.max(0, Math.min(100, startPercent)), Math.max(0, Math.min(100, endPercent))],
        isLocked: false,
        isVisible: true,
      });
    }
  }, [addSlice, rangeStart, rangeEnd]);
  
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
              <>
                <DualTimeline />
                {acceptedSuggestionWarpIntervals.length > 0 && (
                  <div className="pointer-events-none absolute inset-3 z-10 overflow-hidden rounded-sm">
                    {acceptedSuggestionWarpIntervals.map((interval, index) => (
                      <div
                        key={`accepted-warp-${index}`}
                        className="absolute top-0 h-full border-2 border-dashed border-amber-300/85 bg-violet-500/10"
                        style={{
                          left: `${interval[0]}%`,
                          width: `${Math.max(0.5, interval[1] - interval[0])}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {hoverPreviewGlobal.type !== null && (
                  <div className="pointer-events-none absolute inset-3 z-20 overflow-hidden rounded-sm">
                    {hoverPreviewGlobal.type === 'warp-profile' &&
                      hoverPreviewGlobal.intervals.map((interval, index) => (
                        <div
                          key={`hover-warp-${index}`}
                          className="absolute top-0 h-full border border-violet-400/70 bg-violet-500/15"
                          style={{
                            left: `${interval[0]}%`,
                            width: `${Math.max(0.5, interval[1] - interval[0])}%`,
                          }}
                        />
                      ))}

                    {hoverPreviewGlobal.type === 'interval-boundary' &&
                      hoverPreviewGlobal.boundaries.map((boundary, index) => (
                        <div
                          key={`hover-boundary-${index}`}
                          className="absolute top-0 h-full w-px bg-teal-300/85"
                          style={{ left: `${boundary}%` }}
                        />
                      ))}

                    <div className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                      Preview: {hoverPreviewGlobal.type === 'warp-profile' ? 'Warp intervals' : 'Boundary markers'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-40" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm border-2 border-dashed border-amber-300/80 bg-violet-500/15" />
              Warp from suggestion
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm border border-violet-400/70 bg-violet-500/15" />
              Hover preview (warp)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-px bg-teal-300/90" />
              Hover preview (boundary)
            </span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
                Selection Timeline
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Focused view of the active selection range.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              {new Date(rangeStart * 1000).toLocaleDateString()} - {new Date(rangeEnd * 1000).toLocaleDateString()}
            </span>
          </div>
          {isSelectionLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-xs text-slate-400">
              Loading selection timeline...
            </div>
          ) : selectionTimestamps.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 text-xs text-slate-500">
              No crimes in this selection range.
            </div>
          ) : (
            <div className="relative rounded-md border border-slate-700/70 bg-slate-950/60 p-3">
              <DualTimeline
                domainOverride={[rangeStart, rangeEnd]}
                detailRangeOverride={[rangeStart, rangeEnd]}
                interactive={false}
                timestampSecondsOverride={selectionTimestamps}
                detailPointsOverride={selectionDetailPoints}
              />
              {hoverPreviewSelection.type !== null && (
                <div className="pointer-events-none absolute inset-3 z-10 overflow-hidden rounded-sm">
                  {hoverPreviewSelection.type === 'warp-profile' &&
                    hoverPreviewSelection.intervals.map((interval, index) => (
                      <div
                        key={`hover-selection-warp-${index}`}
                        className="absolute top-0 h-full border border-violet-400/70 bg-violet-500/15"
                        style={{
                          left: `${interval[0]}%`,
                          width: `${Math.max(0.5, interval[1] - interval[0])}%`,
                        }}
                      />
                    ))}

                  {hoverPreviewSelection.type === 'interval-boundary' &&
                    hoverPreviewSelection.boundaries.map((boundary, index) => (
                      <div
                        key={`hover-selection-boundary-${index}`}
                        className="absolute top-0 h-full w-px bg-teal-300/85"
                        style={{ left: `${boundary}%` }}
                      />
                    ))}

                  <div className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                    Preview: {hoverPreviewSelection.type === 'warp-profile' ? 'Warp intervals' : 'Boundary markers'}
                  </div>
                </div>
              )}
            </div>
          )}
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
