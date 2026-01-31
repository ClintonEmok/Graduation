import { useMemo } from 'react';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import { useDataStore } from '@/store/useDataStore';
import { useTimeStore } from '@/store/useTimeStore';
import { getAdaptiveScaleConfig } from '@/lib/adaptive-scale';

export function useAdaptiveScale(width: number): ScaleLinear<number, number> {
  const data = useDataStore((state) => state.data);
  const { timeRange, timeScaleMode } = useTimeStore();

  const scale = useMemo(() => {
    // Default linear scale
    if (timeScaleMode === 'linear' || !data || data.length === 0) {
      return scaleLinear()
        .domain(timeRange)
        .range([0, width]);
    }

    // Adaptive scale
    const { domain, range } = getAdaptiveScaleConfig(
      data,
      timeRange,
      [0, width] // Map time to width (0..width)
    );

    return scaleLinear()
      .domain(domain)
      .range(range);
  }, [data, timeRange, timeScaleMode, width]);

  return scale;
}
