import { create } from 'zustand';

export type SelectionSource = 'cube' | 'timeline' | 'map' | null;

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  setSelectedIndex: (index: number, source: Exclude<SelectionSource, null>) => void;
  clearSelection: () => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  selectedIndex: null,
  selectedSource: null,
  setSelectedIndex: (index, source) => set({ selectedIndex: index, selectedSource: source }),
  clearSelection: () => set({ selectedIndex: null, selectedSource: null })
}));
