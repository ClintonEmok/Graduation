/**
 * Barrel export for the signal-sources module (Phase 84, Plan 84-01).
 *
 * The `dispatchWarpWeight` helper lives here (not in `contract.ts`) to
 * avoid a circular import with the mapper modules. The mappers import
 * their type contracts from `contract.ts`; this index file imports both
 * the contract and the mappers and composes them.
 */

import type { TimeBin } from '@/lib/binning/types';
import { binToCellIndex } from './contract';
import { burstinessWarpWeight } from './burstiness';
import { densityWarpWeight } from './density';
import { contextualWarpWeight } from './contextual';

export * from './contract';
export * from './burstiness';
export * from './density';
export * from './contextual';

/**
 * Single dispatch entry point used by `addSliceFromBin` and
 * `replaceSlicesFromBins` in `createSliceCoreSlice.ts`.
 *
 * Behaviour:
 *  - `burstiness` is delegated directly to the burstiness mapper
 *    (no baseline needed; the burstiness mapper closes over the
 *    pre-Phase-84 hardcoded `1.0` / `1.25` literals).
 *  - `density` and `contextual` short-circuit to `1.0` when the
 *    respective baseline arg is `null` (84-01 stub behaviour).
 *  - 84-02 will replace the first `null` with `getBaseline168Sync()`.
 *  - 84-03 will replace the second `null` with `getBaseline168WinsorizedSync()`.
 */
export function dispatchWarpWeight(
  source: 'burstiness' | 'density' | 'contextual',
  bin: TimeBin,
  baseline: import('./contract').Baseline168 | null,
  baselineWinsorized: import('./contract').Baseline168Winsorized | null,
): number {
  const { h, d } = binToCellIndex(bin);
  if (source === 'burstiness') {
    return burstinessWarpWeight(bin);
  }
  if (source === 'density') {
    return densityWarpWeight(bin, baseline, h, d);
  }
  return contextualWarpWeight(bin, baselineWinsorized, h, d);
}
