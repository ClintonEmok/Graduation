"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMeasure } from '@/hooks/useMeasure';
import { DualTimeline } from '@/components/timeline/DualTimeline';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceStore } from '@/store/useSliceStore';
import { useWarpSliceStore } from '@/store/useWarpSliceStore';
import { SuggestionPanel } from './components/SuggestionPanel';
import { SuggestionToolbar } from './components/SuggestionToolbar';
import { useSuggestionStore, type Suggestion, type TimeScaleData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';
import { useTimeStore } from '@/store/useTimeStore';
import type { AutoProposalSet } from '@/types/autoProposalSet';
import { Toaster } from 'sonner';

// Default to full date range if no real data loaded yet
const DEFAULT_START_EPOCH = 978307200; // 2001-01-01
const DEFAULT_END_EPOCH = 1767571200; // 2026-01-01
const MIN_VALID_DATA_EPOCH = 946684800; // 2000-01-01

const buildSliceAuthoredWarpMap = (
  slices: Array<{ enabled: boolean; range: [number, number]; weight: number }>,
  domain: [number, number],
  sampleCount: number
): Float32Array | null => {
  const enabledSlices = slices.filter((slice) => slice.enabled);
  if (enabledSlices.length === 0 || sampleCount < 2) return null;

  const [domainStart, domainEnd] = domain;
  const domainSpan = Math.max(1e-9, domainEnd - domainStart);
  const density = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const percent = ratio * 100;
    let boost = 0;

    for (const slice of enabledSlices) {
      const start = Math.min(slice.range[0], slice.range[1]);
      const end = Math.max(slice.range[0], slice.range[1]);
      if (percent < start || percent > end) continue;

      const center = (start + end) / 2;
      const halfWidth = Math.max(0.5, (end - start) / 2);
      const normalizedDistance = Math.abs((percent - center) / halfWidth);
      const falloff = Math.max(0, 1 - normalizedDistance);
      boost += Math.max(0, slice.weight) * (0.35 + 0.65 * falloff);
    }

    density[i] = 1 + boost;
  }

  const cumulative = new Float32Array(sampleCount);
  cumulative[0] = 0;
  for (let i = 1; i < sampleCount; i += 1) {
    const prev = density[i - 1] ?? 1;
    const curr = density[i] ?? 1;
    cumulative[i] = cumulative[i - 1] + (prev + curr) * 0.5;
  }

  const total = cumulative[sampleCount - 1] ?? 0;
  if (!Number.isFinite(total) || total <= 0) return null;

  const warpMap = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    const progress = (cumulative[i] ?? 0) / total;
    warpMap[i] = domainStart + progress * domainSpan;
  }

  return warpMap;
};

const remapSelectionPercentToDomainPercent = (
  percent: number,
  selectionDomain: [number, number],
  fullDomain: [number, number]
) => {
  const [selectionStart, selectionEnd] = selectionDomain;
  const [fullStart, fullEnd] = fullDomain;
  const selectionSpan = Math.max(1e-9, selectionEnd - selectionStart);
  const fullSpan = Math.max(1e-9, fullEnd - fullStart);
  const epoch = selectionStart + (Math.max(0, Math.min(100, percent)) / 100) * selectionSpan;
  return ((epoch - fullStart) / fullSpan) * 100;
};

