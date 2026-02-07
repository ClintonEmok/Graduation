import { create } from 'zustand';

export type SelectionSource = 'cube' | 'timeline' | 'map' | null;

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  brushRange: [number, number] | null; // Normalized time range for brush
  selectedBurstWindow: { start: number; end: number; metric: 'density' | 'burstiness' } | null;
  setSelectedIndex: (index: number, source: Exclude<SelectionSource, null>) => void;
  clearSelection: () => void;
  setBrushRange: (range: [number, number] | null) => void;
  setSelectedBurstWindow: (window: { start: number; end: number; metric: 'density' | 'burstiness' }) => void;
  clearSelectedBurstWindow: () => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  brushRange: null,
  selectedBurstWindow: null,
  setSelectedIndex: (index, source) => set({ selectedIndex: index, selectedSource: source }),
  clearSelection: () => set({ selectedIndex: null, selectedSource: null }),
  setBrushRange: (range) => set({ brushRange: range }),
  setSelectedBurstWindow: (window) => set({ selectedBurstWindow: window }),
  clearSelectedBurstWindow: () => set({ selectedBurstWindow: null })
}));
