import { create } from 'zustand';

interface UIState {
  mode: 'abstract' | 'map';
  showContext: boolean;
  contextOpacity: number;
  resetVersion: number;
  setMode: (mode: 'abstract' | 'map') => void;
  toggleMode: () => void;
  toggleContext: () => void;
  setContextOpacity: (opacity: number) => void;
  triggerReset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'abstract',
  showContext: true,
  contextOpacity: 0.1,
  resetVersion: 0,
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({ mode: state.mode === 'abstract' ? 'map' : 'abstract' })),
  toggleContext: () => set((state) => ({ showContext: !state.showContext })),
  setContextOpacity: (opacity) => set({ contextOpacity: opacity }),
  triggerReset: () => set((state) => ({ resetVersion: state.resetVersion + 1 })),
}));
