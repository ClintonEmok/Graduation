/**
 * winsorize unit tests (Phase 84, Plan 84-03).
 *
 * Validates the cross-language parity with the Python
 * `numpy.percentile(method='linear')` reference (which is mathematically
 * equivalent to d3-array's R-7 quantile for N >= 5). The 168-cell
 * baseline has 168 floats so the parity is exact within 1e-6.
 *
 * The expected values below were computed in Python via:
 *   import numpy as np
 *   np.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, method='linear')   # -> 1.45
 *   np.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95, method='linear')  # -> 9.55
 *   np.percentile([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 5, method='linear')  # -> 0.5
 *   np.percentile([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 95, method='linear') # -> 54.5
 * (R-7: idx = 0.05 * 10 = 0.5 -> value = 0.5 * (1-0) + 0 = 0.5;
 *        idx = 0.95 * 10 = 9.5 -> value = 9 + 0.5 * (100-9) = 54.5)
 */

import { describe, expect, test } from 'vitest';

import { winsorize } from './winsorize';

describe('winsorize', () => {
  test('passes through middle values; clips edges to 5/95 percentiles', () => {
    // On [1..10], the 5th percentile is 1.45 and the 95th is 9.55.
    // Winsorize clips input[0]=1 UP to 1.45 and input[9]=10 DOWN to 9.55.
    // Middle values are unchanged.
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = winsorize(input, 0.05, 0.95);
    expect(result[0]).toBeCloseTo(1.45, 6);
    expect(result[9]).toBeCloseTo(9.55, 6);
    expect(result[5]).toBe(6);
  });

  test('matches Python numpy.percentile(linear) within 1e-6 (10 values)', () => {
    // Same as above but stated as a cross-language parity test with
    // the Python expected values spelled out.
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = winsorize(input, 0.05, 0.95);
    expect(result[0]).toBeCloseTo(1.45, 6);
    expect(result[9]).toBeCloseTo(9.55, 6);
    expect(result[5]).toBe(6);
  });

  test('matches Python numpy.percentile(linear) within 1e-6 (11 values with outlier)', () => {
    // Known vector: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100]
    // Python: np.percentile(values, 5, method='linear')  = 0.5
    //         np.percentile(values, 95, method='linear') = 54.5
    const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    const result = winsorize(input, 0.05, 0.95);
    expect(result[0]).toBeCloseTo(0.5, 6);   // clipped to 5th percentile
    expect(result[10]).toBeCloseTo(54.5, 6); // clipped to 95th percentile
    // Middle value (5) is unchanged.
    expect(result[5]).toBe(5);
  });

  test('5/95 winsorization on a uniform distribution (N=168) clips at the percentiles', () => {
    // 168-element array (matches the per-cell count). The 5th and 95th
    // percentiles of [1..168] under R-7 are 9.35 and 159.65 — winsorize
    // clips every value < 9.35 UP to 9.35, and every value > 159.65
    // DOWN to 159.65. The middle of the distribution is unchanged.
    // (This is the contract: winsorize always clips to the percentiles,
    // even if no individual value would colloquially be an "outlier".)
    const input = Array.from({ length: 168 }, (_, i) => i + 1);
    const result = winsorize(input, 0.05, 0.95);
    // 5th percentile of [1..168] under R-7 is 9.35; value 1 (input[0])
    // is below 9.35, so it gets clipped UP to 9.35.
    expect(result[0]).toBeCloseTo(9.35, 6);
    // 95th percentile of [1..168] under R-7 is 159.65; value 168
    // (input[167]) is above 159.65, so it gets clipped DOWN to 159.65.
    expect(result[167]).toBeCloseTo(159.65, 6);
    // Middle value (input[84] = 85) is unchanged (median = 84.5, so 85
    // is well within [9.35, 159.65]).
    expect(result[84]).toBe(85);
  });

  test('handles empty input', () => {
    expect(winsorize([], 0.05, 0.95)).toEqual([]);
  });
});
