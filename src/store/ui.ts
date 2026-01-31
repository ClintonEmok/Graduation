import { create } from 'zustand';

interface UIState {
  mode: 'abstract' | 'map';
  resetVersion: number;
  setMode: (mode: 'abstract' | 'map') => void;
  toggleMode: () => void;
  triggerReset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'abstract',
  resetVersion: 0,
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({ mode: state.mode === 'abstract' ? 'map' : 'abstract' })),
  triggerReset: () => set((state) => ({ resetVersion: state.resetVersion + 1 })),
}));
