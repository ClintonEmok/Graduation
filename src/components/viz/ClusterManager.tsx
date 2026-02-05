import React, { useEffect, useMemo, useCallback } from 'react';
import { useDataStore, selectFilteredData, FilteredPoint } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useClusterStore, Cluster } from '@/store/useClusterStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useUIStore } from '@/store/ui';
import { computeAdaptiveY, computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import { getCrimeTypeName } from '@/lib/category-maps';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';
import * as THREE from 'three';
import { DBSCAN } from 'density-clustering';
import debounce from 'lodash.debounce';

export const ClusterManager: React.FC = () => {
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  
  const enabled = useClusterStore((state) => state.enabled);
  const sensitivity = useClusterStore((state) => state.sensitivity);
  const setClusters = useClusterStore((state) => state.setClusters);
  
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const theme = useThemeStore((state) => state.theme);
  const colorMap = useMemo(() => PALETTES[theme].categoryColors, [theme]);

  // Perform clustering
  const performClustering = useCallback(() => {
    if (!enabled) {
      setClusters([]);
      return;
    }

    // 1. Get filtered data
    const filteredPoints = selectFilteredData(
      { columns, data, minTimestampSec, maxTimestampSec } as any,
      { selectedTypes, selectedDistricts, selectedTimeRange }
    );

    if (filteredPoints.length === 0) {
      setClusters([]);
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

    // 3. Cluster using DBSCAN
    // Weighted distance: X, Z (1.0), Y (0.5)
    const dataset = pointsToCluster.map(p => [p.x, p.y * 0.5, p.z]);
    
    // Map sensitivity to epsilon
    // sensitivity 0.1 -> large epsilon (coarse clusters)
    // sensitivity 0.9 -> small epsilon (tight clusters)
    const epsilon = 15 - (sensitivity * 12);
    const minPoints = 5;

    const dbscan = new DBSCAN();
    const clustersIndices: number[][] = dbscan.run(dataset, epsilon, minPoints);

    // 4. Calculate metadata for each cluster
    const clusters: Cluster[] = clustersIndices.map((indices, clusterIdx) => {
      const clusterPoints = indices.map(idx => pointsToCluster[idx]);
      
      // Bounding Box
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      let minLon = Infinity, maxLon = -Infinity;
      
      const typeCounts: Record<number, number> = {};
      
      clusterPoints.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
        
        if (p.lat !== undefined) {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
        }
        if (p.lon !== undefined) {
          if (p.lon < minLon) minLon = p.lon;
          if (p.lon > maxLon) maxLon = p.lon;
        }
        
        typeCounts[p.typeId] = (typeCounts[p.typeId] || 0) + 1;
      });

      // Dominant Type
      let maxCount = 0;
      let dominantTypeId = 0;
      Object.entries(typeCounts).forEach(([typeId, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantTypeId = parseInt(typeId);
        }
      });
      
      const dominantTypeName = getCrimeTypeName(dominantTypeId);
      const colorHex = colorMap[dominantTypeName.toUpperCase()] || colorMap[dominantTypeName] || '#FFFFFF';

      return {
        id: `cluster-${clusterIdx}`,
        center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
        size: [maxX - minX, maxY - minY, maxZ - minZ],
        count: clusterPoints.length,
        dominantType: dominantTypeName,
        color: colorHex,
        minLat: minLat === Infinity ? 0 : minLat,
        maxLat: maxLat === -Infinity ? 0 : maxLat,
        minLon: minLon === Infinity ? 0 : minLon,
        maxLon: maxLon === -Infinity ? 0 : maxLon,
      };
    });

    console.log(`[ClusterManager] Detected ${clusters.length} clusters`);
    setClusters(clusters);
  }, [
    columns, data, minTimestampSec, maxTimestampSec,
    selectedTypes, selectedDistricts, selectedTimeRange,
    enabled, sensitivity, timeScaleMode, colorMap, setClusters
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
