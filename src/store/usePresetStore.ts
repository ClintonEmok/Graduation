import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenerationPreset } from '@/types/suggestion';

interface PresetStore {
  presets: GenerationPreset[];
  activePresetId: string | null;
  savePreset: (name: string, preset: Omit<GenerationPreset, 'id' | 'name'>) => void;
  deletePreset: (id: string) => void;
  setActivePreset: (id: string | null) => void;
  getActivePreset: () => GenerationPreset | null;
  getPreset: (id: string) => GenerationPreset | undefined;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      savePreset: (name, preset) =>
        set((state) => {
          const newPreset: GenerationPreset = {
            id: crypto.randomUUID(),
            name,
            warpCount: preset.warpCount,
            intervalCount: preset.intervalCount,
            snapToUnit: preset.snapToUnit,
            boundaryMethod: preset.boundaryMethod,
          };
          return {
            presets: [...state.presets, newPreset],
            activePresetId: newPreset.id,
          };
        }),

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        })),

      setActivePreset: (id) => set({ activePresetId: id }),

      getActivePreset: () => {
        const state = get();
        if (!state.activePresetId) return null;
        return state.presets.find((p) => p.id === state.activePresetId) || null;
      },

      getPreset: (id) => {
        return get().presets.find((p) => p.id === id);
      },
    }),
    {
      name: 'timeslicing-generation-presets-v1',
    }
  )
);
