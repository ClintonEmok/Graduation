import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from './adaptiveTime.worker';

const toArray = (values: Float32Array) => Array.from(values);

describe('computeAdaptiveMaps', () => {
  test('defaults to uniform-time mode when binningMode is omitted', () => {
    const timestamps = Float32Array.from([0, 2, 4, 6, 8, 10]);
    const domain: [number, number] = [0, 10];

    const implicit = computeAdaptiveMaps(timestamps, domain, { binCount: 5, kernelWidth: 1 });
    const explicit = computeAdaptiveMaps(timestamps, domain, {
      binCount: 5,
      kernelWidth: 1,
      binningMode: 'uniform-time'
    });

    expect(toArray(implicit.densityMap)).toEqual(toArray(explicit.densityMap));
    expect(toArray(implicit.countMap)).toEqual(toArray(explicit.countMap));
    expect(toArray(implicit.burstinessMap)).toEqual(toArray(explicit.burstinessMap));
    expect(toArray(implicit.warpMap)).toEqual(toArray(explicit.warpMap));
  });

  test('returns finite uniform-events maps for duplicate-heavy timestamps', () => {
    const timestamps = Float32Array.from([10, 10, 10, 10, 20, 30, 40, 50]);
    const maps = computeAdaptiveMaps(timestamps, [0, 60], {
      binCount: 4,
      kernelWidth: 1,
      binningMode: 'uniform-events'
    });

    expect(maps.densityMap).toHaveLength(4);
    expect(maps.countMap).toHaveLength(4);
    expect(maps.burstinessMap).toHaveLength(4);
    expect(maps.warpMap).toHaveLength(4);

    expect(toArray(maps.densityMap).every((value) => Number.isFinite(value))).toBe(true);
    expect(toArray(maps.countMap).every((value) => Number.isFinite(value))).toBe(true);
    expect(toArray(maps.burstinessMap).every((value) => Number.isFinite(value))).toBe(true);
    expect(toArray(maps.warpMap).every((value) => Number.isFinite(value))).toBe(true);
  });

  test('keeps countMap as raw per-bin counts in uniform-events mode', () => {
    const timestamps = Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const maps = computeAdaptiveMaps(timestamps, [0, 8], {
      binCount: 4,
      kernelWidth: 1,
      binningMode: 'uniform-events'
    });

    const counts = toArray(maps.countMap);
    const totalCount = counts.reduce((sum, value) => sum + value, 0);

    expect(totalCount).toBe(timestamps.length);
    expect(counts.every((value) => Number.isInteger(value))).toBe(true);
    expect(counts.some((value) => value > 0)).toBe(true);
  });
});
