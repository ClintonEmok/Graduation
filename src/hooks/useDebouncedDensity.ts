import { useCallback, useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';

export interface UseDebouncedDensityOptions {
  delay?: number;
}

const DEFAULT_DELAY_MS = 400;

export function useDebouncedDensity(options: UseDebouncedDensityOptions = {}) {
  const delay = options.delay ?? DEFAULT_DELAY_MS;
  const computeMaps = useAdaptiveStore((state) => state.computeMaps);
  const isComputing = useAdaptiveStore((state) => state.isComputing);
  const columns = useDataStore((state) => state.columns);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);

  const computeMapsRef = useRef(computeMaps);
  const columnsRef = useRef(columns);

  computeMapsRef.current = computeMaps;
  columnsRef.current = columns;

  const filterSignature = useMemo(() => {
    const timeRange = selectedTimeRange ? `${selectedTimeRange[0]}:${selectedTimeRange[1]}` : 'none';
    const spatial = selectedSpatialBounds
      ? `${selectedSpatialBounds.minX}:${selectedSpatialBounds.maxX}:${selectedSpatialBounds.minZ}:${selectedSpatialBounds.maxZ}:${selectedSpatialBounds.minLat}:${selectedSpatialBounds.maxLat}:${selectedSpatialBounds.minLon}:${selectedSpatialBounds.maxLon}`
      : 'none';

    return [selectedTypes.join(','), selectedDistricts.join(','), timeRange, spatial].join('|');
  }, [selectedDistricts, selectedSpatialBounds, selectedTimeRange, selectedTypes]);

  const runCompute = useCallback(() => {
    const activeColumns = columnsRef.current;
    if (!activeColumns || activeColumns.length === 0) return;

    computeMapsRef.current(activeColumns.timestamp, [0, 100]);
  }, []);

  const debouncedComputeRef = useRef(debounce(runCompute, delay));

  useEffect(() => {
    const nextDebounced = debounce(runCompute, delay);
    const previousDebounced = debouncedComputeRef.current;
    debouncedComputeRef.current = nextDebounced;
    previousDebounced.cancel();

    return () => {
      nextDebounced.cancel();
    };
  }, [delay, runCompute]);

  const triggerUpdate = useCallback(() => {
    debouncedComputeRef.current();
  }, []);

  useEffect(() => {
    triggerUpdate();
  }, [columns, filterSignature, triggerUpdate]);

  useEffect(() => {
    return () => {
      debouncedComputeRef.current.cancel();
    };
  }, []);

  return { isComputing, triggerUpdate };
}
