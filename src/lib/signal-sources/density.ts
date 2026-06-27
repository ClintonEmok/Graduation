/**
 * Density warp-weight mapper (Phase 84, Plan 84-02).
 *
 * Maps a TimeBin's observed count against the 168-cell contextual
 * baseline's expected count for the bin's (h, d) cell. The ratio is
 * remapped to a [1.0, 2.5] warpWeight range:
 *
 *   warpWeight = clampComparableWarpWeight(
 *     1 + clamp01((O - E) / Math.max(E, 1)) * 1.5,
 *     0.25,
 *     4,
 *   )
 *
 * Semantics:
 *  - O = E  → 0 deviation  → warpWeight = 1.0 (neutral)
 *  - O < E  → negative deviation (clamped to 0) → 1.0 (we don't
 *    compress sub-baseline bins; only expand above-baseline bins)
 *  - O = 2E → 1.0 normalised deviation → 1 + 1.5 = 2.5 (max)
 *  - O > 2E → clamped to 1.0 → 2.5 (max)
 *  - null baseline, missing cell, or zero E → 1.0 (defensive)
 *
 * The `bin` param is typed as `{ count: number }` to keep the mapper
 * independent of the full `TimeBin` type — only `bin.count` is read.
 * The `cellSeconds` constant `3600 * totalWeeks` matches
 * `metrics/contextual.py:98 cell_seconds = SECONDS_PER_HOUR * total_weeks`
 * (the 168-cell baseline is a per-hour-of-week rate table, so each
 * cell covers `3600 * totalWeeks` seconds).
 */

import { clampComparableWarpWeight } from '@/lib/binning/warp-scaling';
import type { Baseline168 } from './contract';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Compute the density-derived warpWeight for a single bin.
 *
 * @param bin      The bin; only `bin.count` is read.
 * @param baseline The 168-cell baseline (null until the loader runs).
 * @param h        Hour-of-day (0..23) for the bin's avg timestamp.
 * @param d        Day-of-week (0=Sun..6=Sat) for the bin's avg timestamp.
 * @returns        A warpWeight in the [1.0, 2.5] range (or 1.0 fallback).
 */
export function densityWarpWeight(
  bin: { count: number },
  baseline: Baseline168 | null,
  h: number,
  d: number,
): number {
  if (!baseline) return 1;
  const cell = baseline.cells[h * 7 + d];
  if (!cell) return 1;

  // Expected event count for this cell: conditional rate (events/sec)
  // integrated over the total seconds the cell spans. Each cell covers
  // one hour of every week in the dataset, so cellSeconds = 3600 * totalWeeks.
  const cellSeconds = 3600 * baseline.header.totalWeeks;
  const E = cell.mu * cellSeconds;
  if (!Number.isFinite(E) || E <= 0) return 1;

  const O = bin.count;
  const deviation = (O - E) / Math.max(E, 1);
  const positive = clamp01(deviation);
  return clampComparableWarpWeight(1 + positive * 1.5, 0.25, 4);
}
