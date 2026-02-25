import { describe, expect, test } from 'vitest';
import {
  calculateRangeTolerance,
  rangesMatch,
  slicesOverlapWithinTolerance,
  withinTolerance,
} from './slice-utils';

describe('withinTolerance', () => {
  test('accepts values inside tolerance', () => {
    expect(withinTolerance(10.1, 10, 0.2)).toBe(true);
  });

  test('rejects values outside tolerance', () => {
    expect(withinTolerance(10.3, 10, 0.2)).toBe(false);
  });
});

describe('calculateRangeTolerance', () => {
  test('calculates tolerance from span using default percent', () => {
    expect(calculateRangeTolerance([20, 40])).toBeCloseTo(0.1);
  });

  test('handles descending ranges and custom percent', () => {
    expect(calculateRangeTolerance([40, 20], 0.01)).toBeCloseTo(0.2);
  });
});

describe('rangesMatch', () => {
  test('matches equal ranges', () => {
    expect(rangesMatch([10, 30], [10, 30])).toBe(true);
  });

  test('matches near ranges within default tolerance', () => {
    expect(rangesMatch([10, 30], [10.09, 30.09])).toBe(true);
  });

  test('does not match ranges outside default tolerance', () => {
    expect(rangesMatch([10, 30], [10.2, 30.2])).toBe(false);
  });

  test('respects explicit tolerance overrides', () => {
    expect(rangesMatch([10, 30], [10.2, 30.2], 0.25)).toBe(true);
  });

  test('supports alias export for overlap matching', () => {
    expect(slicesOverlapWithinTolerance([15, 45], [15.1, 45.1], 0.2)).toBe(true);
  });
});
