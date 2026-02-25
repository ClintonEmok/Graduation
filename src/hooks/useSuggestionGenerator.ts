"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useSuggestionStore, type Suggestion, type WarpProfileData, type IntervalBoundaryData } from '@/store/useSuggestionStore';
import { generateWarpProfiles, type WarpProfile } from '@/lib/warp-generation';
import { detectBoundaries, type BoundaryMethod } from '@/lib/interval-detection';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore, useCrimeFilters } from '@/lib/stores/viewportStore';

export type TriggerMode = 'manual' | 'automatic' | 'on-demand';

/**
 * Generation parameters passed from UI controls
 */
export interface GenerationParams {
  intervalCount: number;  // 3-12 per CONTEXT
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
  const { suggestions, addSuggestion, clearSuggestions, setEmptyState, isEmptyState } = useSuggestionStore();
  
  // Track if user has manually triggered at least once
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  
  // Generation params from UI
  const [generationParams, setGenerationParams] = useState<GenerationParams | null>(null);
  
  // Track generating state
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get viewport state
  const viewportFilters = useCrimeFilters();
  const startDate = useViewportStore((state) => state.startDate);
  const endDate = useViewportStore((state) => state.endDate);
  
  // Debounce filter changes (400ms per spec)
  const debouncedFilters = useDebounce(
    { crimeTypes: viewportFilters.crimeTypes, districts: viewportFilters.districts, startDate, endDate },
    400
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
    setIsGenerating(true);
    
    try {
      // Clear existing suggestions first
      clearSuggestions();
      
      // Get current viewport and filters
      const { startDate: currentStart, endDate: currentEnd } = useViewportStore.getState();
      const { crimeTypes, districts } = useViewportStore.getState().filters;
      
      // Fetch crime data for analysis - include geographic filter (districts)
      const { data: crimes } = useCrimeData({
        startEpoch: currentStart,
        endEpoch: currentEnd,
        crimeTypes: crimeTypes.length > 0 ? crimeTypes : undefined,
        districts: districts.length > 0 ? districts : undefined,
        bufferDays: 0,
        limit: 100000,
      });
      
      if (!crimes || crimes.length === 0) {
        // Set store flag for empty state (not console.log)
        setEmptyState(true);
        return;
      }
      
      // Clear empty state when we have data
      setEmptyState(false);
      
      const timeRange = { start: currentStart, end: currentEnd };
      
      // Generate warp profiles with user-configurable interval count
      const profiles = generateWarpProfiles(crimes, timeRange, { 
        profileCount: 3,
        intervalCount: params.intervalCount,  // Pass user-configured interval count
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
      
      // Generate interval boundaries with user-configured options
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
    } finally {
      setIsGenerating(false);
    }
  }, [addSuggestion, clearSuggestions, setEmptyState]);

  // Trigger function - generates real suggestions based on algorithms
  const handleTrigger = useCallback((params: GenerationParams) => {
    setHasGeneratedOnce(true);
    setGenerationParams(params);
    return generateSuggestions(params);
  }, [generateSuggestions]);

  // Auto-generate when filters change (after debounce)
  // Only if user has previously clicked Generate (to avoid auto-trigger on initial load)
  useEffect(() => {
    if (hasGeneratedOnce && generationParams && !isLoading) {
      generateSuggestions(generationParams);
    }
  }, [
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
  };
}
