"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  useSuggestionStore,
  type TimeScaleData,
  type IntervalBoundaryData,
  type SuggestionContextMetadata,
} from '@/store/useSuggestionStore';
import { generateWarpProfiles, type WarpProfile } from '@/lib/warp-generation';
import { detectBoundaries, type BoundaryMethod } from '@/lib/interval-detection';
import { generateRankedAutoProposalSets } from '@/lib/full-auto-orchestrator';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useContextExtractor } from '@/hooks/useContextExtractor';
import { detectSmartProfile } from '@/hooks/useSmartProfiles';
import type { RankedAutoProposalSets } from '@/types/autoProposalSet';
import type { CrimeRecord } from '@/types/crime';
import { buildContextDiagnostics, type ContextDiagnosticsResult } from '@/lib/context-diagnostics';

export type TriggerMode = 'manual' | 'automatic' | 'on-demand';
export type AutoRunStatus = 'idle' | 'running' | 'fresh' | 'error';
export type AutoRunSource = 'auto' | 'manual' | null;

type DiagnosticsMetadata = NonNullable<SuggestionContextMetadata['contextDiagnostics']>;

export function buildSuggestionDiagnosticsMetadata(
  diagnostics: ContextDiagnosticsResult
): DiagnosticsMetadata {
  const profileComparisonOutcome: DiagnosticsMetadata['profileComparison']['outcome'] = diagnostics
    .comparison.matches
    ? 'same'
    : diagnostics.dynamicProfile.state === 'no-strong'
      ? 'no-strong'
      : diagnostics.dynamicProfile.state === 'weak-signal'
        ? 'weak-signal'
        : 'strong-different';

  return {
    dynamicProfileLabel: diagnostics.dynamicProfile.label,
    signalState: diagnostics.dynamicProfile.state,
    isWeakSignal: diagnostics.dynamicProfile.state === 'weak-signal',
    hasNoStrongProfile: diagnostics.dynamicProfile.state === 'no-strong',
    confidence: diagnostics.dynamicProfile.confidence,
    temporalSummary:
      diagnostics.temporal.status === 'available'
        ? diagnostics.temporal.activitySummary
        : undefined,
    spatialSummary:
      diagnostics.spatial.status === 'available'
        ? diagnostics.spatial.summary
        : undefined,
    neighbourhoodSummary:
      diagnostics.neighbourhood.status === 'available'
        ? diagnostics.neighbourhood.summary
        : undefined,
    spatialHotspots:
      diagnostics.spatial.status === 'available'
        ? diagnostics.spatial.hotspots.map((hotspot, index) => ({
            label: `#${index + 1} ${hotspot.dominantCrimeType}`,
            supportCount: hotspot.supportCount,
            density: hotspot.density,
          }))
        : undefined,
    staticProfileLabel: diagnostics.comparison.staticProfileName,
    profileComparison: {
      matches: diagnostics.comparison.matches,
      outcome: profileComparisonOutcome,
      reason: diagnostics.comparison.reason,
    },
    sections: {
      temporal:
        diagnostics.temporal.status === 'available'
          ? { status: 'available' }
          : { status: 'missing', notice: diagnostics.temporal.notice },
      spatial:
        diagnostics.spatial.status === 'available'
          ? { status: 'available' }
          : { status: 'missing', notice: diagnostics.spatial.notice },
      neighbourhood:
        diagnostics.neighbourhood.status === 'available'
          ? { status: 'available' }
          : { status: 'missing', notice: diagnostics.neighbourhood.notice },
    },
  };
}

export function buildSuggestionContextMetadata(input: {
  context: ReturnType<ReturnType<typeof useContextExtractor>['getCurrentContext']>;
  diagnostics: ContextDiagnosticsResult;
}): SuggestionContextMetadata {
  return {
    crimeTypes: input.context.crimeTypes,
    timeRange: input.context.timeRange,
    isFullDataset: input.context.isFullDataset,
    profileName: input.diagnostics.dynamicProfile.label,
    contextDiagnostics: buildSuggestionDiagnosticsMetadata(input.diagnostics),
  };
}

export function transitionAutoRunLifecycle(
  currentStatus: AutoRunStatus,
  source: Exclude<AutoRunSource, null>,
  stage: 'start' | 'success' | 'error'
): AutoRunStatus {
  if (source === 'manual') {
    return currentStatus;
  }

  if (stage === 'start') return 'running';
  if (stage === 'success') return 'fresh';
  return 'error';
}

