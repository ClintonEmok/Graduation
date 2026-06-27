/**
 * Winsorize helper (Phase 84, Plan 84-03).
 *
 * Clips `values` to the [lowerPct, upperPct] percentile range. Values
 * below the lower percentile are clamped up; values above the upper
 * percentile are clamped down. Used by the contextual z mapper to
 * compute the 5/95-percentile-winsorized 168-cell baseline (the 168-cell
 * shortcut per 84-RESEARCH.md Q3 #3 — the 1,305-week per-cell
 * distribution is not stored; winsorization applies to the 168
 * per-cell means / sigmas).
 *
 * Cross-language parity: `d3.quantile` uses type-7 (R-7) linear
 * interpolation, which is mathematically equivalent to
 * `numpy.percentile(method='linear')` for N >= 5. The 168-cell baseline
 * has 168 floats so the parity is exact within 1e-6 (verified by
 * `winsorize.test.ts`).
 *
 * The sensitivity check at
 * `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/sensitivity_winsorized.py`
 * confirmed at 1d that the winsorized z CV is within 1.013x of the
 * standard z CV (well within the 30% threshold) — the winsorized form
 * is the production choice per 84-03 Task 1's PASS verdict.
 */

import { quantile } from 'd3-array';

export function winsorize(
  values: number[],
  lowerPct: number,
  upperPct: number,
): number[] {
  if (values.length === 0) return [];
  const lo = quantile(values, lowerPct) ?? -Infinity;
  const hi = quantile(values, upperPct) ?? Infinity;
  return values.map((v) => Math.min(hi, Math.max(lo, v)));
}
