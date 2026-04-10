import { create } from 'zustand';

export type DemoWarpScaleMode = 'linear' | 'adaptive';
export type DemoWarpSource = 'density' | 'slice-authored';

interface DashboardDemoWarpState {
  timeScaleMode: DemoWarpScaleMode;
  warpSource: DemoWarpSource;
  warpFactor: number;
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  mapDomain: [number, number];
  isComputing: boolean;
  setTimeScaleMode: (mode: DemoWarpScaleMode) => void;
  setWarpSource: (source: DemoWarpSource) => void;
  setWarpFactor: (value: number) => void;
  setPrecomputedMaps: (
    densityMap: Float32Array | null,
    warpMap: Float32Array | null,
    domain: [number, number]
  ) => void;
  setIsComputing: (value: boolean) => void;
  resetWarp: () => void;
}

export const useDashboardDemoWarpStore = create<DashboardDemoWarpState>((set) => ({
  timeScaleMode: 'linear',
  warpSource: 'slice-authored',
  warpFactor: 0,
  densityMap: null,
  warpMap: null,
  mapDomain: [0, 100],
  isComputing: false,
  setTimeScaleMode: (mode) => set({ timeScaleMode: mode }),
  setWarpSource: (source) => set({ warpSource: source }),
  setWarpFactor: (value) => set({ warpFactor: Math.min(1, Math.max(0, value)) }),
  setPrecomputedMaps: (densityMap, warpMap, domain) =>
    set({ densityMap, warpMap, mapDomain: domain, isComputing: false }),
  setIsComputing: (value) => set({ isComputing: value }),
  resetWarp: () =>
    set({
      timeScaleMode: 'linear',
      warpFactor: 0,
      warpSource: 'slice-authored',
      isComputing: false,
    }),
}));
