/**
 * Density warp-weight mapper (Phase 84, Plan 84-01).
 *
 * Plan 84-01 ships only the stub. The real formula
 * `clampComparableWarpWeight(1 + clamp01((O - E) / Math.max(E, 1)) * 1.5, 0.25, 4)`
 * (O = `bin.count`, E = `baseline.cells[h*7 + d].mu * (bin.endTime - bin.startTime)/1000`)
 * lands in Plan 84-02 alongside the `/public/baselines/baseline_168.json`
 * static file and the DuckDB fallback API route. For 84-01, the stub
 * returns `1.0` (neutral) whenever the baseline is not loaded so the
 * dispatch hot path remains a no-op for density mode until 84-02.
 */

import type { TimeBin } from '@/lib/binning/types';
import type { Baseline168 } from './contract';

export function densityWarpWeight(
  bin: TimeBin,
  baseline: Baseline168 | null,
  h: number,
  d: number,
): number {
  if (!baseline) {
    return 1;
  }
  // TODO(84-02): replace stub with real formula using
  // baseline.cells[h*7 + d].mu as the conditional rate.
  // The expected E for this bin is
  //   baseline.cells[h*7 + d].mu * ((bin.endTime - bin.startTime) / 1000)
  // and the O is `bin.count`. The full mapper is added in Plan 84-02.
  // Reference values for the parity test in 84-02 are 0.25..4 (clamped).
  // The arguments h and d are kept in the signature to keep the contract
  // stable for the 84-02 implementation.
  void bin;
  void h;
  void d;
  return 1;
}
