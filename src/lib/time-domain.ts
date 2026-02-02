export type EpochUnit = 'seconds' | 'milliseconds';

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
