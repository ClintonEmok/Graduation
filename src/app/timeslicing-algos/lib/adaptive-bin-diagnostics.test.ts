import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from '@/workers/adaptiveTime.worker';
import { assignUniformEventsCounts, buildAdaptiveBinDiagnostics } from './adaptive-bin-diagnostics';

describe('buildAdaptiveBinDiagnostics', () => {
  test('builds uniform-time rows with worker-aligned multipliers and warp boundaries', () => {
    const timestamps = [0, 2, 4, 6, 8, 10];
    const domain: [number, number] = [0, 10];
    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), domain, {
      binCount: 5,
      kernelWidth: 1,
      binningMode: 'uniform-time',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.startSec)).toEqual([0, 2, 4, 6, 8]);
    expect(rows.map((row) => row.endSec)).toEqual([2, 4, 6, 8, 10]);
    expect(rows.map((row) => row.rawCount)).toEqual(Array.from(maps.countMap));
    expect(rows.map((row) => row.warpedStartSec)).toEqual(Array.from(maps.warpMap));
    expect(rows.every((row) => row.widthSec === 2)).toBe(true);
    expect(rows.every((row, index) => row.adaptiveMultiplier === 1 + maps.densityMap[index] * 5)).toBe(true);
    expect(rows.at(-1)?.warpedEndSec).toBe(10);
  });

  test('reconstructs uniform-events boundaries and counts from raw timestamps', () => {
    const timestamps = [1, 2, 3, 4, 5, 6, 7, 8];
    const domain: [number, number] = [0, 8];
    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), domain, {
      binCount: 4,
      kernelWidth: 1,
      binningMode: 'uniform-events',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-events',
      domain,
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.startSec)).toEqual([0, 3, 5, 7]);
    expect(rows.map((row) => row.endSec)).toEqual([3, 5, 7, 8]);
    expect(rows.map((row) => row.rawCount)).toEqual(Array.from(maps.countMap));
    expect(rows.map((row) => row.rawCount)).toEqual(assignUniformEventsCounts(timestamps, domain, 4));
    expect(rows.every((row, index) => row.normalizedDensity === maps.densityMap[index])).toBe(true);
    expect(rows.some((row) => row.warpedSpanShare > row.widthSec / (domain[1] - domain[0]))).toBe(true);
  });

  test('keeps duplicate-heavy uniform-events bins strictly monotonic', () => {
    const timestamps = [10, 10, 10, 10, 20, 30, 40, 50];
    const domain: [number, number] = [0, 60];
    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), domain, {
      binCount: 4,
      kernelWidth: 1,
      binningMode: 'uniform-events',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-events',
      domain,
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.endSec > row.startSec)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.densityPerSecond))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.cumulativeWarpOffsetSec))).toBe(true);
  });
});
