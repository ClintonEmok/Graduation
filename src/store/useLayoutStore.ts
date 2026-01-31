import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Layout = Record<string, number>;

interface LayoutState {
  outerLayout: Layout;
  innerLayout: Layout;
  setOuterLayout: (layout: Layout) => void;
  setInnerLayout: (layout: Layout) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      outerLayout: { top: 70, bottom: 30 },
      innerLayout: { left: 50, right: 50 },
      setOuterLayout: (outerLayout) => set({ outerLayout }),
      setInnerLayout: (innerLayout) => set({ innerLayout }),
    }),
    {
      name: 'layout-storage-v2',
    }
  )
);
