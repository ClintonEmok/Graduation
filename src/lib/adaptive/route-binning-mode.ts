import type { AdaptiveBinningMode } from '@/types/adaptive';

const isAdaptiveBinningMode = (value: string | null | undefined): value is AdaptiveBinningMode => {
  return value === 'uniform-time' || value === 'uniform-events';
};

export const resolveRouteBinningMode = (
  pathname: string | null | undefined,
  explicitMode?: string | null
): AdaptiveBinningMode => {
  if (isAdaptiveBinningMode(explicitMode)) {
    return explicitMode;
  }

  if (pathname?.startsWith('/timeslicing-algos')) {
    return 'uniform-events';
  }

  if (pathname?.startsWith('/timeslicing')) {
    return 'uniform-time';
  }

  return 'uniform-time';
};
