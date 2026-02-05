import React, { useEffect, useMemo, useCallback } from 'react';
import { useDataStore, selectFilteredData, FilteredPoint } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useAggregationStore, Bin } from '@/store/useAggregationStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { getCrimeTypeName } from '@/lib/category-maps';
import { computeAdaptiveYColumnar } from '@/lib/adaptive-scale';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import debounce from 'lodash.debounce';

export const AggregationManager: React.FC = () => {
  const columns = useDataStore((state) => state.columns);
  const data = useDataStore((state) => state.data);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);
  const theme = useThemeStore((state) => state.theme);
  const colorMap = useMemo(() => PALETTES[theme].categoryColors, [theme]);

  const isEnabled = useFeatureFlagsStore((state) => state.isEnabled('aggregatedBins'));
  const gridResolution = useAggregationStore((state) => state.gridResolution);
  const setBins = useAggregationStore((state) => state.setBins);
  const setStoreEnabled = useAggregationStore((state) => state.setEnabled);

  // Sync enabled state to store
  useEffect(() => {
    setStoreEnabled(isEnabled);
  }, [isEnabled, setStoreEnabled]);

  const performAggregation = useCallback(() => {
    if (!isEnabled) {
      setBins([]);
      return;
    }

    // 1. Get filtered data
    const filteredPoints = selectFilteredData(
      { columns, data, minTimestampSec, maxTimestampSec } as any,
      { selectedTypes, selectedDistricts, selectedTimeRange }
    );

    if (filteredPoints.length === 0) {
      setBins([]);
      return;
    }

    // 2. Adaptive Awareness
    let pointsToBin: FilteredPoint[] = filteredPoints;
    if (timeScaleMode === 'adaptive') {
      const timestamps = new Float32Array(filteredPoints.map(p => p.y));
      const adaptiveY = computeAdaptiveYColumnar(timestamps, [0, 100], [0, 100]);
      pointsToBin = filteredPoints.map((p, i) => ({
        ...p,
        y: adaptiveY[i]
      }));
    }

    // 3. 3D Binning
    const res = gridResolution;
    const dx = 100 / res.x;
    const dy = 100 / res.y;
    const dz = 100 / res.z;

    const binData = new Map<number, { count: number, types: Record<number, number> }>();

    pointsToBin.forEach(p => {
      const ix = Math.floor((p.x + 50) / dx);
      const iy = Math.floor(p.y / dy);
      const iz = Math.floor((p.z + 50) / dz);
      
      if (ix >= 0 && ix < res.x && iy >= 0 && iy < res.y && iz >= 0 && iz < res.z) {
        const binIdx = ix + iy * res.x + iz * res.x * res.y;
        if (!binData.has(binIdx)) {
          binData.set(binIdx, { count: 0, types: {} });
        }
        const b = binData.get(binIdx)!;
        b.count++;
        b.types[p.typeId] = (b.types[p.typeId] || 0) + 1;
      }
    });

    // 4. Convert to Bins
    const bins: Bin[] = [];
    binData.forEach((data, idx) => {
      const ix = idx % res.x;
      const iy = Math.floor(idx / res.x) % res.y;
      const iz = Math.floor(idx / (res.x * res.y));
      
      // Center of bin in 3D space
      const bx = (ix + 0.5) * dx - 50;
      const by = (iy + 0.5) * dy;
      const bz = (iz + 0.5) * dz - 50;
      
      // Find dominant type
      let maxCount = 0;
      let dominantTypeId = 0;
      Object.entries(data.types).forEach(([typeId, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantTypeId = parseInt(typeId);
        }
      });
      
      const typeName = getCrimeTypeName(dominantTypeId);
      const color = colorMap[typeName.toUpperCase()] || colorMap[typeName] || '#FFFFFF';
      
      bins.push({
        x: bx,
        y: by,
        z: bz,
        count: data.count,
        dominantType: typeName,
        color
      });
    });

    console.log(`[AggregationManager] Generated ${bins.length} bins from ${pointsToBin.length} points`);
    setBins(bins);
  }, [
    isEnabled, columns, data, minTimestampSec, maxTimestampSec,
    selectedTypes, selectedDistricts, selectedTimeRange,
    timeScaleMode, gridResolution, colorMap, setBins
  ]);

  const debouncedAggregation = useMemo(
    () => debounce(performAggregation, 400),
    [performAggregation]
  );

  useEffect(() => {
    debouncedAggregation();
    return () => debouncedAggregation.cancel();
  }, [debouncedAggregation]);

  return null;
};
