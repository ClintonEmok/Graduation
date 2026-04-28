import { describe, expect, it } from 'vitest';
import {
  clampTimeRangeToDomain,
  normalizeTimeRange,
  normalizeTimeRangeBounds,
  timeRangeOverlapsDomain,
} from '@/lib/time-range';

describe('time-range utilities', () => {
  it('normalizes tuple and object ranges', () => {
    expect(normalizeTimeRange([20, 10])).toEqual([10, 20]);
    expect(normalizeTimeRange({ startEpoch: 10, endEpoch: 20 })).toEqual([10, 20]);
  });

  it('returns bounds objects', () => {
    expect(normalizeTimeRangeBounds([5, 9])).toEqual({ start: 5, end: 9 });
  });

  it('detects overlap and clamps to domain', () => {
    expect(timeRangeOverlapsDomain([5, 15], 10, 20)).toBe(true);
    expect(timeRangeOverlapsDomain([1, 5], 10, 20)).toBe(false);
    expect(clampTimeRangeToDomain([5, 15], 10, 20)).toEqual([10, 15]);
  });
});
