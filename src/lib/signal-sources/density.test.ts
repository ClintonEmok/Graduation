/**
 * densityWarpWeight unit tests (Phase 84, Plan 84-02).
 *
 * Verifies the locked formula
 *   warpWeight = clampComparableWarpWeight(
 *     1 + clamp01((O - E) / Math.max(E, 1)) * 1.5,
 *     0.25,
 *     4,
 *   )
 * on a known input vector and confirms the [1.0, 2.5] range plus the
 * null / missing-cell / zero-E fallbacks.
 *
 * Test fixture: totalWeeks = 100, default per-cell mu = 1/3600
 *   (1 event per hour per week). That gives E = mu * 3600 * 100 = 100
 *   for a default cell, so the assertion values are round numbers.
 */

import { describe, expect, test } from 'vitest';

import { densityWarpWeight } from './density';
import type { Baseline168 } from './contract';

const DEFAULT_MU = 1 / 3600; // 1 event/hour/week
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
      sig: 0.001,
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

describe('densityWarpWeight', () => {
  test('returns 1 when baseline is null (defensive fallback)', () => {
    expect(densityWarpWeight({ count: 10 }, null, 0, 0)).toBe(1);
  });

  test('returns 1 when observed equals expected (no deviation)', () => {
    // baseline: mu = 1/3600, totalWeeks = 100 -> E = 100
    const baseline = makeBaseline([{ h: 0, d: 0, mu: DEFAULT_MU }]);
    expect(densityWarpWeight({ count: 100 }, baseline, 0, 0)).toBe(1);
  });

  test('returns 1 when observed is below expected (negative deviation clamped)', () => {
    // O = 50, E = 100 -> (O - E) / E = -0.5 -> clamp01 -> 0 -> warpWeight = 1
    const baseline = makeBaseline([{ h: 0, d: 0, mu: DEFAULT_MU }]);
    expect(densityWarpWeight({ count: 50 }, baseline, 0, 0)).toBe(1);
  });

  test('returns 2.5 when observed is 2x expected (max range)', () => {
    // O = 200, E = 100 -> (200 - 100) / 100 = 1.0 -> clamp01 -> 1.0
    // -> 1 + 1.0 * 1.5 = 2.5
    const baseline = makeBaseline([{ h: 0, d: 0, mu: DEFAULT_MU }]);
    expect(densityWarpWeight({ count: 200 }, baseline, 0, 0)).toBeCloseTo(2.5, 10);
  });

  test('returns 1.75 when observed is 1.5x expected (mid range)', () => {
    // O = 150, E = 100 -> (150 - 100) / 100 = 0.5 -> clamp01 -> 0.5
    // -> 1 + 0.5 * 1.5 = 1.75
    const baseline = makeBaseline([{ h: 0, d: 0, mu: DEFAULT_MU }]);
    expect(densityWarpWeight({ count: 150 }, baseline, 0, 0)).toBeCloseTo(1.75, 10);
  });

  test('returns 1 when cell is missing (defensive fallback)', () => {
    // Pass a baseline with no cells at all; the (0, 0) lookup
    // returns undefined and density falls back to 1.
    const baseline: Baseline168 = { ...makeBaseline(), cells: [] };
    expect(densityWarpWeight({ count: 10 }, baseline, 0, 0)).toBe(1);
  });

  test('returns 1 when E is 0 (degenerate cell with mu=0)', () => {
    const baseline = makeBaseline([{ h: 0, d: 0, mu: 0 }]);
    expect(densityWarpWeight({ count: 100 }, baseline, 0, 0)).toBe(1);
  });
});
