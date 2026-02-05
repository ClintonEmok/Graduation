import { create } from 'zustand';

export interface Cluster {
  id: string;
  center: [number, number, number];
  size: [number, number, number];
  count: number;
  dominantType: string;
  color: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface ClusterState {
  clusters: Cluster[];
  enabled: boolean;
  sensitivity: number;
  selectedClusterId: string | null;
  
  setClusters: (clusters: Cluster[]) => void;
  setEnabled: (enabled: boolean) => void;
  setSensitivity: (sensitivity: number) => void;
  setSelectedClusterId: (id: string | null) => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  clusters: [],
  enabled: true,
  sensitivity: 0.5,
  selectedClusterId: null,

  setClusters: (clusters) => set({ clusters }),
  setEnabled: (enabled) => set({ enabled }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setSelectedClusterId: (selectedClusterId) => set({ selectedClusterId }),
}));
