import { create } from 'zustand';

export interface Bin {
  x: number;
  y: number;
  z: number;
  count: number;
  dominantType: string;
  color: string;
}

interface AggregationState {
  bins: Bin[];
  lodFactor: number; // 0 (points) to 1 (full bins)
  gridResolution: { x: number; y: number; z: number };
  enabled: boolean;
  setBins: (bins: Bin[]) => void;
  setLodFactor: (factor: number) => void;
  setEnabled: (enabled: boolean) => void;
  setGridResolution: (res: { x: number; y: number; z: number }) => void;
}

export const useAggregationStore = create<AggregationState>((set) => ({
  bins: [],
  lodFactor: 0,
  gridResolution: { x: 32, y: 16, z: 32 },
  enabled: false,
  setBins: (bins) => set({ bins }),
  setLodFactor: (lodFactor) => set({ lodFactor }),
  setEnabled: (enabled) => set({ enabled }),
  setGridResolution: (gridResolution) => set({ gridResolution }),
}));
