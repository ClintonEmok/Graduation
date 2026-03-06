import { epochSecondsToNormalized } from '@/lib/time-domain';

export const clampToRange = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value === Number.POSITIVE_INFINITY) return max;
  if (value === Number.NEGATIVE_INFINITY) return min;
  return Math.min(Math.max(value, min), max);
};

export const normalizeEpochRange = (
  startSec: number,
  endSec: number
): { startSec: number; endSec: number } => {
  if (startSec <= endSec) {
    return { startSec, endSec };
  }
  return { startSec: endSec, endSec: startSec };
};

export const computeRangeUpdate = (
  startSec: number,
  endSec: number,
  domainStartSec: number,
  domainEndSec: number
): {
  safeStartSec: number;
  safeEndSec: number;
  normalizedRange: [number, number];
} => {
  const safeStartSec = clampToRange(startSec, domainStartSec, domainEndSec);
  const safeEndSec = clampToRange(endSec, domainStartSec, domainEndSec);
  const normalizedStart = clampToRange(
    epochSecondsToNormalized(safeStartSec, domainStartSec, domainEndSec),
    0,
    100
  );
  const normalizedEnd = clampToRange(
    epochSecondsToNormalized(safeEndSec, domainStartSec, domainEndSec),
    0,
    100
  );
  const normalizedRange: [number, number] =
    normalizedStart <= normalizedEnd
      ? [normalizedStart, normalizedEnd]
      : [normalizedEnd, normalizedStart];

  return { safeStartSec, safeEndSec, normalizedRange };
};

export const brushSelectionToEpochRange = (
  selection: [number, number],
  invert: (value: number) => Date
): { startSec: number; endSec: number } => {
  const [x0, x1] = selection;
  return {
    startSec: invert(x0).getTime() / 1000,
    endSec: invert(x1).getTime() / 1000,
  };
};

export const zoomDomainToEpochRange = (
  domain: [Date, Date]
): { startSec: number; endSec: number } => ({
  startSec: domain[0].getTime() / 1000,
  endSec: domain[1].getTime() / 1000,
});

export const buildZoomTransformFromBrush = (
  x0: number,
  x1: number,
  overviewWidth: number
): { scale: number; translateX: number } => {
  const span = Math.max(1, x1 - x0);
  return {
    scale: overviewWidth / span,
    translateX: -x0,
  };
};

export const resolveSelectionX = (
  timestampSec: number | null | undefined,
  toX: (date: Date) => number,
  width: number
): number | null => {
  if (timestampSec === null || timestampSec === undefined || !Number.isFinite(timestampSec)) {
    return null;
  }
  const x = toX(new Date(timestampSec * 1000));
  if (!Number.isFinite(x)) {
    return null;
  }
  if (x < 0 || x > width) {
    return null;
  }
  return x;
};
