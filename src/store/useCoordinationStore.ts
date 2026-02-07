import { create } from 'zustand';

export type SelectionSource = 'cube' | 'timeline' | 'map' | null;

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  brushRange: [number, number] | null; // Normalized time range for brush
  selectedBurstWindows: { start: number; end: number; metric: 'density' | 'burstiness' }[];
  detailsOpen: boolean;
  setSelectedIndex: (index: number, source: Exclude<SelectionSource, null>) => void;
  clearSelection: () => void;
  setBrushRange: (range: [number, number] | null) => void;
  toggleBurstWindow: (window: { start: number; end: number; metric: 'density' | 'burstiness' }) => void;
  clearSelectedBurstWindows: () => void;
  setDetailsOpen: (open: boolean) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  brushRange: null,
  selectedBurstWindows: [],
  detailsOpen: false,
  setSelectedIndex: (index, source) => set({ selectedIndex: index, selectedSource: source }),
  clearSelection: () => set({ selectedIndex: null, selectedSource: null }),
  setBrushRange: (range) => set({ brushRange: range }),
  toggleBurstWindow: (window) =>
    set((state) => {
      const exists = state.selectedBurstWindows.some(
        (item) => item.start === window.start && item.end === window.end && item.metric === window.metric
      );
      if (exists) {
        return {
          selectedBurstWindows: state.selectedBurstWindows.filter(
            (item) => !(item.start === window.start && item.end === window.end && item.metric === window.metric)
          )
        };
      }
      const next = [...state.selectedBurstWindows, window];
      return { selectedBurstWindows: next.slice(-3) };
    }),
  clearSelectedBurstWindows: () => set({ selectedBurstWindows: [] }),
  setDetailsOpen: (open) => set({ detailsOpen: open })
}));
