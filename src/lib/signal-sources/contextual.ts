/**
 * Contextual warp-weight mapper (Phase 84, Plan 84-03).
 *
 * Port of `metrics/contextual.py:compute_contextual_z_series` to
 * TypeScript, using the WINSORIZED Pearson residual variant. The
 * sensitivity check at
 * `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/metrics/sensitivity_winsorized.py`
 * confirmed at 1d that the winsorized z CV is within 1.013x of the
 * standard z CV (well within the 30% threshold) — winsorization is
 * the production choice per 84-CONTEXT.md §2.
 *
 * The 168-cell SHORTCUT is used (per 84-RESEARCH.md Q3 #3): the
 * per-cell mu and sigma are winsorized at the [5th, 95th] percentile
 * of the 168-cell distribution, not the 1,305-week per-cell
 * distribution (the latter is not stored in the baseline). The
 * 1,305-week path is documented as deferred in thesis note Section 5.
 *
 * z formula (matches `metrics/contextual.py:180`):
 *   z = (count - muW * windowSec) / max(sigW * sqrt(windowSec), EPSILON)
 *   z_clamped = clamp(z, -2, 5)
 *   warpWeight = WARP_MIN + (z_clamped - Z_CLAMP_MIN) / (Z_CLAMP_MAX - Z_CLAMP_MIN)
 *                * (WARP_MAX - WARP_MIN)
 *
 * z = 0 (observed matches baseline) → warpWeight = 1.0 (neutral)
 * z = 5 (max burst)                  → warpWeight = 3.0
 * z = -2 (max compression)           → warpWeight = 0.2
 */

import type { Baseline168, Baseline168Winsorized } from './contract';
import { winsorize } from './winsorize';

const EPSILON = 1e-9;
const Z_CLAMP_MIN = -2;
const Z_CLAMP_MAX = 5;
const WARP_MIN = 0.2;
const WARP_MAX = 3.0;

/**
 * Compute the winsorized 168-cell baseline. Per CONTEXT L23-31, this
 * is the 168-cell SHORTCUT — winsorize the 168 per-cell means (and
 * sigmas) at the 5/95 quantiles, not the 1,305-week per-cell
 * distribution. The 1,305-week path is deferred (documented in the
 * thesis note Section 5).
 */
export function computeWinsorizedBaseline(
  baseline: Baseline168,
): Baseline168Winsorized {
  const means = baseline.cells.map((c) => c.mu);
  const sigs = baseline.cells.map((c) => c.sig);
  const meansW = winsorize(means, 0.05, 0.95);
  const sigsW = winsorize(sigs, 0.05, 0.95);
  return {
    header: baseline.header,
    cells: baseline.cells.map((c, i) => ({
      h: c.h,
      d: c.d,
      c: c.c,
      muW: meansW[i] ?? c.mu,
      sigW: sigsW[i] ?? c.sig,
    })),
  };
}

/**
 * Contextual mapper — winsorized Pearson residual against the
 * 168-cell baseline.
 *
 * @param bin                   The bin; only `bin.count`, `bin.startTime`,
 *                             `bin.endTime` are read.
 * @param baselineWinsorized    The 168-cell winsorized baseline (null
 *                             until the loader runs).
 * @param h                     Hour-of-day (0..23) for the bin's avg
 *                             timestamp.
 * @param d                     Day-of-week (0=Sun..6=Sat) for the bin's
 *                             avg timestamp.
 * @returns                     A warpWeight in [0.2, 3.0] (or 1.0
 *                             fallback for null baseline / missing cell
 *                             / zero-window edge case).
 */
export function contextualWarpWeight(
  bin: { count: number; startTime: number; endTime: number },
  baselineWinsorized: Baseline168Winsorized | null,
  h: number,
  d: number,
): number {
  if (!baselineWinsorized) return 1;
  const cell = baselineWinsorized.cells[h * 7 + d];
  if (!cell) return 1;
  const windowSec = (bin.endTime - bin.startTime) / 1000; // bin times are in ms
  if (!Number.isFinite(windowSec) || windowSec <= 0) return 1;
  const muW = cell.muW;
  const sigW = cell.sigW;
  const expected = muW * windowSec;
  const sigma = sigW * Math.sqrt(windowSec);
  const z = (bin.count - expected) / Math.max(sigma, EPSILON);
  const zClamped = Math.max(Z_CLAMP_MIN, Math.min(Z_CLAMP_MAX, z));
  const t = (zClamped - Z_CLAMP_MIN) / (Z_CLAMP_MAX - Z_CLAMP_MIN); // [0, 1]
  return WARP_MIN + t * (WARP_MAX - WARP_MIN);
}
