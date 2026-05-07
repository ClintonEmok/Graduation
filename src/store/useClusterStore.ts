import { create } from 'zustand';
import type { ClusterAnalysisCluster } from '@/lib/clustering/cluster-analysis';

interface ClusterState {
  clusters: ClusterAnalysisCluster[];
  sliceClustersById: Record<string, ClusterAnalysisCluster[]>;
  sensitivity: number;
  selectedClusterId: string | null;
  hoveredClusterId: string | null;
  
  setClusters: (clusters: ClusterAnalysisCluster[]) => void;
  setSliceClustersById: (sliceClustersById: Record<string, ClusterAnalysisCluster[]>) => void;
  setSensitivity: (sensitivity: number) => void;
  setSelectedClusterId: (id: string | null) => void;
  setHoveredClusterId: (id: string | null) => void;
  clearClusterSelection: () => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  clusters: [],
  sliceClustersById: {},
  sensitivity: 0.5,
  selectedClusterId: null,
  hoveredClusterId: null,

  setClusters: (clusters) => set({ clusters }),
  setSliceClustersById: (sliceClustersById) => set({ sliceClustersById }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setSelectedClusterId: (selectedClusterId) => set({ selectedClusterId }),
  setHoveredClusterId: (hoveredClusterId) => set({ hoveredClusterId }),
  clearClusterSelection: () => set({ selectedClusterId: null, hoveredClusterId: null }),
}));
