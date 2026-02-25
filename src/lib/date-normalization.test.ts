import { describe, expect, test } from 'vitest';
import {
  normalizeToPercent,
  denormalizeToEpoch,
  normalizedRangeToEpoch,
  epochRangeToNormalized,
} from './date-normalization';

describe('normalizeToPercent', () => {
  const minTime = 978307200; // 2001-01-01
  const maxTime = 1767571200; // 2026-01-01

  test('returns 0 for minTime', () => {
    expect(normalizeToPercent(minTime, minTime, maxTime)).toBe(0);
  });

  test('returns 100 for maxTime', () => {
    expect(normalizeToPercent(maxTime, minTime, maxTime)).toBe(100);
  });

  test('returns 50 for midpoint', () => {
    const midpoint = (minTime + maxTime) / 2;
    expect(normalizeToPercent(midpoint, minTime, maxTime)).toBe(50);
  });

  test('clamps negative values to 0', () => {
    expect(normalizeToPercent(minTime - 1000, minTime, maxTime)).toBe(0);
  });

  test('clamps values over max to 100', () => {
    expect(normalizeToPercent(maxTime + 1000, minTime, maxTime)).toBe(100);
  });

  test('handles equal min/max without division by zero', () => {
    expect(normalizeToPercent(100, 100, 100)).toBe(50);
  });
});

describe('denormalizeToEpoch', () => {
  const minTime = 978307200; // 2001-01-01
  const maxTime = 1767571200; // 2026-01-01

  test('returns minTime for 0', () => {
    expect(denormalizeToEpoch(0, minTime, maxTime)).toBe(minTime);
  });

  test('returns maxTime for 100', () => {
    expect(denormalizeToEpoch(100, minTime, maxTime)).toBe(maxTime);
  });

  test('returns midpoint for 50', () => {
    const midpoint = (minTime + maxTime) / 2;
    expect(denormalizeToEpoch(50, minTime, maxTime)).toBe(midpoint);
  });

  test('handles fractional percentages', () => {
    const result = denormalizeToEpoch(25, minTime, maxTime);
    const expected = minTime + 0.25 * (maxTime - minTime);
    expect(result).toBeCloseTo(expected);
  });
});

describe('normalizedRangeToEpoch', () => {
  const minTime = 978307200;
  const maxTime = 1767571200;

  test('converts [0, 100] to full range', () => {
    const result = normalizedRangeToEpoch([0, 100], minTime, maxTime);
    expect(result[0]).toBe(minTime);
    expect(result[1]).toBe(maxTime);
  });

  test('converts [25, 75] to middle 50%', () => {
    const result = normalizedRangeToEpoch([25, 75], minTime, maxTime);
    const expectedStart = minTime + 0.25 * (maxTime - minTime);
    const expectedEnd = minTime + 0.75 * (maxTime - minTime);
    expect(result[0]).toBeCloseTo(expectedStart);
    expect(result[1]).toBeCloseTo(expectedEnd);
  });

  test('preserves range span', () => {
    const inputSpan = 50; // 75 - 25
    const result = normalizedRangeToEpoch([25, 75], minTime, maxTime);
    const outputSpan = result[1] - result[0];
    const expectedSpan = (inputSpan / 100) * (maxTime - minTime);
    expect(outputSpan).toBeCloseTo(expectedSpan);
  });
});

describe('epochRangeToNormalized', () => {
  const minTime = 978307200;
  const maxTime = 1767571200;

  test('converts full range to [0, 100]', () => {
    const result = epochRangeToNormalized([minTime, maxTime], minTime, maxTime);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(100);
  });

  test('converts middle range to [25, 75]', () => {
    const start = minTime + 0.25 * (maxTime - minTime);
    const end = minTime + 0.75 * (maxTime - minTime);
    const result = epochRangeToNormalized([start, end], minTime, maxTime);
    expect(result[0]).toBeCloseTo(25);
    expect(result[1]).toBeCloseTo(75);
  });

  test('round-trip: normalize then denormalize preserves values', () => {
    const original: [number, number] = [1704067200, 1735689600]; // 2024-2025
    const normalized = epochRangeToNormalized(original, minTime, maxTime);
    const restored = normalizedRangeToEpoch(normalized, minTime, maxTime);
    expect(restored[0]).toBeCloseTo(original[0]);
    expect(restored[1]).toBeCloseTo(original[1]);
  });
});
