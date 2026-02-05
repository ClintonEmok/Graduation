import { FilteredPoint } from '@/store/useDataStore';

export interface Trajectory {
  block: string;
  points: FilteredPoint[];
}

/**
 * Groups points into trajectories based on their block attribute.
 * Implements "Contextual Filtering": If any point in a block's trajectory 
 * is in the filtered set, the entire historical path for that block is shown.
 */
export const groupToTrajectories = (
  allPoints: FilteredPoint[],
  filteredPointIndices: Set<number>
): Trajectory[] => {
  const blockMap = new Map<string, FilteredPoint[]>();

  // 1. Group ALL points by block
  allPoints.forEach((point) => {
    if (!point.block) return;
    
    if (!blockMap.has(point.block)) {
      blockMap.set(point.block, []);
    }
    blockMap.get(point.block)!.push(point);
  });

  const trajectories: Trajectory[] = [];

  // 2. Filter blocks: Keep if ANY point in the block is in the filtered set
  blockMap.forEach((points, block) => {
    const hasFilteredPoint = points.some(p => filteredPointIndices.has(p.originalIndex));
    
    if (hasFilteredPoint) {
      // Sort points by time (y)
      const sortedPoints = [...points].sort((a, b) => a.y - b.y);
      trajectories.push({
        block,
        points: sortedPoints
      });
    }
  });

  return trajectories;
};
