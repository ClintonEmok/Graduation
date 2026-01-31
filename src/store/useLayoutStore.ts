import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Layout = Record<string, number>;

interface LayoutState {
  mainLayout: Layout;
  rightLayout: Layout;
  setMainLayout: (layout: Layout) => void;
  setRightLayout: (layout: Layout) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      mainLayout: { left: 40, right: 60 },
      rightLayout: { top: 70, bottom: 30 },
      setMainLayout: (mainLayout) => set({ mainLayout }),
      setRightLayout: (rightLayout) => set({ rightLayout }),
    }),
    {
      name: 'layout-storage',
    }
  )
);
