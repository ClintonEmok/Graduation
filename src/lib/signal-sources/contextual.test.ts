/**
 * contextualWarpWeight + computeWinsorizedBaseline unit tests
 * (Phase 84, Plan 84-03).
 *
 * Verifies the locked formula
 *   z = (count - muW * windowSec) / max(sigW * sqrt(windowSec), EPSILON)
 *   z_clamped = clamp(z, -2, 5)
 *   warpWeight = 0.2 + (z_clamped + 2) / 7 * 2.8
 * on a known input vector and confirms the [0.2, 3.0] range plus the
 * null / missing-cell / zero-window fallbacks.
 *
 * Test fixture: totalWeeks = 100, default per-cell mu = 1/3600
 *   (1 event per hour per week). That gives E = mu * 3600 = 1 for
 *   a 1h bin. For a 1h bin (windowSec = 3600), sigma = sig * 60;
 *   with sig = 0.001, sigma = 0.06.
 *
 * The z formula:
 *   - z = 0 (O = E) -> warpWeight = 0.2 + 2/7 * 2.8 = 0.2 + 0.8 = 1.0
 *   - z = 5 (max burst): O = 5 * 0.06 + 1 = 1.3 -> warpWeight = 3.0
 *   - z = -2 (max compression): O = -2 * 0.06 + 1 = 0.88 -> warpWeight = 0.2
 *
 * For the winsorized baseline, the test uses a uniform mu/sig so
 * winsorization is a no-op (no outliers in uniform data).
 */

import { describe, expect, test } from 'vitest';

import { computeWinsorizedBaseline, contextualWarpWeight } from './contextual';
import type { Baseline168, Baseline168Winsorized } from './contract';

const DEFAULT_MU = 1 / 3600; // 1 event/hour/week
const DEFAULT_SIG = 0.001;
const DEFAULT_TOTAL_WEEKS = 100;

type CellOverride = Partial<Baseline168['cells'][number]>;

const makeBaseline = (overrides: CellOverride[] = []): Baseline168 => {
  const cells = Array.from({ length: 168 }, (_, idx) => {
    const h = Math.floor(idx / 7);
    const d = idx % 7;
    const override = overrides.find(
      (o) => 'h' in o && o.h === h && 'd' in o && o.d === d,
    );
    return {
      h,
      d,
      c: 100,
      mu: override && 'mu' in override && typeof override.mu === 'number' ? override.mu : DEFAULT_MU,
      sig: override && 'sig' in override && typeof override.sig === 'number' ? override.sig : DEFAULT_SIG,
      ...override,
    };
  });
  return {
    header: {
      nEvents: 16800,
      tsMin: 0,
      tsMax: DEFAULT_TOTAL_WEEKS * 7 * 86400,
      totalWeeks: DEFAULT_TOTAL_WEEKS,
      fingerprint: 'sha256:test',
      builtAt: '2026-06-27T00:00:00Z',
    },
    cells,
  };
};

const makeWinsorizedBaseline = (
  overrides: CellOverride[] = [],
): Baseline168Winsorized => {
  // For tests we want to use the same overrides pattern as makeBaseline
  // but produce a winsorized baseline directly (uniform mu/sig means
  // winsorize is a no-op, so we can just copy mu -> muW and sig -> sigW).
  const baseline = makeBaseline(overrides);
  return {
    header: baseline.header,
    cells: baseline.cells.map((c) => ({
      h: c.h,
      d: c.d,
      c: c.c,
      muW: c.mu,
      sigW: c.sig,
    })),
  };
};

describe('computeWinsorizedBaseline', () => {
  test('produces 168 winsorized cells from a 168-cell baseline', () => {
    const baseline = makeBaseline();
    const result = computeWinsorizedBaseline(baseline);
    expect(result.cells).toHaveLength(168);
    // No outliers in uniform mu — output should equal input
    for (let i = 0; i < 168; i++) {
      expect(result.cells[i].h).toBe(baseline.cells[i].h);
      expect(result.cells[i].d).toBe(baseline.cells[i].d);
      expect(result.cells[i].muW).toBeCloseTo(DEFAULT_MU, 10);
      expect(result.cells[i].sigW).toBeCloseTo(DEFAULT_SIG, 10);
    }
  });

  test('clips a single extreme cell', () => {
    const baseline = makeBaseline();
    baseline.cells[0].mu = 1.0; // huge outlier vs the 1/3600 mean
    const result = computeWinsorizedBaseline(baseline);
    // The 95th percentile clips this down; exact value depends on R-7 interp
    expect(result.cells[0].muW).toBeLessThan(1.0);
  });

  test('preserves the header (fingerprint, totalWeeks, etc.)', () => {
    const baseline = makeBaseline();
    const result = computeWinsorizedBaseline(baseline);
    expect(result.header).toEqual(baseline.header);
  });
});

