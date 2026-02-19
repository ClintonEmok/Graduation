const DEFAULT_TOLERANCE_PERCENT = 0.005;

const normalizeRange = (range: [number, number]): [number, number] =>
  range[0] <= range[1] ? range : [range[1], range[0]];

export function withinTolerance(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= Math.abs(tolerance);
}

export function calculateRangeTolerance(
  range: [number, number],
  percent: number = DEFAULT_TOLERANCE_PERCENT
): number {
  const [start, end] = normalizeRange(range);
  return Math.abs(end - start) * Math.abs(percent);
}

export function rangesMatch(
  range1: [number, number],
  range2: [number, number],
  tolerance?: number
): boolean {
  const [start1, end1] = normalizeRange(range1);
  const [start2, end2] = normalizeRange(range2);

  const resolvedTolerance =
    tolerance ??
    (calculateRangeTolerance([start1, end1]) + calculateRangeTolerance([start2, end2])) / 2;

  return (
    withinTolerance(start1, start2, resolvedTolerance) &&
    withinTolerance(end1, end2, resolvedTolerance)
  );
}

export const slicesOverlapWithinTolerance = rangesMatch;
