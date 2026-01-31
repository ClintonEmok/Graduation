import React, { useMemo } from 'react';
import { bin, max } from 'd3-array';
import { useDataStore, DataPoint } from '@/store/useDataStore';
import { useAdaptiveScale } from '@/hooks/useAdaptiveScale';
import { useTimeStore } from '@/store/useTimeStore';

interface DensityHistogramProps {
  width: number;
  height: number;
}

export const DensityHistogram: React.FC<DensityHistogramProps> = ({ width, height }) => {
  const data = useDataStore((state) => state.data);
  const { timeRange, currentTime } = useTimeStore();
  const scale = useAdaptiveScale(width);
  
  const bins = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const [minTime, maxTime] = timeRange;
    
    const binner = bin<DataPoint, number>()
      .value((d) => d.timestamp)
      .domain([minTime, maxTime])
      .thresholds(50); // Fixed number of bins for consistent resolution

    return binner(data);
  }, [data, timeRange]);

  const maxCount = useMemo(() => max(bins, (d) => d.length) || 1, [bins]);

  const currentTimeX = useMemo(() => scale(currentTime), [scale, currentTime]);

  if (!data || data.length === 0) return null;

  return (
    <svg width={width} height={height} className="overflow-visible pointer-events-none">
      <g>
        {bins.map((bin, i) => {
          if (bin.x0 === undefined || bin.x1 === undefined) return null;
          
          const x0 = scale(bin.x0);
          const x1 = scale(bin.x1);
          const barWidth = Math.max(0, x1 - x0 - 1); // -1 for visual gap
          const barHeight = (bin.length / maxCount) * height;
          
          return (
            <rect
              key={i}
              x={x0}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              fill="currentColor"
              className="text-primary/20"
            />
          );
        })}
      </g>
      <line
        x1={currentTimeX}
        y1={0}
        x2={currentTimeX}
        y2={height}
        stroke="currentColor"
        strokeWidth={2}
        className="text-primary"
      />
    </svg>
  );
};
