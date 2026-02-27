"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSuggestionStore, type WarpProfileData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { generateWarpProfiles, type WarpProfile } from '@/lib/warp-generation';
import { detectBoundaries, type BoundaryMethod } from '@/lib/interval-detection';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';

export type TriggerMode = 'manual' | 'automatic' | 'on-demand';

/**
 * Generation parameters passed from UI controls
 */
export interface GenerationParams {
  warpCount: number;  // 0-6 per CONTEXT
  intervalCount: number;  // 0-6 per CONTEXT
  snapToUnit: 'hour' | 'day' | 'none';
  boundaryMethod: BoundaryMethod;
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
  clearGenerationError: () => void;
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
  const {
    suggestions,
    addSuggestion,
    clearPendingSuggestions,
    setEmptyState,
    isPanelOpen,
  } = useSuggestionStore();
  
  // Track if user has manually triggered at least once
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  
  // Generation params from UI
  const [generationParams, setGenerationParams] = useState<GenerationParams | null>(null);
  
  // Track generating state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Get viewport state
  const viewportFilters = useCrimeFilters();
  const startDate = useViewportStore((state) => state.startDate);
  const endDate = useViewportStore((state) => state.endDate);
  
  // Debounce filter changes (500ms per CONTEXT)
  const debouncedFilters = useDebounce(
    { crimeTypes: viewportFilters.crimeTypes, districts: viewportFilters.districts, startDate, endDate },
    500
  );
  
  // Fetch crime data for analysis
  const { data: crimes, isLoading } = useCrimeData({
    startEpoch: startDate,
    endEpoch: endDate,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 0,
    limit: 100000,
  });
  
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
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Preserve accepted suggestions and regenerate pending suggestions only.
      clearPendingSuggestions();
      
      if (!crimes || crimes.length === 0) {
        // Set store flag for empty state (not console.log)
        setEmptyState(true);
        return;
      }
      
      // Clear empty state when we have data
      setEmptyState(false);
      
      const timeRange = { start: startDate, end: endDate };
      
      // Generate warp profiles with user-configurable count
      if (params.warpCount > 0) {
        const profiles = generateWarpProfiles(crimes, timeRange, { 
          profileCount: params.warpCount,
          intervalCount: params.intervalCount || 3,
        });
        
        profiles.forEach((profile: WarpProfile) => {
          addSuggestion({
            type: 'warp-profile',
            confidence: profile.confidence,
            data: {
              name: profile.name,
              intervals: profile.intervals,
            } as WarpProfileData,
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
          data: {
            boundaries: boundary.boundaries,
          } as IntervalBoundaryData,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setGenerationError(`Generation failed: ${message}`);
      console.error('Suggestion generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [addSuggestion, clearPendingSuggestions, crimes, endDate, isLoading, setEmptyState, startDate]);

  // Trigger function - generates real suggestions based on algorithms
  const handleTrigger = useCallback((params: GenerationParams) => {
    setHasGeneratedOnce(true);
    setGenerationParams(params);
    return generateSuggestions(params);
  }, [generateSuggestions]);

  // Auto-generate when filters change (after debounce)
  // Only if user has previously clicked Generate (to avoid auto-trigger on initial load)
  useEffect(() => {
    if (hasGeneratedOnce && generationParams && isPanelOpen && !isLoading) {
      generateSuggestions(generationParams);
    }
  }, [
    generateSuggestions,
    generationParams,
    hasGeneratedOnce,
    isPanelOpen,
    isLoading,
    debouncedFilters.crimeTypes,
    debouncedFilters.districts,
    debouncedFilters.startDate,
    debouncedFilters.endDate,
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
    clearGenerationError: () => setGenerationError(null),
  };
}
