import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HeatmapState {
  isEnabled: boolean;
  intensity: number;
  radius: number;
  opacity: number;
  colorRamp: string;
  
  // Actions
  setIsEnabled: (enabled: boolean) => void;
  setIntensity: (intensity: number) => void;
  setRadius: (radius: number) => void;
  setOpacity: (opacity: number) => void;
  setColorRamp: (ramp: string) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS = {
  isEnabled: false,
  intensity: 50.0,
  radius: 5.0,
  opacity: 0.6,
  colorRamp: 'cyan-white', // Monochromatic ramp placeholder
};

export const useHeatmapStore = create<HeatmapState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setIsEnabled: (isEnabled) => set({ isEnabled }),
      setIntensity: (intensity) => set({ intensity }),
      setRadius: (radius) => set({ radius }),
      setOpacity: (opacity) => set({ opacity }),
      setColorRamp: (colorRamp) => set({ colorRamp }),
      
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'heatmap-store-v1',
    }
  )
);
