"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSuggestionStore, type TimeScaleData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { generateWarpProfiles, type WarpProfile } from '@/lib/warp-generation';
import { detectBoundaries, type BoundaryMethod } from '@/lib/interval-detection';
import { generateRankedAutoProposalSets } from '@/lib/full-auto-orchestrator';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useContextExtractor } from '@/hooks/useContextExtractor';
import { detectSmartProfile } from '@/hooks/useSmartProfiles';
import type { RankedAutoProposalSets } from '@/types/autoProposalSet';

export type TriggerMode = 'manual' | 'automatic' | 'on-demand';

/**
 * Generation parameters passed from UI controls
 */
export interface GenerationParams {
  warpCount: number;  // 0-6 per CONTEXT
  intervalCount: number;  // 0-6 per CONTEXT
  snapToUnit: 'hour' | 'day' | 'none';
  boundaryMethod: BoundaryMethod;
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
    isPanelOpen,
    setFullAutoProposalResults,
  } = useSuggestionStore();
  
  // Track if user has manually triggered at least once
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  
  // Generation params from UI
  const [generationParams, setGenerationParams] = useState<GenerationParams | null>(null);
  
  // Track generating state
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSampleUpdateAt, setLastSampleUpdateAt] = useState<number | null>(null);
  const [fullAutoSets, setFullAutoSets] = useState<RankedAutoProposalSets | null>(null);
  
  // Get viewport state
  const viewportFilters = useCrimeFilters();
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const { getCurrentContext } = useContextExtractor();

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
  const generateSuggestions = useCallback(async (params: GenerationParams) => {
    if (isLoading) {
      return false;
    }

    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Preserve accepted suggestions and regenerate pending suggestions only.
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

        setFullAutoSets(emptyResult);
        setFullAutoProposalResults(emptyResult);
        return false;
      }
      
      // Clear empty state when we have data
      setEmptyState(false);
      
      const context = getCurrentContext(params.contextMode);
      const smartProfile = detectSmartProfile(context);
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
            intervalCount: params.intervalCount,
            boundaryMethod: params.boundaryMethod,
            snapToUnit: params.snapToUnit,
          },
        });

        setFullAutoSets(rankedResult);
        setFullAutoProposalResults(rankedResult);

        rankedResult.sets.forEach((set) => {
          addSuggestion({
            type: 'time-scale',
            confidence: set.confidence,
            contextMetadata: {
              crimeTypes: context.crimeTypes,
              timeRange: context.timeRange,
              isFullDataset: context.isFullDataset,
              profileName: smartProfile?.name,
            },
            data: {
              name: `${set.warp.name} (Rank ${set.rank})${set.isRecommended ? ' - Recommended' : ''}`,
              intervals: set.warp.intervals,
            } as TimeScaleData,
          });

          addSuggestion({
            type: 'interval-boundary',
            confidence: set.confidence,
            contextMetadata: {
              crimeTypes: context.crimeTypes,
              timeRange: context.timeRange,
              isFullDataset: context.isFullDataset,
              profileName: smartProfile?.name,
            },
            data: {
              boundaries: set.intervals.boundaries,
            } as IntervalBoundaryData,
          });
        });

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
              crimeTypes: context.crimeTypes,
              timeRange: context.timeRange,
              isFullDataset: context.isFullDataset,
              profileName: smartProfile?.name,
            },
            data: {
              name: profile.name,
              intervals: profile.intervals,
            } as TimeScaleData,
          });
        });
      }
      
      // Generate interval boundaries with user-configured options
      if (params.intervalCount > 0) {
        const boundary = detectBoundaries(crimes, timeRange, {
          method: params.boundaryMethod,
          sensitivity: 'medium',
          snapToUnit: params.snapToUnit,  // Pass snapping option
          boundaryCount: params.intervalCount,  // Pass user-configured count
        });
        
        addSuggestion({
          type: 'interval-boundary',
          confidence: boundary.confidence,
          contextMetadata: {
            crimeTypes: context.crimeTypes,
            timeRange: context.timeRange,
            isFullDataset: context.isFullDataset,
            profileName: smartProfile?.name,
          },
          data: {
            boundaries: boundary.boundaries,
          } as IntervalBoundaryData,
        });
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setGenerationError(`Generation failed: ${message}`);
      console.error('Suggestion generation failed:', error);
      return false;
    } finally {
      setIsGenerating(false);
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
    setHasGeneratedOnce(true);
    setGenerationParams(params);
    void generateSuggestions(params);
  }, [generateSuggestions]);

  // Auto-generate when filters change (after debounce)
  // Only if user has previously clicked Generate (to avoid auto-trigger on initial load)
  useEffect(() => {
    if (!hasGeneratedOnce || !generationParams || !isPanelOpen) {
      return;
    }

    if (isLoading || isFetching || isGenerating) {
      return;
    }

    const run = async () => {
      const ok = await generateSuggestions(generationParams);
      if (ok) {
        setLastSampleUpdateAt(Date.now());
      }
    };

    void run();
  }, [
    generateSuggestions,
    generationParams,
    hasGeneratedOnce,
    isPanelOpen,
    isLoading,
    isFetching,
    isGenerating,
    debouncedFilters.crimeTypes,
    debouncedFilters.districts,
    debouncedFilters.startDate,
    debouncedFilters.endDate,
    sampleSignature,
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
  };
}
