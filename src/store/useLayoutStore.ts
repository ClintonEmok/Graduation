import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PanelVisibility {
  timeline: boolean;
  map: boolean;
  refinement: boolean;
  layers: boolean;
  cube: boolean;
}

interface LayoutState {
  // Panel visibility
  panels: PanelVisibility;
  setPanel: (panel: keyof PanelVisibility, visible: boolean) => void;
  togglePanel: (panel: keyof PanelVisibility) => void;

  // Map/timeline split ratio (percentage for map)
  mapRatio: number;
  setMapRatio: (ratio: number) => void;

  // Legacy layout fields (preserved for compatibility)
  outerLayout: Record<string, number>;
  innerLayout: Record<string, number>;
  setOuterLayout: (layout: Record<string, number>) => void;
  setInnerLayout: (layout: Record<string, number>) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Panel visibility
      panels: {
        timeline: true,
        map: true,
        refinement: true,
        layers: true,
        cube: true,
      },
      setPanel: (panel, visible) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: visible },
        })),
      togglePanel: (panel) =>
        set((state) => ({
          panels: { ...state.panels, [panel]: !state.panels[panel] },
        })),

      // Map/timeline split ratio (map takes this percentage of vertical space)
      mapRatio: 55,
      setMapRatio: (ratio) => set({ mapRatio: Math.max(20, Math.min(80, ratio)) }),

      // Legacy layout fields
      outerLayout: { top: 70, bottom: 30 },
      innerLayout: { left: 50, right: 50 },
      setOuterLayout: (outerLayout) => set({ outerLayout }),
      setInnerLayout: (innerLayout) => set({ innerLayout }),
    }),
    {
      name: 'layout-storage-v3',
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as Partial<LayoutState> | undefined;
        return {
          ...currentState,
          ...typedPersisted,
          panels: {
            ...currentState.panels,
            ...(typedPersisted?.panels ?? {}),
          },
        };
      },
    }
  )
);
