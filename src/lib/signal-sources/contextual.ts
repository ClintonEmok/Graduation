/**
 * Contextual warp-weight mapper (Phase 84, Plan 84-01).
 *
 * Plan 84-01 ships only the stub. The real winsorized Pearson residual
 * `warpWeight = clamp(0.2 + 0.4 * clamp(z, 0, 5), 0.2, 3.0)` (with
 * `z = (O - muW) / sigW` against the 168-cell winsorized baseline)
 * lands in Plan 84-03 alongside the `d3-array.quantile` percentile
 * implementation and the Python sensitivity check. For 84-01, the stub
 * returns `1.0` (neutral) whenever the winsorized baseline is not loaded
 * so the dispatch hot path remains a no-op for contextual mode until
 * 84-03.
 *
 * IMPORTANT: This file is intentionally the STANDARD (non-winsorized)
 * Pearson residual stub. The winsorized form is a Phase 84 enhancement
 * (see 84-CONTEXT.md §2 / 84-RESEARCH.md Q3) and is added in 84-03 with
 * a pre-flight sensitivity check.
 */

import type { TimeBin } from '@/lib/binning/types';
import type { Baseline168Winsorized } from './contract';

export function contextualWarpWeight(
  bin: TimeBin,
  baselineWinsorized: Baseline168Winsorized | null,
  h: number,
  d: number,
): number {
  if (!baselineWinsorized) {
    return 1;
  }
  // TODO(84-03): replace stub with winsorized z formula
  // z = (O - muW) / sigW where muW and sigW are the 5/95 winsorized
  // per-cell weekly rate distribution stats. The warpWeight is the
  // 0.2x..3.0x remap of z described in 84-CONTEXT.md §2.
  void bin;
  void h;
  void d;
  return 1;
}
