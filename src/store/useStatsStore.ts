/**
 * Route-local state store for the stats page.
 * Isolated from dashboard state - no shared state.
 */
import { create } from 'zustand';

const DEFAULT_START_EPOCH = 978307200; // 2001-01-01
const DEFAULT_END_EPOCH = 1767571200; // 2026-01-01

export interface StatsState {
  selectedDistricts: string[];
  timeRange: {
    startEpoch: number;
    endEpoch: number;
  };
  setSelectedDistricts: (districts: string[]) => void;
  toggleDistrict: (district: string) => void;
  selectAllDistricts: () => void;
  clearDistricts: () => void;
  setTimeRange: (start: number, end: number) => void;
  clearFilters: () => void;
}

export const ALL_DISTRICTS = Array.from({ length: 25 }, (_, i) => String(i + 1));

export const useStatsStore = create<StatsState>((set) => ({
  selectedDistricts: [],
  timeRange: {
    startEpoch: DEFAULT_START_EPOCH,
    endEpoch: DEFAULT_END_EPOCH,
  },

  setSelectedDistricts: (districts) =>
    set({ selectedDistricts: districts }),

  toggleDistrict: (district) =>
    set((state) => {
      const current = state.selectedDistricts;
      const isSelected = current.includes(district);
      return {
        selectedDistricts: isSelected
          ? current.filter((d) => d !== district)
          : [...current, district],
      };
    }),

  selectAllDistricts: () =>
    set({ selectedDistricts: ALL_DISTRICTS }),

  clearDistricts: () =>
    set({ selectedDistricts: [] }),

  setTimeRange: (startEpoch, endEpoch) =>
    set({ timeRange: { startEpoch, endEpoch } }),

  clearFilters: () =>
    set({
      selectedDistricts: [],
      timeRange: {
        startEpoch: DEFAULT_START_EPOCH,
        endEpoch: DEFAULT_END_EPOCH,
      },
    }),
}));
