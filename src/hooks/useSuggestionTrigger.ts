"use client";

import { useCallback, useMemo } from 'react';
import { useSuggestionStore, type Suggestion, type TimeScaleData, type IntervalBoundaryData } from '@/store/useSuggestionStore';

export type TriggerMode = 'manual' | 'automatic' | 'on-demand';

interface UseSuggestionTriggerReturn {
  trigger: () => void;
  hasSuggestions: boolean;
  suggestionCount: number;
  pendingCount: number;
  mode: TriggerMode;
  setMode: (mode: TriggerMode) => void;
}

// Generate mock time scale suggestions
const generateMockTimeScaleSuggestions = (): Omit<Suggestion, 'id' | 'createdAt' | 'status'>[] => {
  return [
    {
      type: 'time-scale',
      confidence: 87,
      data: {
        name: 'High Density Winter',
        intervals: [
          { startPercent: 0, endPercent: 15, strength: 1.5 },
          { startPercent: 15, endPercent: 35, strength: 0.8 },
          { startPercent: 35, endPercent: 65, strength: 1.2 },
          { startPercent: 65, endPercent: 85, strength: 1.8 },
          { startPercent: 85, endPercent: 100, strength: 1.0 },
        ],
      } as TimeScaleData,
    },
    {
      type: 'time-scale',
      confidence: 72,
      data: {
        name: 'Summer Surge Pattern',
        intervals: [
          { startPercent: 20, endPercent: 50, strength: 1.3 },
          { startPercent: 50, endPercent: 80, strength: 0.9 },
        ],
      } as TimeScaleData,
    },
    {
      type: 'time-scale',
      confidence: 61,
      data: {
        name: 'Year-End Adjustment',
        intervals: [
          { startPercent: 0, endPercent: 25, strength: 1.1 },
          { startPercent: 75, endPercent: 100, strength: 1.4 },
        ],
      } as TimeScaleData,
    },
  ];
};

// Generate mock interval boundary suggestions
const generateMockIntervalBoundarySuggestions = (): Omit<Suggestion, 'id' | 'createdAt' | 'status'>[] => {
  return [
    {
      type: 'interval-boundary',
      confidence: 92,
      data: {
        boundaries: [15, 25, 50, 75, 85],
      } as IntervalBoundaryData,
    },
    {
      type: 'interval-boundary',
      confidence: 78,
      data: {
        boundaries: [10, 30, 60, 90],
      } as IntervalBoundaryData,
    },
    {
      type: 'interval-boundary',
      confidence: 65,
      data: {
        boundaries: [20, 40, 60, 80],
      } as IntervalBoundaryData,
    },
  ];
};

export function useSuggestionTrigger(): UseSuggestionTriggerReturn {
  const { suggestions, addSuggestion } = useSuggestionStore();

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
    // This is a placeholder for future implementation
    // In later phases, this will control when suggestions are auto-generated
    console.log('Trigger mode changed to:', newMode);
  }, []);

  // Trigger function - generates mock suggestions
  const trigger = useCallback(() => {
    // Generate a mix of time scale and interval boundary suggestions
    const timeScaleSuggestions = generateMockTimeScaleSuggestions();
    const boundarySuggestions = generateMockIntervalBoundarySuggestions();
    
    // Add all mock suggestions to the store
    // In later phases, this will be replaced with actual ML/suggestion algorithms
    timeScaleSuggestions.forEach((suggestion) => {
      addSuggestion(suggestion);
    });
    
    boundarySuggestions.forEach((suggestion) => {
      addSuggestion(suggestion);
    });
  }, [addSuggestion]);

  return {
    trigger,
    hasSuggestions,
    suggestionCount,
    pendingCount,
    mode,
    setMode,
  };
}
