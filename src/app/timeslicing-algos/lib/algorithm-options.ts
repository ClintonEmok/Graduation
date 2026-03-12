import type { TimeslicingAlgosModeIntent } from './mode-intent';

export type AlgorithmId = 'uniform-time' | 'uniform-events' | 'adaptive' | 'stkde' | 'kde';

export interface AlgorithmOption {
  algorithmId: AlgorithmId;
  label: string;
  description: string;
  modeIntent: TimeslicingAlgosModeIntent | null;
  available: boolean;
}

export const ALGORITHM_OPTIONS: AlgorithmOption[] = [
  {
    algorithmId: 'uniform-time',
    label: 'Uniform Time',
    description: 'Equal-duration time bins for clock-aligned comparisons.',
    modeIntent: 'uniform-time',
    available: true,
  },
  {
    algorithmId: 'uniform-events',
    label: 'Uniform Events',
    description: 'Event-balanced bins for bursty and sparse periods.',
    modeIntent: 'uniform-events',
    available: true,
  },
  {
    algorithmId: 'adaptive',
    label: 'Adaptive Intent',
    description: 'Route-intent mode that resolves through route defaults.',
    modeIntent: 'adaptive',
    available: true,
  },
  {
    algorithmId: 'stkde',
    label: 'STKDE (future)',
    description: 'Reserved extension point for space-time kernel density variants.',
    modeIntent: null,
    available: false,
  },
  {
    algorithmId: 'kde',
    label: 'KDE (future)',
    description: 'Reserved extension point for kernel density strategy variants.',
    modeIntent: null,
    available: false,
  },
];

export const ACTIVE_ALGORITHM_OPTIONS = ALGORITHM_OPTIONS.filter((option) => option.available && option.modeIntent !== null);