/**
 * Generation parameters passed from UI controls
 */
export interface GenerationParams {
  warpCount: number;  // 0-6 per CONTEXT
  intervalCount?: number;  // 0-6 per CONTEXT (for manual generation)
  snapToUnit: 'hour' | 'day' | 'none';
  boundaryMethod?: BoundaryMethod;  // for manual generation
  contextMode: 'visible' | 'all';
  fullAuto?: boolean;
}

interface UseSuggestionGeneratorReturn {
  trigger: (params: GenerationParams) => void;
  hasSuggestions: boolean;
  suggestionCount: number;
  pendingCount: number;
  mode: TriggerMode;
  setMode: (mode: TriggerMode) => void;
  isGenerating: boolean;
  generationError: string | null;
  lastSampleUpdateAt: number | null;
  fullAutoSets: RankedAutoProposalSets | null;
  autoRunStatus: AutoRunStatus;
  lastRunSource: AutoRunSource;
}

/**
 * Debounce hook for filter changes
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function deriveBoundsFromCrimes(crimes: ArrayLike<CrimeRecord>): { minLat: number; maxLat: number; minLon: number; maxLon: number } | undefined {
  const validCrimes = Array.from(crimes).filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lon)
  );
  if (validCrimes.length === 0) return undefined;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const crime of validCrimes) {
    minLat = Math.min(minLat, crime.lat);
    maxLat = Math.max(maxLat, crime.lat);
    minLon = Math.min(minLon, crime.lon);
    maxLon = Math.max(maxLon, crime.lon);
  }
  // Add small padding
  const padLat = (maxLat - minLat) * 0.1 || 0.01;
  const padLon = (maxLon - minLon) * 0.1 || 0.01;
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLon: minLon - padLon,
    maxLon: maxLon + padLon,
  };
}

export function useSuggestionGenerator(): UseSuggestionGeneratorReturn {
  const FULL_DATASET_START = 978307200;
  const FULL_DATASET_END = 1767571200;

  const {
    suggestions,
    addSuggestion,
    clearPendingSuggestions,
    setEmptyState,
    generationError,
    setGenerationError,
    setFullAutoProposalResults,
    warpCount,
    intervalCount,
    snapToUnit,
    boundaryMethod,
    contextMode,
  } = useSuggestionStore();

  const latestRequestIdRef = useRef(0);
  const lastAutoSignatureRef = useRef<string | null>(null);
  
  // Generation params from UI
  const [generationParams, setGenerationParams] = useState<GenerationParams | null>(null);
  
  // Track generating state
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSampleUpdateAt, setLastSampleUpdateAt] = useState<number | null>(null);
  const [fullAutoSets, setFullAutoSets] = useState<RankedAutoProposalSets | null>(null);
  const [autoRunStatus, setAutoRunStatus] = useState<AutoRunStatus>('idle');
  const [lastRunSource, setLastRunSource] = useState<AutoRunSource>(null);
  
  // Get viewport state
  const viewportFilters = useCrimeFilters();
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const { getCurrentContext } = useContextExtractor();

  const defaultParams = useMemo(
    () => ({
      warpCount,
      intervalCount,
      snapToUnit,
      boundaryMethod,
      contextMode,
      fullAuto: true,
    } satisfies GenerationParams),
    [boundaryMethod, contextMode, intervalCount, snapToUnit, warpCount]
  );

  const [analysisStartDate, analysisEndDate] = useMemo(() => {
    const mode = generationParams?.contextMode ?? 'visible';

    if (mode === 'all') {
      if (selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])) {
        const selectedStart = Math.min(selectedTimeRange[0], selectedTimeRange[1]);
        const selectedEnd = Math.max(selectedTimeRange[0], selectedTimeRange[1]);
        if (selectedStart !== selectedEnd) {
          return [selectedStart, selectedEnd];
        }
      }

      return [FULL_DATASET_START, FULL_DATASET_END];
    }

    return [viewportStart, viewportEnd];
  }, [generationParams?.contextMode, selectedTimeRange, viewportEnd, viewportStart]);
  
  // Debounce filter changes (500ms per CONTEXT)
  const debouncedFilters = useDebounce(
    { crimeTypes: viewportFilters.crimeTypes, districts: viewportFilters.districts, startDate: analysisStartDate, endDate: analysisEndDate },
    750
  );
  
  // Fetch crime data for analysis
  const { data: crimes, isLoading, isFetching, meta, bufferedRange } = useCrimeData({
    startEpoch: analysisStartDate,
    endEpoch: analysisEndDate,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 0,
    limit: 100000,
  });

  const sampleSignature = useMemo(() => {
    if (!meta) {
      return null;
    }

    return [
      bufferedRange.start,
      bufferedRange.end,
      meta.returned,
      meta.sampleStride,
      meta.totalMatches,
    ].join(':');
  }, [bufferedRange.end, bufferedRange.start, meta]);
  
  // Count pending suggestions
  const pendingCount = useMemo(() => {
    return suggestions.filter((s) => s.status === 'pending').length;
  }, [suggestions]);

  // Check if there are any suggestions
  const hasSuggestions = useMemo(() => {
    return suggestions.length > 0;
  }, [suggestions]);

  // Total suggestion count
  const suggestionCount = suggestions.length;

  // Current mode (starts with manual as per plan)
  const mode: TriggerMode = 'manual';

  // Set mode function (for future use with automatic/on-demand)
  const setMode = useCallback((newMode: TriggerMode) => {
    console.log('Trigger mode changed to:', newMode);
  }, []);

  /**
   * Generate suggestions using real algorithms
   */
  const generateSuggestions = useCallback(async (params: GenerationParams, source: 'auto' | 'manual') => {
    if (isLoading) {
      return false;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setIsGenerating(true);
    setGenerationError(null);
    setLastRunSource(source);
    setAutoRunStatus((prev) => transitionAutoRunLifecycle(prev, source, 'start'));
    
    try {
      const isStaleRequest = () => latestRequestIdRef.current !== requestId;

      // Preserve accepted suggestions and regenerate pending suggestions only.
      if (isStaleRequest()) {
        return false;
      }
      clearPendingSuggestions();
      
      if (!crimes || crimes.length === 0) {
        // Set store flag for empty state (not console.log)
        setEmptyState(true);
        const emptyResult = {
          generatedAt: Date.now(),
          sets: [],
          recommendedId: null,
          reasonMetadata: {
            noResultReason: 'No data available in the current context. Expand date range or filters.',
          },
        } satisfies RankedAutoProposalSets;

        if (isStaleRequest()) {
          return false;
        }

        setFullAutoSets(emptyResult);
        setFullAutoProposalResults(emptyResult);
        setLastSampleUpdateAt(Date.now());
        setAutoRunStatus((prev) => transitionAutoRunLifecycle(prev, source, 'success'));
        return false;
      }
      
      // Clear empty state when we have data
      setEmptyState(false);
      
      const context = getCurrentContext(params.contextMode);
      const smartProfile = detectSmartProfile(context);
      const diagnostics = await buildContextDiagnostics({
        timestamps: crimes.map((crime) => crime.timestamp),
        crimes,
        staticProfileName: smartProfile?.name,
        bounds: deriveBoundsFromCrimes(crimes),
      });
      const diagnosticsMetadata = buildSuggestionDiagnosticsMetadata(diagnostics);
      const suggestionContextMetadata = buildSuggestionContextMetadata({
        context,
        diagnostics,
      });
      const timeRange = {
        start: context.timeRange.start,
        end: context.timeRange.end,
      };

      const useFullAutoPath = params.fullAuto !== false;

      if (useFullAutoPath) {
        const rankedResult = generateRankedAutoProposalSets({
          crimes,
            context: {
              crimeTypes: context.crimeTypes,
              timeRange: context.timeRange,
              isFullDataset: context.isFullDataset,
              profileName: smartProfile?.name,
            },
          params: {
            warpCount: params.warpCount,
            snapToUnit: params.snapToUnit,
          },
        });

        if (isStaleRequest()) {
          return false;
        }

        setFullAutoSets(rankedResult);
        setFullAutoProposalResults(rankedResult);

        rankedResult.sets.forEach((set) => {
          addSuggestion({
            type: 'time-scale',
            confidence: set.confidence,
            contextMetadata: {
              ...suggestionContextMetadata,
            },
            data: {
              name: `${set.warp.name} (Rank ${set.rank})${set.isRecommended ? ' - Recommended' : ''}`,
              intervals: set.warp.intervals,
            } as TimeScaleData,
          });
        });

        if (isStaleRequest()) {
          return false;
        }

        setLastSampleUpdateAt(Date.now());
        setAutoRunStatus((prev) => transitionAutoRunLifecycle(prev, source, 'success'));

        return rankedResult.sets.length > 0;
      }

      setFullAutoSets(null);
      setFullAutoProposalResults(null);
      
      // Generate warp profiles with user-configurable count
      if (params.warpCount > 0) {
        const profiles = generateWarpProfiles(crimes, timeRange, { 
          profileCount: params.warpCount,
          intervalCount: params.intervalCount || 3,
        });
        
        profiles.forEach((profile: WarpProfile) => {
          addSuggestion({
            type: 'time-scale',
            confidence: profile.confidence,
            contextMetadata: {
              ...suggestionContextMetadata,
            },
            data: {
              name: profile.name,
              intervals: profile.intervals,
            } as TimeScaleData,
          });
        });
      }
      
      // Generate interval boundaries with user-configured options
      if (params.intervalCount && params.intervalCount > 0) {
        const boundary = detectBoundaries(crimes, timeRange, {
          method: params.boundaryMethod || 'peak',
          sensitivity: 'medium',
          snapToUnit: params.snapToUnit,
          boundaryCount: params.intervalCount,
        });
        
        addSuggestion({
          type: 'interval-boundary',
          confidence: boundary.confidence,
          contextMetadata: {
            ...suggestionContextMetadata,
          },
          data: {
            boundaries: boundary.boundaries,
          } as IntervalBoundaryData,
        });
      }
      if (isStaleRequest()) {
        return false;
      }

      setLastSampleUpdateAt(Date.now());
      setAutoRunStatus((prev) => transitionAutoRunLifecycle(prev, source, 'success'));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setGenerationError(`Generation failed: ${message}`);
      console.error('Suggestion generation failed:', error);
      setAutoRunStatus((prev) => transitionAutoRunLifecycle(prev, source, 'error'));
      return false;
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsGenerating(false);
      }
    }
  }, [
    addSuggestion,
    clearPendingSuggestions,
    crimes,
    getCurrentContext,
    isLoading,
    setEmptyState,
    setFullAutoProposalResults,
    setGenerationError,
  ]);

  // Trigger function - generates real suggestions based on algorithms
  const handleTrigger = useCallback((params: GenerationParams) => {
    setGenerationParams(params);
    void generateSuggestions(params, 'manual');
  }, [generateSuggestions]);

  const autoRunSignature = useMemo(
    () => JSON.stringify({
      filters: debouncedFilters,
      sampleSignature,
      params: {
        warpCount: defaultParams.warpCount,
        intervalCount: defaultParams.intervalCount,
        snapToUnit: defaultParams.snapToUnit,
        boundaryMethod: defaultParams.boundaryMethod,
        contextMode: defaultParams.contextMode,
      },
    }),
    [
      debouncedFilters,
      defaultParams.boundaryMethod,
      defaultParams.contextMode,
      defaultParams.intervalCount,
      defaultParams.snapToUnit,
      defaultParams.warpCount,
      sampleSignature,
    ]
  );

  // Auto-generate on entry and meaningful context changes with debounce.
  useEffect(() => {
    if (!generationParams) {
      setGenerationParams(defaultParams);
    }
  }, [defaultParams, generationParams]);

  useEffect(() => {
    if (isLoading || isFetching || isGenerating) {
      return;
    }

    if (lastAutoSignatureRef.current === autoRunSignature) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (lastAutoSignatureRef.current === autoRunSignature) {
        return;
      }

      lastAutoSignatureRef.current = autoRunSignature;
      setGenerationParams(defaultParams);
      void generateSuggestions(defaultParams, 'auto');
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    autoRunSignature,
    defaultParams,
    generateSuggestions,
    isFetching,
    isGenerating,
    isLoading,
  ]);

  return {
    trigger: handleTrigger,
    hasSuggestions,
    suggestionCount,
    pendingCount,
    mode,
    setMode,
    isGenerating,
    generationError,
    lastSampleUpdateAt,
    fullAutoSets,
    autoRunStatus,
    lastRunSource,
  };
}
