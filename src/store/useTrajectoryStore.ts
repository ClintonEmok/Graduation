import { create } from 'zustand';

interface TrajectoryState {
  hoveredBlock: string | null;
  selectedBlock: string | null;
  isVisible: boolean;
  
  setHoveredBlock: (block: string | null) => void;
  setSelectedBlock: (block: string | null) => void;
  setIsVisible: (visible: boolean) => void;
  resetSelection: () => void;
}

export const useTrajectoryStore = create<TrajectoryState>((set) => ({
  hoveredBlock: null,
  selectedBlock: null,
  isVisible: true,

  setHoveredBlock: (block) => set({ hoveredBlock: block }),
  setSelectedBlock: (block) => set({ selectedBlock: block }),
  setIsVisible: (visible) => set({ isVisible: visible }),
  resetSelection: () => set({ hoveredBlock: null, selectedBlock: null }),
}));
