import { create } from 'zustand';

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

  // Actions
  toggleType: (id: number) => void;
  toggleDistrict: (id: number) => void;
  setTypes: (ids: number[]) => void;
  setDistricts: (ids: number[]) => void;
  setTimeRange: (range: [number, number] | null) => void;
  clearTimeRange: () => void;
  resetFilters: () => void;

  // Computed/Getters
  isTypeSelected: (id: number) => boolean;
  isDistrictSelected: (id: number) => boolean;
  isTimeFiltered: () => boolean;
  
  // Filter Stats
  getActiveFilterCount: () => number;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  // Initial state - empty arrays mean "all selected"
  selectedTypes: [],
  selectedDistricts: [],
  selectedTimeRange: null,

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
    set({ selectedTimeRange: range });
  },

  // Clear time range filter
  clearTimeRange: () => {
    set({ selectedTimeRange: null });
  },

  // Reset all filters to default (empty = all)
  resetFilters: () => {
    set({
      selectedTypes: [],
      selectedDistricts: [],
      selectedTimeRange: null,
    });
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

  // Get count of active filters
  getActiveFilterCount: () => {
    const state = get();
    let count = 0;
    if (state.selectedTypes.length > 0) count++;
    if (state.selectedDistricts.length > 0) count++;
    if (state.selectedTimeRange !== null) count++;
    return count;
  },
}));
