/**
 * DualTimeline scale transform hook
 * Extracts scale computation logic from DualTimeline.tsx
 */
import { useMemo } from 'react';
import { scaleLinear, scaleTime, type ScaleLinear, type ScaleTime } from 'd3-scale';

export interface TimelineScales {
  xScale: ScaleLinear<number, number>;
  timeScale: ScaleTime<number, number>;
  xDomain: [number, number];
  timeDomain: [Date, Date];
}

export interface UseDualTimelineScalesOptions {
  width: number;
  height: number;
  startEpoch: number;
  endEpoch: number;
  dataLength?: number;
}

/**
 * Creates linear and time scales for the dual timeline visualization.
 * Used by DualTimeline.tsx for scale computations.
 */
export function useDualTimelineScales({
  width,
  height,
  startEpoch,
  endEpoch,
}: UseDualTimelineScalesOptions): TimelineScales {
  return useMemo(() => {
    const xScale = scaleLinear()
      .domain([0, width])
      .range([0, width]);

    const timeScale = scaleTime()
      .domain([new Date(startEpoch * 1000), new Date(endEpoch * 1000)])
      .range([0, width]);

    return {
      xScale,
      timeScale,
      xDomain: [0, width],
      timeDomain: [new Date(startEpoch * 1000), new Date(endEpoch * 1000)],
    };
  }, [width, height, startEpoch, endEpoch]);
}
