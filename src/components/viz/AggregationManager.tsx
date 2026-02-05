import React, { useEffect, useMemo, useCallback } from 'react';
import { useFilterStore } from '@/store/useFilterStore';
import { useAggregationStore, Bin } from '@/store/useAggregationStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import debounce from 'lodash.debounce';

export const AggregationManager: React.FC = () => {
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

    // Construct query params
    const params = new URLSearchParams({
      resX: gridResolution.x.toString(),
      resY: gridResolution.y.toString(),
      resZ: gridResolution.z.toString(),
    });

    if (selectedTypes.length > 0) {
      params.append('types', selectedTypes.join(','));
    }
    if (selectedDistricts.length > 0) {
      params.append('districts', selectedDistricts.join(','));
    }
    
    if (selectedTimeRange) {
      params.append('startTime', selectedTimeRange[0].toString());
      params.append('endTime', selectedTimeRange[1].toString());
    }
    
    // We pass timeScaleMode although the backend might not use it yet
    params.append('timeScaleMode', timeScaleMode);

    fetch(`/api/crime/bins?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Map colors on frontend based on dominantType name
        const bins: Bin[] = data.map((b: any) => {
          const typeName = b.dominantType;
          const color = colorMap[typeName.toUpperCase()] || colorMap[typeName] || '#FFFFFF';
          return {
            ...b,
            color
          };
        });
        
        setBins(bins);
        console.log(`[AggregationManager] API fetch success: ${bins.length} bins`);
      })
      .catch(err => {
        console.error('[AggregationManager] Fetch failed:', err);
      });

  }, [
    isEnabled, gridResolution, selectedTypes, selectedDistricts, 
    selectedTimeRange, timeScaleMode, colorMap, setBins
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
