import React, { useMemo } from 'react';
import { useDataStore, selectFilteredData } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { groupToTrajectories } from '@/lib/trajectories';
import { Trajectory } from './Trajectory';
import { computeAdaptiveYColumnar } from '@/lib/adaptive-scale';

export const TrajectoryLayer: React.FC = () => {
  const isVisible = useTrajectoryStore((state) => state.isVisible);
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);

  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);

  // 1. Get filtered data (to know which blocks to show)
  const filteredPoints = useMemo(() => {
    return selectFilteredData(
      { columns, data, minTimestampSec, maxTimestampSec } as any,
      { selectedTypes, selectedDistricts, selectedTimeRange }
    );
  }, [columns, data, minTimestampSec, maxTimestampSec, selectedTypes, selectedDistricts, selectedTimeRange]);

  const filteredIndices = useMemo(() => new Set(filteredPoints.map(p => p.originalIndex)), [filteredPoints]);

  // 2. Get ALL points as FilteredPoint[] for grouping (to show full context)
  const allPoints = useMemo(() => {
    if (!columns) return []; // Fallback for mock data handled below if needed
    
    const points: any[] = [];
    for (let i = 0; i < columns.length; i++) {
      points.push({
        x: columns.x[i],
        y: columns.timestamp[i],
        z: columns.z[i],
        block: columns.block[i],
        originalIndex: i
      });
    }
    return points;
  }, [columns]);

  // 3. Compute Adaptive Y for ALL points
  const adaptiveYValues = useMemo(() => {
    if (!columns) return null;
    return computeAdaptiveYColumnar(columns.timestamp, [0, 100], [0, 100]);
  }, [columns]);

  // 4. Group into trajectories
  const trajectories = useMemo(() => {
    if (columns) {
      return groupToTrajectories(allPoints, filteredIndices);
    }
    // Mock data handling (if useDataStore.data is used)
    const mockPoints = data.map((p, i) => ({
      x: p.x,
      y: p.timestamp,
      z: p.z,
      block: p.block,
      originalIndex: i
    }));
    return groupToTrajectories(mockPoints as any, filteredIndices);
  }, [allPoints, filteredIndices, columns, data]);

  if (!isVisible) return null;

  return (
    <group>
      {trajectories.map((traj) => (
        <Trajectory 
          key={traj.block} 
          trajectory={traj} 
          adaptiveYValues={adaptiveYValues}
        />
      ))}
    </group>
  );
};
