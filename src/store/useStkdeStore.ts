import { create } from 'zustand';

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
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHoveredHotspot: (hotspotId: string | null) => void;
  setSpatialFilter: (filter: StkdeSpatialFilter | null) => void;
  setTemporalFilter: (filter: StkdeTemporalFilter | null) => void;
  clearFilters: () => void;
}

export const useStkdeStore = create<StkdeStoreState>((set) => ({
  selectedHotspotId: null,
  hoveredHotspotId: null,
  spatialFilter: null,
  temporalFilter: null,
  setSelectedHotspot: (selectedHotspotId) => set({ selectedHotspotId }),
  setHoveredHotspot: (hoveredHotspotId) => set({ hoveredHotspotId }),
  setSpatialFilter: (spatialFilter) => set({ spatialFilter }),
  setTemporalFilter: (temporalFilter) => set({ temporalFilter }),
  clearFilters: () => set({ spatialFilter: null, temporalFilter: null }),
}));
