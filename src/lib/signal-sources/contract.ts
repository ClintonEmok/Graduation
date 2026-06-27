/**
 * Adaptive signal source contract (Phase 84, Plan 84-01).
 *
 * Defines the three runtime-mutable signal sources that drive `warpWeight`
 * computation for newly created TimeSlices. Burstiness is the default
 * (reproduces pre-Phase-84 behavior exactly); density and contextual are
 * explicit fallback / comparison modes. Their full implementations land in
 * Plan 84-02 and Plan 84-03 respectively — the 84-01 stubs return `1.0`
 * when no baseline is loaded.
 *
 * The dispatch helper lives in `./index.ts` to avoid a circular import
 * with the mapper modules. The mapper modules import their types from
 * this file; the index file imports both the contract and the mappers
 * and composes them.
 *
 * The `+4` day-of-week offset in `binToCellIndex` matches the Python
 * `metrics/contextual.py:54` `EPOCH_DOW_OFFSET = 4` constant (epoch
 * `1970-01-01` is a Thursday, which both Python's `datetime.weekday()`
 * and JavaScript's `Date.getUTCDay()` return as 3; to make weekday 0
 * land on Sunday we add 4 to the epoch-derived weekday).
 */

import type { TimeBin } from '@/lib/binning/types';

export type AdaptiveSignalSource = 'burstiness' | 'density' | 'contextual';

/**
 * Per-cell, non-winsorized baseline shape produced by Plan 84-02's
 * parquet-to-JSON export script. Mirrors the six fields the Python
 * pipeline writes to `baselines/baseline_168.parquet`.
 */
export interface Baseline168 {
  header: {
    nEvents: number;
    tsMin: number;
    tsMax: number;
    totalWeeks: number;
    fingerprint: string;
  };
  cells: Array<{
    h: number;
    d: number;
    c: number;
    mu: number;
    sig: number;
  }>;
}

/**
 * Per-cell, winsorized baseline shape produced by Plan 84-03. Cells are
 * keyed by `(h, d)` exactly like `Baseline168` so the contextual mapper
 * can index in the same way; `muW` and `sigW` are the 5/95-percentile-
 * clipped mean / sigma used in the winsorized Pearson residual.
 */
export interface Baseline168Winsorized {
  header: {
    nEvents: number;
    tsMin: number;
    tsMax: number;
    totalWeeks: number;
    fingerprint: string;
  };
  cells: Array<{
    h: number;
    d: number;
    c: number;
    muW: number;
    sigW: number;
  }>;
}

export interface SignalSourceMappers {
  burstiness: (bin: TimeBin) => number;
  density: (
    bin: TimeBin,
    baseline: Baseline168 | null,
    h: number,
    d: number,
  ) => number;
  contextual: (
    bin: TimeBin,
    baselineWinsorized: Baseline168Winsorized | null,
    h: number,
    d: number,
  ) => number;
}

export const SIGNAL_SOURCE_OPTIONS: Array<{
  value: AdaptiveSignalSource;
  label: string;
  description: string;
}> = [
  {
    value: 'burstiness',
    label: 'Burstiness',
    description: 'Goh-Barabasi inter-event B (current default)',
  },
  {
    value: 'density',
    label: 'Density',
    description: 'Observed/expected count ratio vs 168-cell baseline',
  },
  {
    value: 'contextual',
    label: 'Contextual',
    description: 'Winsorized Pearson residual against 168-cell baseline',
  },
];

/**
 * Convert `bin.avgTimestamp` (epoch ms) into the `(hour-of-day, day-of-week)`
 * pair that indexes into the 168-cell baseline. The `+4` offset matches
 * Python `metrics/contextual.py:54` `EPOCH_DOW_OFFSET = 4`.
 */
export const binToCellIndex = (bin: TimeBin): { h: number; d: number } => {
  const epochSec = Math.floor(bin.avgTimestamp / 1000);
  const h = Math.floor(epochSec / 3600) % 24;
  const d = Math.floor(Math.floor(epochSec / 86400) + 4) % 7;
  return { h, d };
};
