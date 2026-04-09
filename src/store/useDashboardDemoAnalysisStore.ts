import { create } from 'zustand';
import {
  STKDE_PARAM_LIMITS,
  type StkdeParams,
  type StkdeSpatialFilter,
  type StkdeTemporalFilter,
} from '@/store/useStkdeStore';

const DEFAULT_START_EPOCH = 978307200;
const DEFAULT_END_EPOCH = 1767571200;

export const ALL_DEMO_DISTRICTS = Array.from({ length: 25 }, (_, index) => String(index + 1));

export type DemoStkdeScopeMode = 'applied-slices' | 'full-viewport';

export interface DemoAnalysisTimeRange {
  startEpoch: number;
  endEpoch: number;
}

interface DashboardDemoAnalysisState {
  selectedDistricts: string[];
  timeRange: DemoAnalysisTimeRange;
  stkdeScopeMode: DemoStkdeScopeMode;
  stkdeParams: StkdeParams;
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
  setSelectedDistricts: (districts: string[]) => void;
  toggleDistrict: (district: string) => void;
  setTimeRange: (startEpoch: number, endEpoch: number) => void;
  setStkdeScopeMode: (mode: DemoStkdeScopeMode) => void;
  setStkdeParams: (patch: Partial<StkdeParams>) => void;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHoveredHotspot: (hotspotId: string | null) => void;
  setSpatialFilter: (filter: StkdeSpatialFilter | null) => void;
  setTemporalFilter: (filter: StkdeTemporalFilter | null) => void;
  resetAnalysis: () => void;
}

export const useDashboardDemoAnalysisStore = create<DashboardDemoAnalysisState>((set) => ({
  selectedDistricts: [],
  timeRange: {
    startEpoch: DEFAULT_START_EPOCH,
    endEpoch: DEFAULT_END_EPOCH,
  },
  stkdeScopeMode: 'applied-slices',
  stkdeParams: {
    spatialBandwidthMeters: 750,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 12,
    minSupport: 5,
    timeWindowHours: 24,
  },
  selectedHotspotId: null,
  hoveredHotspotId: null,
  spatialFilter: null,
  temporalFilter: null,
  setSelectedDistricts: (districts) => set({ selectedDistricts: districts }),
  toggleDistrict: (district) =>
    set((state) => {
      const next = state.selectedDistricts.includes(district)
        ? state.selectedDistricts.filter((entry) => entry !== district)
        : [...state.selectedDistricts, district];

      return { selectedDistricts: next };
    }),
  setTimeRange: (startEpoch, endEpoch) =>
    set({
      timeRange: {
        startEpoch: Math.min(startEpoch, endEpoch),
        endEpoch: Math.max(endEpoch, startEpoch + 1),
      },
    }),
  setStkdeScopeMode: (stkdeScopeMode) => set({ stkdeScopeMode }),
  setStkdeParams: (patch) =>
    set((state) => ({
      stkdeParams: {
        spatialBandwidthMeters: clampParam(
          patch.spatialBandwidthMeters,
          state.stkdeParams.spatialBandwidthMeters,
          STKDE_PARAM_LIMITS.spatialBandwidthMeters.min,
          STKDE_PARAM_LIMITS.spatialBandwidthMeters.max
        ),
        temporalBandwidthHours: clampParam(
          patch.temporalBandwidthHours,
          state.stkdeParams.temporalBandwidthHours,
          STKDE_PARAM_LIMITS.temporalBandwidthHours.min,
          STKDE_PARAM_LIMITS.temporalBandwidthHours.max
        ),
        gridCellMeters: clampParam(
          patch.gridCellMeters,
          state.stkdeParams.gridCellMeters,
          STKDE_PARAM_LIMITS.gridCellMeters.min,
          STKDE_PARAM_LIMITS.gridCellMeters.max
        ),
        topK: clampParam(
          patch.topK,
          state.stkdeParams.topK,
          STKDE_PARAM_LIMITS.topK.min,
          STKDE_PARAM_LIMITS.topK.max
        ),
        minSupport: clampParam(
          patch.minSupport,
          state.stkdeParams.minSupport,
          STKDE_PARAM_LIMITS.minSupport.min,
          STKDE_PARAM_LIMITS.minSupport.max
        ),
        timeWindowHours: clampParam(
          patch.timeWindowHours,
          state.stkdeParams.timeWindowHours,
          STKDE_PARAM_LIMITS.timeWindowHours.min,
          STKDE_PARAM_LIMITS.timeWindowHours.max
        ),
      },
    })),
  setSelectedHotspot: (selectedHotspotId) => set({ selectedHotspotId }),
  setHoveredHotspot: (hoveredHotspotId) => set({ hoveredHotspotId }),
  setSpatialFilter: (spatialFilter) => set({ spatialFilter }),
  setTemporalFilter: (temporalFilter) => set({ temporalFilter }),
  resetAnalysis: () =>
    set({
      selectedDistricts: [],
      timeRange: {
        startEpoch: DEFAULT_START_EPOCH,
        endEpoch: DEFAULT_END_EPOCH,
      },
      stkdeScopeMode: 'applied-slices',
      stkdeParams: {
        spatialBandwidthMeters: 750,
        temporalBandwidthHours: 24,
        gridCellMeters: 500,
        topK: 12,
        minSupport: 5,
        timeWindowHours: 24,
      },
      selectedHotspotId: null,
      hoveredHotspotId: null,
      spatialFilter: null,
      temporalFilter: null,
    }),
}));

function clampParam(input: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = typeof input === 'number' && Number.isFinite(input) ? input : fallback;
  return Math.floor(Math.min(max, Math.max(min, candidate)));
}
