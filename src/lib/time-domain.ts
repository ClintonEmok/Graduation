export type EpochUnit = 'seconds' | 'milliseconds';
export type TimeResolution = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

const EPOCH_MS_THRESHOLD = 1e11;

export const detectEpochUnit = (value: number): EpochUnit => {
  return Math.abs(value) >= EPOCH_MS_THRESHOLD ? 'milliseconds' : 'seconds';
};

export const toEpochSeconds = (value: number): number => {
  return detectEpochUnit(value) === 'milliseconds' ? value / 1000 : value;
};

export const epochSecondsToNormalized = (
  epochSeconds: number,
  minEpochSeconds: number,
  maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return ((epochSeconds - minEpochSeconds) / span) * 100;
};

export const normalizedToEpochSeconds = (
  normalized: number,
  minEpochSeconds: number,
  maxEpochSeconds: number
): number => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return minEpochSeconds + (normalized / 100) * span;
};

const RESOLUTION_SECONDS: Record<TimeResolution, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2592000,
  years: 31536000
};

export const resolutionToSeconds = (resolution: TimeResolution): number => {
  return RESOLUTION_SECONDS[resolution] ?? 1;
};

export const resolutionToNormalizedStep = (
  resolution: TimeResolution,
  minEpochSeconds: number | null,
  maxEpochSeconds: number | null,
  fallbackSpan = 100
): number => {
  if (minEpochSeconds === null || maxEpochSeconds === null) return 1;
  const span = maxEpochSeconds - minEpochSeconds || fallbackSpan;
  return (resolutionToSeconds(resolution) / span) * 100;
};
