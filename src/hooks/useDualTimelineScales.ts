/**
 * DualTimeline scale transform hook
 * Provides scale computations for dual timeline visualization
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
 * Creates scale transforms for dual timeline visualization.
 * Provides xScale for pixel mapping and timeScale for temporal mapping.
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
      xDomain: [0, width] as [number, number],
      timeDomain: [new Date(startEpoch * 1000), new Date(endEpoch * 1000)],
    };
  }, [width, height, startEpoch, endEpoch]);
}

export type { ScaleLinear, ScaleTime };
