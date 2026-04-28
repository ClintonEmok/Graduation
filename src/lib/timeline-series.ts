import { downsampleNumbers } from '@/lib/downsample';

export const TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS = 100_000;

export function sampleTimelinePoints(
  points: readonly number[],
  maxPoints: number = TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS
): number[] {
  return downsampleNumbers([...points], maxPoints);
}

export function selectTimelinePointsInRange(points: readonly number[], range: [number, number]): number[] {
  const start = Math.min(range[0], range[1]);
  const end = Math.max(range[0], range[1]);
  return points.filter((value) => value >= start && value <= end);
}
