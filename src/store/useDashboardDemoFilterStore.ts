import { create } from 'zustand';

export interface FilterPreset {
  id: string;
  name: string;
  types: number[];
  districts: number[];
  timeRange: [number, number] | null;
  createdAt: number;
}

export interface SpatialBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const PRESET_STORAGE_KEY = 'dashboard-demo-filter-presets';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const loadPresetsFromStorage = () => {
  const storage = getStorage();
  if (!storage) return [] as FilterPreset[];
  try {
    const raw = storage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [] as FilterPreset[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as FilterPreset[];
    return parsed.filter((preset) => preset && typeof preset.id === 'string');
  } catch {
    storage.removeItem(PRESET_STORAGE_KEY);
    return [] as FilterPreset[];
  }
};

const persistPresets = (presets: FilterPreset[]) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
};

const normalizePresetName = (name: string) => name.trim();
const isValidPresetName = (name: string) => {
  const length = name.length;
  return length >= 3 && length <= 50;
};

interface DashboardDemoFilterState {
  selectedTypes: number[];
  selectedDistricts: number[];
  selectedTimeRange: [number, number] | null;
  selectedSpatialBounds: SpatialBounds | null;
  presets: FilterPreset[];
  lastLoadedPresetId: string | null;
  toggleType: (id: number) => void;
  toggleDistrict: (id: number) => void;
  setTypes: (ids: number[]) => void;
  setDistricts: (ids: number[]) => void;
  setTimeRange: (range: [number, number] | null) => void;
  clearTimeRange: () => void;
  setSpatialBounds: (bounds: SpatialBounds) => void;
  clearSpatialBounds: () => void;
  resetFilters: () => void;
  savePreset: (name: string) => FilterPreset | null;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  clearAllPresets: () => void;
  renamePreset: (id: string, newName: string) => void;
  isTypeSelected: (id: number) => boolean;
  isDistrictSelected: (id: number) => boolean;
  isTimeFiltered: () => boolean;
  isSpatialFiltered: () => boolean;
  getPresetById: (id: string) => FilterPreset | undefined;
  hasPresets: () => boolean;
  getActiveFilterCount: () => number;
}

export const useDashboardDemoFilterStore = create<DashboardDemoFilterState>((set, get) => ({
  selectedTypes: [],
  selectedDistricts: [],
  selectedTimeRange: null,
  selectedSpatialBounds: null,
  presets: loadPresetsFromStorage(),
  lastLoadedPresetId: null,
  toggleType: (id) => {
    set((state) => {
      const current = state.selectedTypes;
      const exists = current.includes(id);

      if (exists) {
        return { selectedTypes: current.filter((t) => t !== id) };
      }

      return { selectedTypes: [...current, id] };
    });
  },
  toggleDistrict: (id) => {
    set((state) => {
      const current = state.selectedDistricts;
      const exists = current.includes(id);

      if (exists) {
        return { selectedDistricts: current.filter((d) => d !== id) };
      }

      return { selectedDistricts: [...current, id] };
    });
  },
  setTypes: (ids) => set({ selectedTypes: ids }),
  setDistricts: (ids) => set({ selectedDistricts: ids }),
  setTimeRange: (range) => {
    set((state) => {
      const current = state.selectedTimeRange;
      if (current === null && range === null) return state;
      if (current && range && current[0] === range[0] && current[1] === range[1]) {
        return state;
      }
      return { selectedTimeRange: range };
    });
  },
  clearTimeRange: () => set({ selectedTimeRange: null }),
  setSpatialBounds: (bounds) => set({ selectedSpatialBounds: bounds }),
  clearSpatialBounds: () => set({ selectedSpatialBounds: null }),
  resetFilters: () => {
    set({
      selectedTypes: [],
      selectedDistricts: [],
      selectedTimeRange: null,
      selectedSpatialBounds: null,
    });
  },
  savePreset: (name) => {
    const trimmedName = normalizePresetName(name);
    if (!isValidPresetName(trimmedName)) return null;
    const state = get();
    const preset: FilterPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      types: [...state.selectedTypes],
      districts: [...state.selectedDistricts],
      timeRange: state.selectedTimeRange ? [...state.selectedTimeRange] : null,
      createdAt: Date.now(),
    };
    const nextPresets = [preset, ...state.presets];
    persistPresets(nextPresets);
    set({ presets: nextPresets, lastLoadedPresetId: preset.id });
    return preset;
  },
  loadPreset: (id) => {
    const preset = get().presets.find((item) => item.id === id);
    if (!preset) return;
    set({
      selectedTypes: [...preset.types],
      selectedDistricts: [...preset.districts],
      selectedTimeRange: preset.timeRange ? [...preset.timeRange] : null,
      lastLoadedPresetId: preset.id,
    });
  },
  deletePreset: (id) => {
    const state = get();
    const nextPresets = state.presets.filter((preset) => preset.id !== id);
    const nextLoaded = state.lastLoadedPresetId === id ? null : state.lastLoadedPresetId;
    persistPresets(nextPresets);
    set({ presets: nextPresets, lastLoadedPresetId: nextLoaded });
  },
  clearAllPresets: () => {
    persistPresets([]);
    set({ presets: [], lastLoadedPresetId: null });
  },
  renamePreset: (id, newName) => {
    const trimmedName = normalizePresetName(newName);
    if (!isValidPresetName(trimmedName)) return;
    const state = get();
    const nextPresets = state.presets.map((preset) =>
      preset.id === id ? { ...preset, name: trimmedName } : preset
    );
    persistPresets(nextPresets);
    set({ presets: nextPresets });
  },
  isTypeSelected: (id) => {
    const state = get();
    if (state.selectedTypes.length === 0) return true;
    return state.selectedTypes.includes(id);
  },
  isDistrictSelected: (id) => {
    const state = get();
    if (state.selectedDistricts.length === 0) return true;
    return state.selectedDistricts.includes(id);
  },
  isTimeFiltered: () => get().selectedTimeRange !== null,
  isSpatialFiltered: () => get().selectedSpatialBounds !== null,
  getPresetById: (id) => get().presets.find((preset) => preset.id === id),
  hasPresets: () => get().presets.length > 0,
  getActiveFilterCount: () => {
    const state = get();
    return [
      state.selectedTypes.length,
      state.selectedDistricts.length,
      state.selectedTimeRange ? 1 : 0,
      state.selectedSpatialBounds ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);
  },
}));
