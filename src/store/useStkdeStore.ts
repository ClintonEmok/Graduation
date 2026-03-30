import { create } from 'zustand';
import type { StkdeComputeMode, StkdeResponse } from '@/lib/stkde/contracts';

export interface StkdeParams {
  spatialBandwidthMeters: number;
  temporalBandwidthHours: number;
  gridCellMeters: number;
  topK: number;
  minSupport: number;
  timeWindowHours: number;
}

export const STKDE_PARAM_LIMITS = {
  spatialBandwidthMeters: { min: 100, max: 5000 },
  temporalBandwidthHours: { min: 1, max: 168 },
  gridCellMeters: { min: 100, max: 5000 },
  topK: { min: 1, max: 100 },
  minSupport: { min: 1, max: 1000 },
  timeWindowHours: { min: 1, max: 168 },
} as const;

export interface StkdeSpatialFilter {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface StkdeTemporalFilter {
  startEpochSec: number;
  endEpochSec: number;
}

interface StkdeStoreState {
  scopeMode: 'applied-slices' | 'full-viewport';
  params: StkdeParams;
  runStatus: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  staleReason: string | null;
  isStale: boolean;
  errorMessage: string | null;
  response: StkdeResponse | null;
  lastRunAt: number | null;
  runMeta: {
    requestedComputeMode: StkdeComputeMode;
    effectiveComputeMode: StkdeComputeMode;
    truncated: boolean;
    fallbackApplied: string | null;
    clampsApplied: string[];
  } | null;
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
  setScopeMode: (mode: 'applied-slices' | 'full-viewport') => void;
  setParams: (patch: Partial<StkdeParams>) => void;
  markStale: (reason: string) => void;
  startRun: () => void;
  finishRunSuccess: (response: StkdeResponse) => void;
  finishRunError: (message: string) => void;
  finishRunCancelled: () => void;
  setHotspotSelection: (selectedId: string | null, hoveredId: string | null) => void;
  resetRunArtifacts: () => void;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHoveredHotspot: (hotspotId: string | null) => void;
  setSpatialFilter: (filter: StkdeSpatialFilter | null) => void;
  setTemporalFilter: (filter: StkdeTemporalFilter | null) => void;
  clearFilters: () => void;
}

export const useStkdeStore = create<StkdeStoreState>((set) => ({
  scopeMode: 'applied-slices',
  params: {
    spatialBandwidthMeters: 750,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 12,
    minSupport: 5,
    timeWindowHours: 24,
  },
  runStatus: 'idle',
  staleReason: null,
  isStale: false,
  errorMessage: null,
  response: null,
  lastRunAt: null,
  runMeta: null,
  selectedHotspotId: null,
  hoveredHotspotId: null,
  spatialFilter: null,
  temporalFilter: null,
  setScopeMode: (scopeMode) => set({ scopeMode }),
  setParams: (patch) =>
    set((state) => ({
      params: {
        spatialBandwidthMeters: coerceClampedParam(
          patch.spatialBandwidthMeters,
          state.params.spatialBandwidthMeters,
          STKDE_PARAM_LIMITS.spatialBandwidthMeters.min,
          STKDE_PARAM_LIMITS.spatialBandwidthMeters.max
        ),
        temporalBandwidthHours: coerceClampedParam(
          patch.temporalBandwidthHours,
          state.params.temporalBandwidthHours,
          STKDE_PARAM_LIMITS.temporalBandwidthHours.min,
          STKDE_PARAM_LIMITS.temporalBandwidthHours.max
        ),
        gridCellMeters: coerceClampedParam(
          patch.gridCellMeters,
          state.params.gridCellMeters,
          STKDE_PARAM_LIMITS.gridCellMeters.min,
          STKDE_PARAM_LIMITS.gridCellMeters.max
        ),
        topK: coerceClampedParam(
          patch.topK,
          state.params.topK,
          STKDE_PARAM_LIMITS.topK.min,
          STKDE_PARAM_LIMITS.topK.max
        ),
        minSupport: coerceClampedParam(
          patch.minSupport,
          state.params.minSupport,
          STKDE_PARAM_LIMITS.minSupport.min,
          STKDE_PARAM_LIMITS.minSupport.max
        ),
        timeWindowHours: coerceClampedParam(
          patch.timeWindowHours,
          state.params.timeWindowHours,
          STKDE_PARAM_LIMITS.timeWindowHours.min,
          STKDE_PARAM_LIMITS.timeWindowHours.max
        ),
      },
    })),
  markStale: (reason) => set({ isStale: true, staleReason: reason }),
  startRun: () =>
    set({
      runStatus: 'running',
      errorMessage: null,
      isStale: false,
      staleReason: null,
    }),
  finishRunSuccess: (response) =>
    set({
      runStatus: 'success',
      errorMessage: null,
      response,
      isStale: false,
      staleReason: null,
      lastRunAt: Date.now(),
      runMeta: {
        requestedComputeMode: response.meta.requestedComputeMode,
        effectiveComputeMode: response.meta.effectiveComputeMode,
        truncated: response.meta.truncated,
        fallbackApplied: response.meta.fallbackApplied ?? null,
        clampsApplied: response.meta.clampsApplied ?? [],
      },
    }),
  finishRunError: (errorMessage) =>
    set({
      runStatus: 'error',
      errorMessage,
    }),
  finishRunCancelled: () =>
    set({
      runStatus: 'cancelled',
      errorMessage: null,
    }),
  setHotspotSelection: (selectedHotspotId, hoveredHotspotId) => set({ selectedHotspotId, hoveredHotspotId }),
  resetRunArtifacts: () =>
    set({
      runStatus: 'idle',
      isStale: false,
      staleReason: null,
      errorMessage: null,
      response: null,
      lastRunAt: null,
      runMeta: null,
      selectedHotspotId: null,
      hoveredHotspotId: null,
      spatialFilter: null,
      temporalFilter: null,
    }),
  setSelectedHotspot: (selectedHotspotId) => set({ selectedHotspotId }),
  setHoveredHotspot: (hoveredHotspotId) => set({ hoveredHotspotId }),
  setSpatialFilter: (spatialFilter) => set({ spatialFilter }),
  setTemporalFilter: (temporalFilter) => set({ temporalFilter }),
  clearFilters: () => set({ spatialFilter: null, temporalFilter: null }),
}));

function coerceClampedParam(input: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = typeof input === 'number' && Number.isFinite(input) ? input : fallback;
  return Math.floor(Math.min(max, Math.max(min, candidate)));
}
