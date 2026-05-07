import type { AdaptiveBinningMode } from '@/types/adaptive';

export type AlgorithmId = 'uniform-time' | 'uniform-events' | 'adaptive' | 'stkde' | 'kde';

export interface AlgorithmOption {
  algorithmId: AlgorithmId;
  label: string;
  description: string;
  strategy: AdaptiveBinningMode | null;
  available: boolean;
}

export const ALGORITHM_OPTIONS: AlgorithmOption[] = [
  {
    algorithmId: 'uniform-time',
    label: 'Uniform Time',
    description: 'Equal-duration time bins for clock-aligned comparisons.',
    strategy: 'uniform-time',
    available: true,
  },
  {
    algorithmId: 'uniform-events',
    label: 'Uniform Events',
    description: 'Event-balanced bins for bursty and sparse periods.',
    strategy: 'uniform-events',
    available: true,
  },
  {
    algorithmId: 'adaptive',
    label: 'Adaptive (future strategy)',
    description: 'Reserved extension point while adaptive remains an interaction mode.',
    strategy: null,
    available: false,
  },
  {
    algorithmId: 'stkde',
    label: 'STKDE (future)',
    description: 'Reserved extension point for space-time kernel density variants.',
    strategy: null,
    available: false,
  },
  {
    algorithmId: 'kde',
    label: 'KDE (future)',
    description: 'Reserved extension point for kernel density strategy variants.',
    strategy: null,
    available: false,
  },
];

export const ACTIVE_ALGORITHM_OPTIONS = ALGORITHM_OPTIONS.filter((option) => option.available);

export const BINNING_STRATEGY_OPTIONS = ACTIVE_ALGORITHM_OPTIONS.filter(
  (option): option is AlgorithmOption & { strategy: AdaptiveBinningMode } => option.strategy !== null,
);