export default function TimeslicingPage() {
  const [containerRef, bounds] = useMeasure<HTMLDivElement>();
  const [timelineContainerRef, timelineBounds] = useMeasure<HTMLDivElement>();
  
  // Get domain from adaptive store (populated when real data loads)
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);
  const isDev = process.env.NODE_ENV !== 'production';
  
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
  const { data: crimes, meta: crimeMeta, isLoading, error } = useCrimeData({
    startEpoch: domainStartSec,
    endEpoch: domainEndSec,
    bufferDays: 30,
    limit: 50000,
  });

  const timelineWidth = Math.max(0, Math.floor(timelineBounds.width));

  // Calculate data stats
  const dataStats = useMemo(() => {
    const returned = crimeMeta?.returned ?? crimes.length;
    const total = crimeMeta?.totalMatches ?? returned;
    const isMock = Boolean((crimeMeta as { isMock?: boolean } | null)?.isMock);
    return {
      count: total,
      returned,
      hasData: total > 0,
      sampled: Boolean(crimeMeta?.sampled),
      isMock,
    };
  }, [crimeMeta, crimes.length]);

  const dataSummaryLabel = useMemo(() => {
    if (isLoading) {
      return 'Loading...';
    }
    if (!dataStats.hasData) {
      return 'No data';
    }

    const base = `${dataStats.count.toLocaleString()} crimes`;
    const details: string[] = [];
    const bufferDays = crimeMeta?.buffer?.days ?? 0;

    if (dataStats.sampled || dataStats.returned !== dataStats.count) {
      details.push(`showing ${dataStats.returned.toLocaleString()}`);
    }
    if (bufferDays > 0) {
      details.push(`buffered ±${bufferDays}d`);
    }
    if (dataStats.isMock) {
      details.push('demo data');
    }

    return details.length > 0 ? `${base} (${details.join(', ')})` : base;
  }, [crimeMeta, dataStats, isLoading]);

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
  const clearSlices = useSliceStore((s) => s.clearSlices);
  
  // Clear existing slices on mount to prevent stale burst slices from persisting
  useEffect(() => {
    clearSlices();
  }, [clearSlices]);
  const addWarpSlice = useWarpSliceStore((s) => s.addSlice);
  const clearWarpSlices = useWarpSliceStore((s) => s.clearSlices);
  const setActiveWarp = useWarpSliceStore((s) => s.setActiveWarp);
  const warpSlices = useWarpSliceStore((state) => state.slices);
  const activeWarpId = useWarpSliceStore((state) => state.activeWarpId);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const hoveredSuggestionId = useSuggestionStore((state) => state.hoveredSuggestionId);
  const suggestions = useSuggestionStore((state) => state.suggestions);
  const fullAutoProposalSets = useSuggestionStore((state) => state.fullAutoProposalSets);
  const selectedFullAutoSetId = useSuggestionStore((state) => state.selectedFullAutoSetId);
  const fullAutoNoResultReason = useSuggestionStore((state) => state.fullAutoNoResultReason);
  const acceptSuggestion = useSuggestionStore((state) => state.acceptSuggestion);
  const addToHistory = useSuggestionStore((state) => state.addToHistory);

  const hoveredSuggestion = useMemo(
    () => suggestions.find((suggestion) => suggestion.id === hoveredSuggestionId) ?? null,
    [hoveredSuggestionId, suggestions]
  );

  const hoverPreviewSelection = useMemo(() => {
    if (!hoveredSuggestion || !rangeStart || !rangeEnd || rangeEnd <= rangeStart) {
      return { type: null as Suggestion['type'] | null, intervals: [] as Array<[number, number]>, boundaries: [] as number[] };
    }

    if (hoveredSuggestion.type === 'time-scale' && 'intervals' in hoveredSuggestion.data) {
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

    if (hoveredSuggestion.type === 'time-scale' && 'intervals' in hoveredSuggestion.data) {
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

  const sliceAuthoredWarpMapMain = useMemo(() => {
    if (timeScaleMode !== 'adaptive') return null;
    const mainWarpSlices = warpSlices.map((slice) => ({
      ...slice,
      range: [
        remapSelectionPercentToDomainPercent(slice.range[0], [rangeStart, rangeEnd], [domainStartSec, domainEndSec]),
        remapSelectionPercentToDomainPercent(slice.range[1], [rangeStart, rangeEnd], [domainStartSec, domainEndSec]),
      ] as [number, number],
    }));
    return buildSliceAuthoredWarpMap(
      mainWarpSlices,
      [domainStartSec, domainEndSec],
      Math.max(96, densityMap?.length || 0)
    );
  }, [densityMap?.length, domainEndSec, domainStartSec, rangeEnd, rangeStart, timeScaleMode, warpSlices]);

  const sliceAuthoredWarpMapSelection = useMemo(() => {
    if (timeScaleMode !== 'adaptive') return null;
    return buildSliceAuthoredWarpMap(
      warpSlices,
      [rangeStart, rangeEnd],
      Math.max(96, selectionDetailPoints.length || 0)
    );
  }, [rangeEnd, rangeStart, selectionDetailPoints.length, timeScaleMode, warpSlices]);

  const enabledWarpSliceCount = useMemo(
    () => warpSlices.filter((slice) => slice.enabled).length,
    [warpSlices]
  );

  const debugPreviewSliceCount = useMemo(
    () =>
      warpSlices.filter(
        (slice) => slice.enabled && slice.warpProfileId === '__debug-full-auto-preview__'
      ).length,
    [warpSlices]
  );
  
  // Handle warp profile acceptance - create warp slices (replaces active warp)
  const handleAcceptWarpProfile = useCallback((suggestionId: string, data: TimeScaleData) => {
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

    // Switch to adaptive mode + full factor so warping is visible immediately
    useTimeStore.getState().setTimeScaleMode('adaptive');
    setWarpFactor(1);
  }, [addWarpSlice, clearWarpSlices, rangeStart, rangeEnd, setWarpFactor]);
  
  // Handle interval boundary acceptance - create time slices
  const handleAcceptIntervalBoundary = useCallback((data: IntervalBoundaryData, source?: 'manual' | 'suggestion', packageId?: string) => {
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

  const findPackageSuggestionIds = useCallback(
    (proposalSet: AutoProposalSet) => {
      const expectedWarpName = `${proposalSet.warp.name} (Rank ${proposalSet.rank})${proposalSet.isRecommended ? ' - Recommended' : ''}`;

      const warpSuggestion = suggestions.find(
        (suggestion) =>
          suggestion.status === 'pending' &&
          suggestion.type === 'time-scale' &&
          'name' in suggestion.data &&
          suggestion.data.name === expectedWarpName
      );

      // No interval boundaries in warp-only packages
      return {
        warpSuggestionId: warpSuggestion?.id ?? null,
        intervalSuggestionId: null,
      };
    },
    [suggestions]
  );

  const handleAcceptFullAutoPackage = useCallback(
    (proposalSetId?: string) => {
      if (fullAutoNoResultReason) {
        return;
      }

      const targetId = proposalSetId ?? selectedFullAutoSetId;
      if (!targetId) {
        return;
      }

      const proposalSet = fullAutoProposalSets.find((entry) => entry.id === targetId);
      if (!proposalSet || proposalSet.warp.intervals.length === 0) {
        return;
      }

      const previousWarpState = useWarpSliceStore.getState();
      const previousSliceState = useSliceStore.getState();

      try {
        clearWarpSlices();
        clearSlices();
        setActiveWarp(proposalSet.id);

        // Create warp slices only - no boundaries
        proposalSet.warp.intervals.forEach((interval, index) => {
          addWarpSlice({
            label: `${proposalSet.warp.name} ${index + 1}`,
            range: [interval.startPercent, interval.endPercent],
            weight: interval.strength,
            enabled: true,
            source: 'suggestion',
            warpProfileId: proposalSet.id,
          });
        });

        // Switch to adaptive mode + full factor so warping is visible immediately
        useTimeStore.getState().setTimeScaleMode('adaptive');
        setWarpFactor(1);

        if (proposalSet.intervals?.boundaries && proposalSet.intervals.boundaries.length >= 2) {
          handleAcceptIntervalBoundary(
            { boundaries: proposalSet.intervals.boundaries },
            'suggestion',
            proposalSet.id
          );
        }

        const acceptedAt = Date.now();
        addToHistory({
          id: `full-auto-package-${proposalSet.id}-warp-${acceptedAt}`,
          type: 'time-scale',
          confidence: proposalSet.confidence,
          data: {
            name: `${proposalSet.warp.name} (Package Rank ${proposalSet.rank})`,
            intervals: proposalSet.warp.intervals,
          },
          createdAt: acceptedAt,
          status: 'accepted',
        });
      } catch {
        useWarpSliceStore.setState({
          slices: previousWarpState.slices,
          activeWarpId: previousWarpState.activeWarpId,
        });
        useSliceStore.setState({
          slices: previousSliceState.slices,
          activeSliceId: previousSliceState.activeSliceId,
          activeSliceUpdatedAt: previousSliceState.activeSliceUpdatedAt,
        });
      }
    },
    [
      addToHistory,
      addWarpSlice,
      clearSlices,
      clearWarpSlices,
      fullAutoNoResultReason,
      fullAutoProposalSets,
      selectedFullAutoSetId,
      setActiveWarp,
      handleAcceptIntervalBoundary,
      setWarpFactor,
    ]
  );
  
  // Listen for suggestion acceptance events
  useEffect(() => {
    const handleWarpEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; data: TimeScaleData }>;
      handleAcceptWarpProfile(customEvent.detail.id, customEvent.detail.data);
    };
    
    const handleIntervalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ data: IntervalBoundaryData }>;
      handleAcceptIntervalBoundary(customEvent.detail.data);
    };

    const handleFullAutoPackageEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ proposalSetId?: string }>;
      handleAcceptFullAutoPackage(customEvent.detail?.proposalSetId);
    };
    
    window.addEventListener('accept-time-scale', handleWarpEvent);
    window.addEventListener('accept-interval-boundary', handleIntervalEvent);
    window.addEventListener('accept-full-auto-package', handleFullAutoPackageEvent);
    
    return () => {
      window.removeEventListener('accept-time-scale', handleWarpEvent);
      window.removeEventListener('accept-interval-boundary', handleIntervalEvent);
      window.removeEventListener('accept-full-auto-package', handleFullAutoPackageEvent);
    };
  }, [handleAcceptFullAutoPackage, handleAcceptWarpProfile, handleAcceptIntervalBoundary]);

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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <span>
                Data:{' '}
                <strong className="text-slate-100">
                  {dataSummaryLabel}
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
                <DualTimeline
                  detailRangeOverride={[rangeStart, rangeEnd]}
                  detailPointsOverride={selectionDetailPoints}
                  detailRenderMode="auto"
                  disableAutoBurstSlices={true}
                  adaptiveWarpMapOverride={sliceAuthoredWarpMapMain}
                  adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
                />
                {hoverPreviewGlobal.type !== null && (
                  <div className="pointer-events-none absolute inset-3 z-20 overflow-hidden rounded-sm">
                    {hoverPreviewGlobal.type === 'time-scale' &&
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
                      Preview: {hoverPreviewGlobal.type === 'time-scale' ? 'Time Scale intervals' : 'Boundary markers'}
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
              <span className="h-3 w-5 rounded-sm border border-violet-400/70 bg-violet-500/15" />
              Hover preview (warp)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-px bg-teal-300/90" />
              Hover preview (boundary)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm border border-dashed border-violet-300/85 bg-violet-500/20" />
              Slice from package
            </span>
          </div>
          {isDev && (
            <div className="mt-2 rounded-md border border-cyan-500/30 bg-cyan-950/20 px-2 py-1.5 text-[11px] text-cyan-100">
              <span className="mr-3">Debug</span>
              <span className="mr-3">mode: <strong>{timeScaleMode}</strong></span>
              <span className="mr-3">factor: <strong>{warpFactor.toFixed(2)}</strong></span>
              <span className="mr-3">activeWarp: <strong>{activeWarpId ?? 'none'}</strong></span>
              <span className="mr-3">enabledSlices: <strong>{enabledWarpSliceCount}</strong></span>
              <span className="mr-3">debugPreviewSlices: <strong>{debugPreviewSliceCount}</strong></span>
              <span className="mr-3">mainMapPts: <strong>{sliceAuthoredWarpMapMain?.length ?? 0}</strong></span>
              <span>selectionMapPts: <strong>{sliceAuthoredWarpMapSelection?.length ?? 0}</strong></span>
            </div>
          )}
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
                disableAutoBurstSlices={true}
                adaptiveWarpMapOverride={sliceAuthoredWarpMapSelection}
                adaptiveWarpDomainOverride={[rangeStart, rangeEnd]}
              />
              {hoverPreviewSelection.type !== null && (
                <div className="pointer-events-none absolute inset-3 z-10 overflow-hidden rounded-sm">
                  {hoverPreviewSelection.type === 'time-scale' &&
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
                    Preview: {hoverPreviewSelection.type === 'time-scale' ? 'Time Scale intervals' : 'Boundary markers'}
                  </div>
                </div>
              )}
            </div>
          )}
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
