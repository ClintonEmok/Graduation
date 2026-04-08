"use client";

import { useCallback, useMemo } from 'react';
import { useCrimeFilters, useViewportEnd, useViewportStart } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';

export type ContextMode = 'visible' | 'all';

export interface FilterContext {
  crimeTypes: string[];
  districts: string[];
  timeRange: {
    start: number;
    end: number;
  };
  isFullDataset: boolean;
}

interface GetCurrentContextInput {
  mode?: ContextMode;
  crimeTypes: string[];
  districts: string[];
  viewportStart: number;
  viewportEnd: number;
  selectedTimeRange: [number, number] | null;
}

function normalizeTimeRange(start: number, end: number): { start: number; end: number } {
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function getCurrentContext({
  mode = 'visible',
  crimeTypes,
  districts,
  viewportStart,
  viewportEnd,
  selectedTimeRange,
}: GetCurrentContextInput): FilterContext {
  const visibleTimeRange = normalizeTimeRange(viewportStart, viewportEnd);
  const allTimeRange =
    selectedTimeRange && Number.isFinite(selectedTimeRange[0]) && Number.isFinite(selectedTimeRange[1])
      ? normalizeTimeRange(selectedTimeRange[0], selectedTimeRange[1])
      : visibleTimeRange;

  return {
    crimeTypes: unique(crimeTypes),
    districts: unique(districts),
    timeRange: mode === 'all' ? allTimeRange : visibleTimeRange,
    isFullDataset: mode === 'all',
  };
}

export function getContextSignature(context: FilterContext): string {
  const sortedCrimeTypes = [...context.crimeTypes].sort();
  const sortedDistricts = [...context.districts].sort();
  const range = normalizeTimeRange(context.timeRange.start, context.timeRange.end);

  return [
    sortedCrimeTypes.join(','),
    sortedDistricts.join(','),
    String(range.start),
    String(range.end),
    context.isFullDataset ? 'all' : 'visible',
  ].join('|');
}

export function useContextExtractor() {
  const viewportFilters = useCrimeFilters();
  const viewportStart = useViewportStart();
  const viewportEnd = useViewportEnd();
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);

  const contextCrimeTypes = useMemo(() => {
    if (viewportFilters.crimeTypes.length > 0) {
      return viewportFilters.crimeTypes;
    }
    return selectedTypes.map((id) => `type:${id}`);
  }, [selectedTypes, viewportFilters.crimeTypes]);

  const contextDistricts = useMemo(() => {
    if (viewportFilters.districts.length > 0) {
      return viewportFilters.districts;
    }
    return selectedDistricts.map((id) => `district:${id}`);
  }, [selectedDistricts, viewportFilters.districts]);

  const getCurrentContextForMode = useCallback(
    (mode: ContextMode = 'visible') =>
      getCurrentContext({
        mode,
        crimeTypes: contextCrimeTypes,
        districts: contextDistricts,
        viewportStart,
        viewportEnd,
        selectedTimeRange,
      }),
    [contextCrimeTypes, contextDistricts, selectedTimeRange, viewportEnd, viewportStart]
  );

  return {
    getCurrentContext: getCurrentContextForMode,
    getContextSignature,
  };
}
