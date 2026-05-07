import type { AdaptiveBinningMode } from '@/types/adaptive';
import { resolveRouteBinningMode } from '@/lib/adaptive/route-binning-mode';

export type TimeslicingAlgosModeIntent = AdaptiveBinningMode | 'adaptive';

const DEFAULT_MODE_INTENT: TimeslicingAlgosModeIntent = 'uniform-events';

const isTimeslicingAlgosModeIntent = (
  value: string | null | undefined,
): value is TimeslicingAlgosModeIntent => {
  return value === 'uniform-time' || value === 'uniform-events' || value === 'adaptive';
};

export const parseTimeslicingAlgosModeIntent = (
  value: string | null | undefined,
): TimeslicingAlgosModeIntent => {
  return isTimeslicingAlgosModeIntent(value) ? value : DEFAULT_MODE_INTENT;
};

export const resolveTimeslicingAlgosEffectiveMode = (
  pathname: string | null | undefined,
  modeIntent: TimeslicingAlgosModeIntent,
): AdaptiveBinningMode => {
  const explicitOverride = modeIntent === 'adaptive' ? null : modeIntent;
  return resolveRouteBinningMode(pathname, explicitOverride);
};

export const resolveTimeslicingAlgosTimeScaleMode = (
  modeIntent: TimeslicingAlgosModeIntent,
): 'linear' | 'adaptive' => {
  return modeIntent === 'adaptive' ? 'adaptive' : 'linear';
};
