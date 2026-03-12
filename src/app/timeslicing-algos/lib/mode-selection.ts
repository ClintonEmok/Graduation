import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';

export type TimeslicingAlgosTimeScale = 'linear' | 'adaptive';

export interface TimeslicingAlgosSelection {
  strategy: AdaptiveBinningMode;
  timescale: TimeslicingAlgosTimeScale;
}

type SearchParamsInput = URLSearchParams | string | null | undefined | { toString(): string };

const DEFAULT_SELECTION: TimeslicingAlgosSelection = {
  strategy: 'uniform-events',
  timescale: 'linear',
};

const isAdaptiveBinningMode = (value: string | null | undefined): value is AdaptiveBinningMode => {
  return value === 'uniform-time' || value === 'uniform-events';
};

const isTimeScaleMode = (value: string | null | undefined): value is TimeslicingAlgosTimeScale => {
  return value === 'linear' || value === 'adaptive';
};

const toSearchParams = (input: SearchParamsInput): URLSearchParams => {
  if (input instanceof URLSearchParams) {
    return input;
  }

  if (typeof input === 'string') {
    return new URLSearchParams(input);
  }

  if (input && typeof input.toString === 'function') {
    return new URLSearchParams(input.toString());
  }

  return new URLSearchParams();
};

export const parseTimeslicingAlgosStrategy = (
  value: string | null | undefined,
): AdaptiveBinningMode | null => {
  return isAdaptiveBinningMode(value) ? value : null;
};

export const parseTimeslicingAlgosTimeScale = (
  value: string | null | undefined,
): TimeslicingAlgosTimeScale | null => {
  return isTimeScaleMode(value) ? value : null;
};

export const parseLegacyTimeslicingAlgosMode = (
  value: string | null | undefined,
): TimeslicingAlgosSelection | null => {
  if (value === 'uniform-time') {
    return { strategy: 'uniform-time', timescale: 'linear' };
  }

  if (value === 'uniform-events') {
    return { strategy: 'uniform-events', timescale: 'linear' };
  }

  if (value === 'adaptive') {
    return { strategy: 'uniform-events', timescale: 'adaptive' };
  }

  return null;
};

export const resolveTimeslicingAlgosSelection = (
  searchParamsInput: SearchParamsInput,
): TimeslicingAlgosSelection => {
  const searchParams = toSearchParams(searchParamsInput);
  const strategy = parseTimeslicingAlgosStrategy(searchParams.get('strategy'));
  const timescale = parseTimeslicingAlgosTimeScale(searchParams.get('timescale'));
  const legacySelection = parseLegacyTimeslicingAlgosMode(searchParams.get('mode'));

  return {
    strategy: strategy ?? legacySelection?.strategy ?? DEFAULT_SELECTION.strategy,
    timescale: timescale ?? legacySelection?.timescale ?? DEFAULT_SELECTION.timescale,
  };
};

export const serializeTimeslicingAlgosSelection = (
  searchParamsInput: SearchParamsInput,
  selection: TimeslicingAlgosSelection,
): URLSearchParams => {
  const nextParams = new URLSearchParams(toSearchParams(searchParamsInput).toString());
  nextParams.set('strategy', selection.strategy);
  nextParams.set('timescale', selection.timescale);
  nextParams.delete('mode');
  return nextParams;
};
