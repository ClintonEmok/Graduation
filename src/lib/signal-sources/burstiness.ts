/**
 * Burstiness warp-weight mapper (Phase 84, Plan 84-01).
 *
 * Reproduces the pre-Phase-84 hardcoded values exactly:
 *  - Burst-taxonomy bin with `bin.warpWeight` set: use that value.
 *  - Burst-taxonomy bin without `bin.warpWeight`, neutral partition: 1.0.
 *  - Burst-taxonomy bin without `bin.warpWeight`, non-neutral: 1.25.
 *  - Non-burst bin: 1.0.
 *
 * The `hasBurstTaxonomy` predicate mirrors the helper at
 * `src/store/slice-domain/createSliceCoreSlice.ts:83-91` so the
 * dispatch helper does not need to import the slice store.
 */

import type { TimeBin } from '@/lib/binning/types';

export const hasBurstTaxonomyBin = (bin: TimeBin): boolean =>
  bin.burstClass !== undefined
  || bin.burstRuleVersion !== undefined
  || bin.burstScore !== undefined
  || bin.burstConfidence !== undefined
  || bin.burstProvenance !== undefined
  || bin.tieBreakReason !== undefined
  || bin.thresholdSource !== undefined
  || bin.neighborhoodSummary !== undefined;

export function burstinessWarpWeight(bin: TimeBin): number {
  if (hasBurstTaxonomyBin(bin)) {
    return bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25);
  }
  return 1;
}
