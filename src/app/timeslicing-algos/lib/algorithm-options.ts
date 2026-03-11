import type { AdaptiveBinningMode } from '@/store/useAdaptiveStore';

export type AlgorithmId = 'uniform-time' | 'uniform-events' | 'stkde' | 'kde';

export interface AlgorithmOption {
  algorithmId: AlgorithmId;
  label: string;
  description: string;
  binningMode: AdaptiveBinningMode | null;
  available: boolean;
}

export const ALGORITHM_OPTIONS: AlgorithmOption[] = [
  {
    algorithmId: 'uniform-time',
    label: 'Uniform Time',
    description: 'Equal-duration time bins for clock-aligned comparisons.',
    binningMode: 'uniform-time',
    available: true,
  },
  {
    algorithmId: 'uniform-events',
    label: 'Uniform Events',
    description: 'Event-balanced bins for bursty and sparse periods.',
    binningMode: 'uniform-events',
    available: true,
  },
  {
    algorithmId: 'stkde',
    label: 'STKDE (future)',
    description: 'Reserved extension point for space-time kernel density variants.',
    binningMode: null,
    available: false,
  },
  {
    algorithmId: 'kde',
    label: 'KDE (future)',
    description: 'Reserved extension point for kernel density strategy variants.',
    binningMode: null,
    available: false,
  },
];

export const ACTIVE_ALGORITHM_OPTIONS = ALGORITHM_OPTIONS.filter((option) => option.available && option.binningMode !== null);
