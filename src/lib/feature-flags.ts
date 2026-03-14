export type FeatureCategory = 'visualization' | 'experimental' | 'accessibility';
export type FeatureStatus = 'stable' | 'beta' | 'experimental';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  default: boolean;
  destructive?: boolean; // If true, show confirmation on disable
}

// Define all feature flags for Phases 12-19
export const FLAG_DEFINITIONS: FeatureFlag[] = [
  // Phase 14: Color Schemes
  {
    id: 'colorSchemes',
    name: 'Color Schemes',
    description: 'Enable palette switching (default, colorblind-safe, dark)',
    category: 'accessibility',
    status: 'stable',
    default: false,
  },
  // Phase 15: Time Slices
  {
    id: 'timeSlices',
    name: 'Time Slices',
    description: 'Show horizontal planes at specific time values',
    category: 'visualization',
    status: 'experimental',
    default: false,
    destructive: true, // User may have positioned slices
  },
  // Phase 16: Heatmap Layer
  {
    id: 'heatmap',
    name: 'Heatmap Layer',
    description: '2D density overlay on map panel',
    category: 'visualization',
    status: 'experimental',
    default: false,
  },
  // Phase 17: Cluster Highlighting
  {
    id: 'clustering',
    name: 'Cluster Highlighting',
    description: 'Auto-detect and label dense regions',
    category: 'visualization',
    status: 'experimental',
    default: false,
  },
  // Phase 18: Trajectories
  {
    id: 'trajectories',
    name: 'Trajectories',
    description: 'Connected paths showing event sequences',
    category: 'visualization',
    status: 'experimental',
    default: false,
  },
  // Phase 19: Aggregated Bins (LOD)
  {
    id: 'aggregatedBins',
    name: 'Aggregated Bins (LOD)',
    description: '3D bars instead of points at far zoom',
    category: 'experimental',
    status: 'experimental',
    default: false,
  },
];

export function getDefaultFlags(): Record<string, boolean> {
  return FLAG_DEFINITIONS.reduce((acc, flag) => {
    acc[flag.id] = flag.default;
    return acc;
  }, {} as Record<string, boolean>);
}

export function getFlagsByCategory(category: FeatureCategory): FeatureFlag[] {
  return FLAG_DEFINITIONS.filter((f) => f.category === category);
}
