import React, { useEffect, useMemo, useCallback } from 'react';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { selectFilteredData, type FilteredDataState } from '@/lib/data/selectors';
import { FilteredPoint } from '@/lib/data/types';
import { useFilterStore } from '@/store/useFilterStore';
import { useClusterStore } from '@/store/useClusterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useUIStore } from '@/store/ui';
import { computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import debounce from 'lodash.debounce';
import { analyzeClusters } from '@/lib/clustering/cluster-analysis';

export const ClusterManager: React.FC = () => {
  const columns = useTimelineDataStore((state) => state.columns);
  const data = useTimelineDataStore((state) => state.data);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  
  const sensitivity = useClusterStore((state) => state.sensitivity);
  const setClusters = useClusterStore((state) => state.setClusters);
  const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
  
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  // Perform clustering
  const performClustering = useCallback(() => {
    // 1. Get filtered data
    const filteredDataState: FilteredDataState = { columns, data, minTimestampSec, maxTimestampSec };
    const filteredPoints = selectFilteredData(filteredDataState, {
      selectedTypes,
      selectedDistricts,
      selectedTimeRange,
    });

    if (filteredPoints.length === 0) {
      setClusters([]);
      setSliceClustersById({});
      return;
    }

    // 2. Prepare for Adaptive Awareness
    let pointsToCluster: FilteredPoint[] = filteredPoints;
    if (timeScaleMode === 'adaptive') {
      // Re-calculate Y positions based on adaptive scale for the filtered set
      // Actually, it's better to use the already calculated adaptiveYValues 
      // from the full set to maintain consistency with the visualization.
      // But filteredPoints already has 'y' as linear normalized time.
      
      // We need to map them to adaptive Y.
      const timestamps = new Float32Array(filteredPoints.map(p => p.y));
      const adaptiveY = computeAdaptiveYColumnar(timestamps, [0, 100], [0, 100]);
      pointsToCluster = filteredPoints.map((p, i) => ({
        ...p,
        y: adaptiveY[i]
      }));
    }

    const analysis = analyzeClusters(pointsToCluster, sensitivity);
    const clusters = analysis.clusters;

    console.log(`[ClusterManager] Detected ${clusters.length} clusters`);
    setClusters(clusters);
  }, [
    columns, data, minTimestampSec, maxTimestampSec,
    selectedTypes, selectedDistricts, selectedTimeRange,
    sensitivity, timeScaleMode, setClusters, setSliceClustersById
  ]);

  // Debounced execution
  const debouncedClustering = useMemo(
    () => debounce(performClustering, 400),
    [performClustering]
  );

  useEffect(() => {
    debouncedClustering();
    return () => debouncedClustering.cancel();
  }, [debouncedClustering]);

  return null; // Logic-only component
};
