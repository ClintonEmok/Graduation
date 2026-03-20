import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from '@/workers/adaptiveTime.worker';
import {
  DAYTIME_HEAVY_THRESHOLD,
  NIGHT_HEAVY_THRESHOLD,
  WEEKDAY_HEAVY_THRESHOLD,
  WEEKEND_HEAVY_THRESHOLD,
  assignUniformEventsCounts,
  buildAdaptiveBinDiagnostics,
} from './adaptive-bin-diagnostics';

const toEpoch = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

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

  test('pins threshold edge behavior for weekend-heavy and night-heavy labels', () => {
    const domainStart = toEpoch('2026-03-21T00:00:00Z');
    const domainEnd = toEpoch('2026-03-28T00:00:00Z');

    const weekendNight = toEpoch('2026-03-21T23:00:00Z');
    const weekendDay = toEpoch('2026-03-22T12:00:00Z');
    const weekdayNight = toEpoch('2026-03-24T23:00:00Z');
    const weekdayDay = toEpoch('2026-03-24T10:00:00Z');

    const buildSingleBinLabels = (timestamps: number[]) => {
      const rows = buildAdaptiveBinDiagnostics({
        selectedStrategy: 'uniform-time',
        domain: [domainStart, domainEnd],
        timestamps,
        countMap: Float32Array.from([timestamps.length]),
        densityMap: Float32Array.from([1]),
        warpMap: Float32Array.from([domainStart]),
      });
      return rows[0]?.characterizationLabels ?? [];
    };

    const weekendBelow = buildSingleBinLabels([
      weekendNight,
      weekendDay,
      weekendDay,
      weekendDay,
      weekendNight,
      weekdayDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 5/10 weekend

    const weekendAt = buildSingleBinLabels([
      weekendNight,
      weekendDay,
      weekendDay,
      weekendDay,
      weekendNight,
      weekendDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 6/10 weekend

    const weekendAbove = buildSingleBinLabels([
      weekendNight,
      weekendDay,
      weekendDay,
      weekendDay,
      weekendNight,
      weekendDay,
      weekendDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 7/10 weekend

    const nightBelow = buildSingleBinLabels([
      weekendNight,
      weekendNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekendDay,
      weekendDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 5/10 night

    const nightAt = buildSingleBinLabels([
      weekendNight,
      weekendNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekendDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 6/10 night

    const nightAbove = buildSingleBinLabels([
      weekendNight,
      weekendNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekendDay,
      weekdayDay,
      weekdayDay,
      weekdayDay,
    ]); // 7/10 night

    expect(weekendBelow).not.toContain('weekend-heavy');
    expect(weekendAt).toContain('weekend-heavy');
    expect(weekendAbove).toContain('weekend-heavy');

    expect(nightBelow).not.toContain('night-heavy');
    expect(nightAt).toContain('night-heavy');
    expect(nightAbove).toContain('night-heavy');

    // Threshold constants are explicit and stable.
    expect(WEEKEND_HEAVY_THRESHOLD).toBe(0.6);
    expect(WEEKDAY_HEAVY_THRESHOLD).toBe(0.6);
    expect(NIGHT_HEAVY_THRESHOLD).toBe(0.55);
    expect(DAYTIME_HEAVY_THRESHOLD).toBe(0.55);
  });

  test('remains deterministic across repeated runs and supports fallback maps', () => {
    const domainStart = toEpoch('2026-03-21T00:00:00Z');
    const domainEnd = toEpoch('2026-03-25T00:00:00Z');
    const timestamps = [
      toEpoch('2026-03-21T23:30:00Z'),
      toEpoch('2026-03-22T13:00:00Z'),
      toEpoch('2026-03-22T22:30:00Z'),
      toEpoch('2026-03-24T11:00:00Z'),
      toEpoch('2026-03-24T23:00:00Z'),
    ];

    const runA = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain: [domainStart, domainEnd],
      timestamps,
      countMap: Float32Array.from([5]),
      densityMap: null,
      warpMap: null,
    });

    const runB = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain: [domainStart, domainEnd],
      timestamps,
      countMap: Float32Array.from([5]),
      densityMap: null,
      warpMap: null,
    });

    expect(runA).toEqual(runB);
    expect(runA[0]?.characterizationLabels.length).toBeGreaterThan(0);
    expect(runA[0]?.rawCount).toBe(5);
  });
});
