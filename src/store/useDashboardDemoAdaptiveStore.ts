import { create } from 'zustand';

interface DashboardDemoAdaptiveState {
  burstThreshold: number;
  setBurstThreshold: (value: number) => void;
  resetBurstThreshold: () => void;
}

export const useDashboardDemoAdaptiveStore = create<DashboardDemoAdaptiveState>((set) => ({
  burstThreshold: 0.7,
  setBurstThreshold: (value) => set({ burstThreshold: Math.max(0, Math.min(1, value)) }),
  resetBurstThreshold: () => set({ burstThreshold: 0.7 }),
}));
