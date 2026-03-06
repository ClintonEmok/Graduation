import { epochSecondsToNormalized, normalizedToEpochSeconds, toEpochSeconds } from './time-domain';

const DEFAULT_TOLERANCE_PERCENT = 0.005;

export const normalizeRange = (range: [number, number]): [number, number] =>
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

type TimelineFocusRangeOptions = {
  start: number;
  end: number;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  setTimeRange: (range: [number, number]) => void;
  setRange: (range: [number, number]) => void;
  setBrushRange: (range: [number, number]) => void;
  setTime: (time: number) => void;
};

export function focusTimelineRange({
  start,
  end,
  minTimestampSec,
  maxTimestampSec,
  setTimeRange,
  setRange,
  setBrushRange,
  setTime,
}: TimelineFocusRangeOptions): void {
  const [rangeStart, rangeEnd] = normalizeRange([start, end]);
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) {
    return;
  }

  if (
    minTimestampSec !== null &&
    maxTimestampSec !== null &&
    Number.isFinite(minTimestampSec) &&
    Number.isFinite(maxTimestampSec) &&
    maxTimestampSec > minTimestampSec
  ) {
    const looksNormalized = rangeStart >= 0 && rangeEnd <= 100;
    const startEpoch = looksNormalized
      ? normalizedToEpochSeconds(rangeStart, minTimestampSec, maxTimestampSec)
      : toEpochSeconds(rangeStart);
    const endEpoch = looksNormalized
      ? normalizedToEpochSeconds(rangeEnd, minTimestampSec, maxTimestampSec)
      : toEpochSeconds(rangeEnd);
    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
      return;
    }

    setTimeRange([startEpoch, endEpoch]);

    const normalizedStart = epochSecondsToNormalized(startEpoch, minTimestampSec, maxTimestampSec);
    const normalizedEnd = epochSecondsToNormalized(endEpoch, minTimestampSec, maxTimestampSec);
    if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
      return;
    }
    const normalizedRange: [number, number] = normalizeRange([normalizedStart, normalizedEnd]);

    setRange(normalizedRange);
    setBrushRange(normalizedRange);
    setTime((normalizedRange[0] + normalizedRange[1]) / 2);
    return;
  }

  const fallbackRange: [number, number] = [rangeStart, rangeEnd];
  if (!Number.isFinite(fallbackRange[0]) || !Number.isFinite(fallbackRange[1])) {
    return;
  }
  setTimeRange(fallbackRange);
  setRange(fallbackRange);
  setBrushRange(fallbackRange);
  setTime((fallbackRange[0] + fallbackRange[1]) / 2);
}
