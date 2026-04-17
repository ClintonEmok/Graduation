import { describe, expect, test } from 'vitest';
import { buildBurstWindowsFromSeries } from './BurstList';

describe('buildBurstWindowsFromSeries', () => {
  test('only derives windows inside the selected range', () => {
    const result = buildBurstWindowsFromSeries({
      densityMap: Float32Array.from([0.95, 0.95, 0.1, 0.82, 0.81, 0.1]),
      burstinessMap: null,
      countMap: Float32Array.from([4, 4, 1, 3, 2, 1]),
      burstMetric: 'density',
      burstCutoff: 0.8,
      mapDomain: [0, 50],
      selectionRange: [25, 45],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe(30);
    expect(result[0]?.end).toBe(45);
    expect(result[0]?.peak).toBeCloseTo(0.82, 2);
    expect(result[0]?.count).toBe(6);
  });

  test('clips burst windows to the selected bounds', () => {
    const result = buildBurstWindowsFromSeries({
      densityMap: Float32Array.from([0.1, 0.91, 0.92, 0.93, 0.1]),
      burstinessMap: null,
      countMap: Float32Array.from([1, 2, 3, 1, 1]),
      burstMetric: 'density',
      burstCutoff: 0.8,
      mapDomain: [0, 40],
      selectionRange: [15, 35],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe(15);
    expect(result[0]?.end).toBe(35);
    expect(result[0]?.count).toBe(6);
  });
});
