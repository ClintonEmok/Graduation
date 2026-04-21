import { describe, expect, test } from 'vitest';

import {
  buildComparableWarpMap,
  clampComparableWarpWeight,
  scoreComparableWarpBins,
} from './warp-scaling';

describe('comparable warp scaling', () => {
  test('scores hourly peers without changing order', () => {
    const result = scoreComparableWarpBins([
      { id: 'a', startTime: 0, endTime: 10, count: 2, granularity: 'hourly' },
      { id: 'b', startTime: 10, endTime: 20, count: 8, granularity: 'hourly' },
      { id: 'c', startTime: 20, endTime: 30, count: 2, granularity: 'hourly' },
    ]);

    expect(result.neutralFallback).toBe(false);
    expect(result.bins.map((bin) => bin.id)).toEqual(['a', 'b', 'c']);
    expect(result.bins[1]?.warpWeight).toBeGreaterThan(result.bins[0]?.warpWeight ?? 0);
    expect(result.bins[0]?.peerRelativeScore).toBeLessThan(1);
    expect(result.bins[1]?.peerRelativeScore).toBeGreaterThan(1);
  });

  test('scores monthly peers without falling back to neutral', () => {
    const result = scoreComparableWarpBins([
      { id: 'a', startTime: 0, endTime: 31, count: 3, granularity: 'monthly' },
      { id: 'b', startTime: 31, endTime: 62, count: 15, granularity: 'monthly' },
      { id: 'c', startTime: 62, endTime: 93, count: 3, granularity: 'monthly' },
    ]);

    expect(result.neutralFallback).toBe(false);
    expect(result.granularity).toBe('monthly');
    expect(result.bins.map((bin) => bin.id)).toEqual(['a', 'b', 'c']);
    expect(result.bins[1]?.warpWeight).toBeGreaterThan(result.bins[0]?.warpWeight ?? 0);
  });

  test('keeps mixed-granularity input on the neutral fallback path', () => {
    const result = scoreComparableWarpBins([
      { id: 'a', startTime: 0, endTime: 10, count: 4, granularity: 'daily' },
      { id: 'b', startTime: 10, endTime: 20, count: 9, granularity: 'weekly' },
    ]);

    expect(result.neutralFallback).toBe(true);
    expect(result.bins.every((bin) => bin.warpWeight === 1)).toBe(true);
    expect(result.bins.every((bin) => bin.isNeutralPartition)).toBe(true);
  });

  test('keeps visible minimum widths when building the warp map', () => {
    const result = buildComparableWarpMap([
      { id: 'a', startTime: 0, endTime: 10, count: 1, granularity: 'daily' },
      { id: 'b', startTime: 10, endTime: 20, count: 30, granularity: 'daily' },
      { id: 'c', startTime: 20, endTime: 30, count: 1, granularity: 'daily' },
    ], [0, 30], { minimumWidthShare: 0.1 });

    expect(result).not.toBeNull();
    expect(result?.boundaries).toHaveLength(4);
    expect(result?.boundaries[0]).toBe(0);
    expect(result?.boundaries[3]).toBe(30);
    expect(result?.bins[0]?.widthShare).toBeGreaterThanOrEqual(0.1);
    expect(result?.bins[2]?.widthShare).toBeGreaterThanOrEqual(0.1);
    expect(result?.boundaries[1]).toBeLessThan(result?.boundaries[2] ?? 0);
  });

  test('falls back to neutral widths for flat input and clamps weights', () => {
    const flat = scoreComparableWarpBins([
      { id: 'a', startTime: 0, endTime: 10, count: 4, granularity: 'weekly' },
      { id: 'b', startTime: 10, endTime: 20, count: 4, granularity: 'weekly' },
    ]);

    expect(flat.neutralFallback).toBe(true);
    expect(flat.bins.every((bin) => bin.warpWeight === 1)).toBe(true);

    const unsupported = scoreComparableWarpBins([
      { id: 'a', startTime: 0, endTime: 10, count: 4, granularity: 'weekly' },
      { id: 'b', startTime: 10, endTime: 20, count: 9, granularity: 'weekly' },
      { id: 'c', startTime: 20, endTime: 30, count: 1, granularity: 'weekly' },
    ]);

    expect(unsupported.neutralFallback).toBe(false);
    expect(clampComparableWarpWeight(0)).toBe(0.25);
    expect(clampComparableWarpWeight(10)).toBe(4);
  });
});
