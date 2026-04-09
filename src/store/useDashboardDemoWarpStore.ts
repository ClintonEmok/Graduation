import { create } from 'zustand';

export type DemoWarpScaleMode = 'linear' | 'adaptive';

interface DashboardDemoWarpState {
  timeScaleMode: DemoWarpScaleMode;
  warpFactor: number;
  setTimeScaleMode: (mode: DemoWarpScaleMode) => void;
  setWarpFactor: (value: number) => void;
  resetWarp: () => void;
}

export const useDashboardDemoWarpStore = create<DashboardDemoWarpState>((set) => ({
  timeScaleMode: 'linear',
  warpFactor: 0,
  setTimeScaleMode: (mode) => set({ timeScaleMode: mode }),
  setWarpFactor: (value) => set({ warpFactor: Math.min(1, Math.max(0, value)) }),
  resetWarp: () => set({ timeScaleMode: 'linear', warpFactor: 0 }),
}));