describe('contextualWarpWeight', () => {
  test('returns 1 when baselineWinsorized is null (defensive fallback)', () => {
    expect(
      contextualWarpWeight(
        { count: 100, startTime: 0, endTime: 3600 * 1000 },
        null,
        0,
        0,
      ),
    ).toBe(1);
  });

  test('z = 0 maps to warpWeight = 1.0 (neutral)', () => {
    // baseline muW = 1/3600, windowSec = 3600 (1h bin), so E = 1
    // O = 1 -> z = 0 -> zClamped = 0 -> t = 2/7 -> warpWeight = 0.2 + 2/7 * 2.8 = 1.0
    const bw = makeWinsorizedBaseline();
    const result = contextualWarpWeight(
      { count: 1, startTime: 0, endTime: 3600 * 1000 },
      bw,
      0,
      0,
    );
    expect(result).toBeCloseTo(1.0, 6);
  });

  test('z = 5 (max burst) maps to warpWeight = 3.0', () => {
    // baseline muW = 1/3600, sigW = 0.001, windowSec = 3600 (1h bin)
    // E = 1, sigma = 0.001 * sqrt(3600) = 0.001 * 60 = 0.06
    // For z = 5: O = 5 * 0.06 + 1 = 1.3
    const bw = makeWinsorizedBaseline();
    const result = contextualWarpWeight(
      { count: 1.3, startTime: 0, endTime: 3600 * 1000 },
      bw,
      0,
      0,
    );
    expect(result).toBeCloseTo(3.0, 6);
  });

  test('z = -2 (max compression) maps to warpWeight = 0.2', () => {
    // For z = -2: O = -2 * 0.06 + 1 = 0.88
    const bw = makeWinsorizedBaseline();
    const result = contextualWarpWeight(
      { count: 0.88, startTime: 0, endTime: 3600 * 1000 },
      bw,
      0,
      0,
    );
    expect(result).toBeCloseTo(0.2, 6);
  });

  test('returns 1 when cell is missing (defensive fallback)', () => {
    const bw: Baseline168Winsorized = {
      header: {
        nEvents: 0,
        tsMin: 0,
        tsMax: 0,
        totalWeeks: 0,
        fingerprint: 'sha256:test',
        builtAt: '2026-06-27T00:00:00Z',
      },
      cells: [],
    };
    expect(
      contextualWarpWeight(
        { count: 1, startTime: 0, endTime: 3600 * 1000 },
        bw,
        0,
        0,
      ),
    ).toBe(1);
  });

  test('returns 1 when windowSec is zero (degenerate bin)', () => {
    const bw = makeWinsorizedBaseline();
    expect(
      contextualWarpWeight({ count: 1, startTime: 0, endTime: 0 }, bw, 0, 0),
    ).toBe(1);
  });

  test('returns 1 when windowSec is negative (degenerate bin)', () => {
    const bw = makeWinsorizedBaseline();
    // endTime < startTime -> negative windowSec -> 1
    expect(
      contextualWarpWeight(
        { count: 1, startTime: 3600 * 1000, endTime: 0 },
        bw,
        0,
        0,
      ),
    ).toBe(1);
  });

  test('large burst (z > 5) clamps to 3.0 (max)', () => {
    // O = 10 -> z = (10 - 1) / 0.06 = 150 -> clamped to 5 -> warpWeight = 3.0
    const bw = makeWinsorizedBaseline();
    const result = contextualWarpWeight(
      { count: 10, startTime: 0, endTime: 3600 * 1000 },
      bw,
      0,
      0,
    );
    expect(result).toBeCloseTo(3.0, 6);
  });
});
