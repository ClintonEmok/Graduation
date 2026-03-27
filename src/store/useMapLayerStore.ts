import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LayerVisibility = {
  poi: boolean;
  districts: boolean;
  stkde: boolean;
  heatmap: boolean;
  clusters: boolean;
  trajectories: boolean;
  events: boolean;
};

type LayerOpacity = {
  poi: number;
  districts: number;
  stkde: number;
  heatmap: number;
};

interface MapLayerState {
  visibility: LayerVisibility;
  opacity: LayerOpacity;
  toggleVisibility: (layer: keyof LayerVisibility) => void;
  setVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  setOpacity: (layer: keyof LayerOpacity, value: number) => void;
}

export const useMapLayerStore = create<MapLayerState>()(
  persist(
    (set) => ({
      visibility: {
        poi: true,
        districts: true,
        stkde: false,
        heatmap: false,
        clusters: false,
        trajectories: false,
        events: true,
      },
      opacity: {
        poi: 1,
        districts: 0.3,
        stkde: 0.6,
        heatmap: 0.5,
      },
      toggleVisibility: (layer) =>
        set((state) => ({
          visibility: {
            ...state.visibility,
            [layer]: !state.visibility[layer],
          },
        })),
      setVisibility: (layer, visible) =>
        set((state) => ({
          visibility: {
            ...state.visibility,
            [layer]: visible,
          },
        })),
      setOpacity: (layer, value) =>
        set((state) => ({
          opacity: {
            ...state.opacity,
            [layer]: Math.max(0, Math.min(1, value)),
          },
        })),
    }),
    {
      name: 'map-layer-store-v1',
    }
  )
);

export type { LayerOpacity, LayerVisibility };
