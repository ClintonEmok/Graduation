import { create } from 'zustand';

export type SelectionSource = 'cube' | 'timeline' | 'map' | null;

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  brushRange: [number, number] | null; // Normalized time range for brush
  setSelectedIndex: (index: number, source: Exclude<SelectionSource, null>) => void;
  clearSelection: () => void;
  setBrushRange: (range: [number, number] | null) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  brushRange: null,
  setSelectedIndex: (index, source) => set({ selectedIndex: index, selectedSource: source }),
  clearSelection: () => set({ selectedIndex: null, selectedSource: null }),
  setBrushRange: (range) => set({ brushRange: range })
}));
