export type TimeRangeTuple = [number, number];

export type TimeRangeLike =
  | TimeRangeTuple
  | { startEpoch?: number; endEpoch?: number; start?: number; end?: number }
  | null
  | undefined;

export interface NormalizedTimeRange {
  start: number;
  end: number;
}

export function normalizeTimeRange(range: TimeRangeLike): TimeRangeTuple | null {
  if (!range) return null;

  if (Array.isArray(range)) {
    const [start, end] = range;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return [Math.min(start, end), Math.max(start, end)];
  }

  const start = typeof range.startEpoch === 'number' ? range.startEpoch : range.start;
  const end = typeof range.endEpoch === 'number' ? range.endEpoch : range.end;

  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  return [Math.min(start, end), Math.max(start, end)];
}

export function normalizeTimeRangeBounds(range: TimeRangeLike): NormalizedTimeRange | null {
  const normalized = normalizeTimeRange(range);
  if (!normalized) return null;

  return {
    start: normalized[0],
    end: normalized[1],
  };
}

export function timeRangeOverlapsDomain(range: TimeRangeLike, domainStart: number, domainEnd: number): boolean {
  const normalized = normalizeTimeRange(range);
  if (!normalized) return false;

  const [start, end] = normalized;
  return end >= domainStart && start <= domainEnd;
}

export function clampTimeRangeToDomain(
  range: TimeRangeLike,
  domainStart: number,
  domainEnd: number
): TimeRangeTuple | null {
  const normalized = normalizeTimeRange(range);
  if (!normalized) return null;

  const start = Math.max(normalized[0], domainStart);
  const end = Math.min(normalized[1], domainEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return [start, end];
}
