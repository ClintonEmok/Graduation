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

const PRESET_STORAGE_KEY = 'crimeviz-presets';

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

/**
 * Filter State Management
 * 
 * Central state for filter selections used by the UI and GPU filtering.
 * Store uses integer IDs to match GPU requirements for efficient filtering.
 */

interface FilterState {
  // Selection State
  selectedTypes: number[];      // Crime type IDs (empty = all types)
  selectedDistricts: number[];  // District IDs (empty = all districts)
  selectedTimeRange: [number, number] | null;  // Unix timestamp range [start, end]
  selectedSpatialBounds: SpatialBounds | null;

  // Presets
  presets: FilterPreset[];
  lastLoadedPresetId: string | null;

  // Actions
  toggleType: (id: number) => void;
  toggleDistrict: (id: number) => void;
  setTypes: (ids: number[]) => void;
  setDistricts: (ids: number[]) => void;
  setTimeRange: (range: [number, number] | null) => void;
  clearTimeRange: () => void;
  setSpatialBounds: (bounds: SpatialBounds) => void;
  clearSpatialBounds: () => void;
  resetFilters: () => void;

  // Preset Actions
  savePreset: (name: string) => FilterPreset | null;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  clearAllPresets: () => void;
  renamePreset: (id: string, newName: string) => void;

  // Computed/Getters
  isTypeSelected: (id: number) => boolean;
  isDistrictSelected: (id: number) => boolean;
  isTimeFiltered: () => boolean;
  isSpatialFiltered: () => boolean;

  // Preset Helpers
  getPresetById: (id: string) => FilterPreset | undefined;
  hasPresets: () => boolean;
  
  // Filter Stats
  getActiveFilterCount: () => number;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  // Initial state - empty arrays mean "all selected"
  selectedTypes: [],
  selectedDistricts: [],
  selectedTimeRange: null,
  selectedSpatialBounds: null,

  presets: loadPresetsFromStorage(),
  lastLoadedPresetId: null,

  // Toggle a crime type ID in the selection
  toggleType: (id: number) => {
    set((state) => {
      const current = state.selectedTypes;
      const exists = current.includes(id);
      
      if (exists) {
        // Remove if already selected
        return { selectedTypes: current.filter((t) => t !== id) };
      } else {
        // Add if not selected
        return { selectedTypes: [...current, id] };
      }
    });
  },

  // Toggle a district ID in the selection
  toggleDistrict: (id: number) => {
    set((state) => {
      const current = state.selectedDistricts;
      const exists = current.includes(id);
      
      if (exists) {
        // Remove if already selected
        return { selectedDistricts: current.filter((d) => d !== id) };
      } else {
        // Add if not selected
        return { selectedDistricts: [...current, id] };
      }
    });
  },

  // Set all selected types (replace entire array)
  setTypes: (ids: number[]) => {
    set({ selectedTypes: ids });
  },

  // Set all selected districts (replace entire array)
  setDistricts: (ids: number[]) => {
    set({ selectedDistricts: ids });
  },

  // Set time range (Unix timestamps)
  setTimeRange: (range: [number, number] | null) => {
    set((state) => {
      const current = state.selectedTimeRange;
      if (current === null && range === null) return state;
      if (current && range && current[0] === range[0] && current[1] === range[1]) {
        return state;
      }
      return { selectedTimeRange: range };
    });
  },

  // Clear time range filter
  clearTimeRange: () => {
    set({ selectedTimeRange: null });
  },

  setSpatialBounds: (bounds: SpatialBounds) => {
    set({ selectedSpatialBounds: bounds });
  },

  clearSpatialBounds: () => {
    set({ selectedSpatialBounds: null });
  },

  // Reset all filters to default (empty = all)
  resetFilters: () => {
    set({
      selectedTypes: [],
      selectedDistricts: [],
      selectedTimeRange: null,
      selectedSpatialBounds: null,
    });
  },

  savePreset: (name: string) => {
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

  loadPreset: (id: string) => {
    const preset = get().presets.find((item) => item.id === id);
    if (!preset) return;
    set({
      selectedTypes: [...preset.types],
      selectedDistricts: [...preset.districts],
      selectedTimeRange: preset.timeRange ? [...preset.timeRange] : null,
      lastLoadedPresetId: preset.id,
    });
  },

  deletePreset: (id: string) => {
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

  renamePreset: (id: string, newName: string) => {
    const trimmedName = normalizePresetName(newName);
    if (!isValidPresetName(trimmedName)) return;
    const state = get();
    const nextPresets = state.presets.map((preset) =>
      preset.id === id ? { ...preset, name: trimmedName } : preset
    );
    persistPresets(nextPresets);
    set({ presets: nextPresets });
  },

  // Check if a specific type ID is selected
  isTypeSelected: (id: number) => {
    const state = get();
    // Empty array means all are selected
    if (state.selectedTypes.length === 0) return true;
    return state.selectedTypes.includes(id);
  },

  // Check if a specific district ID is selected
  isDistrictSelected: (id: number) => {
    const state = get();
    // Empty array means all are selected
    if (state.selectedDistricts.length === 0) return true;
    return state.selectedDistricts.includes(id);
  },

  // Check if time filtering is active
  isTimeFiltered: () => {
    const state = get();
    return state.selectedTimeRange !== null;
  },

  isSpatialFiltered: () => {
    const state = get();
    return state.selectedSpatialBounds !== null;
  },

  getPresetById: (id: string) => {
    return get().presets.find((preset) => preset.id === id);
  },

  hasPresets: () => {
    return get().presets.length > 0;
  },

  // Get count of active filters
  getActiveFilterCount: () => {
    const state = get();
    let count = 0;
    if (state.selectedTypes.length > 0) count++;
    if (state.selectedDistricts.length > 0) count++;
    if (state.selectedTimeRange !== null) count++;
    if (state.selectedSpatialBounds !== null) count++;
    return count;
  },
}));
