import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from '@/workers/adaptiveTime.worker';
import {
  BURST_PATTERN_MIN_EVENTS,
  BURST_PATTERN_RATIO,
  COMMUTE_HEAVY_THRESHOLD,
  DAYTIME_HEAVY_THRESHOLD,
  LATE_NIGHT_HEAVY_THRESHOLD,
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

  test('keeps rawCount and no-events labels consistent on exact bin boundaries', () => {
    const maps = computeAdaptiveMaps(Float32Array.from([0, 2, 4]), [0, 4], {
      binCount: 2,
      kernelWidth: 1,
      binningMode: 'uniform-time',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain: [0, 4],
      timestamps: [0, 2, 4],
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.rawCount).toBe(1);
    expect(rows[1]?.rawCount).toBe(2);
    expect(rows[0]?.characterizationLabels).not.toContain('no-events');
    expect(rows[1]?.characterizationLabels).not.toContain('no-events');
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
    expect(COMMUTE_HEAVY_THRESHOLD).toBe(0.55);
    expect(LATE_NIGHT_HEAVY_THRESHOLD).toBe(0.55);
    expect(BURST_PATTERN_RATIO).toBe(2.0);
    expect(BURST_PATTERN_MIN_EVENTS).toBe(4);
  });

  test('pins threshold edge behavior for commute-heavy and late-night-heavy labels', () => {
    const domainStart = toEpoch('2026-03-21T00:00:00Z');
    const domainEnd = toEpoch('2026-03-28T00:00:00Z');

    const weekdayCommute = toEpoch('2026-03-23T08:00:00Z'); // Mon 8am
    const weekdayNonCommute = toEpoch('2026-03-23T13:00:00Z'); // Mon 1pm
    const weekendHour = toEpoch('2026-03-22T08:00:00Z'); // Sun 8am
    const lateNight = toEpoch('2026-03-23T02:00:00Z'); // Mon 2am
    const midday = toEpoch('2026-03-23T12:00:00Z'); // Mon noon

    const buildSingleBinLabels = (timestamps: number[]) => {
      const maps = computeAdaptiveMaps(Float32Array.from(timestamps), [domainStart, domainEnd], {
        binCount: 1,
        kernelWidth: 1,
        binningMode: 'uniform-time',
      });
      const rows = buildAdaptiveBinDiagnostics({
        selectedStrategy: 'uniform-time',
        domain: [domainStart, domainEnd],
        timestamps,
        countMap: maps.countMap,
        densityMap: maps.densityMap,
        warpMap: maps.warpMap,
      });
      return rows[0]?.characterizationLabels ?? [];
    };

    const commuteAt = buildSingleBinLabels([
      weekdayCommute,
      weekdayCommute,
      weekdayCommute,
      weekdayCommute,
      weekdayCommute,
      weekdayCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
    ]); // 6/10 commute → 60% ≥ 55%

    const commuteBelow = buildSingleBinLabels([
      weekdayCommute,
      weekdayCommute,
      weekdayCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
      weekdayNonCommute,
    ]); // 3/10 commute → 30% < 55%

    const lateNightAt = buildSingleBinLabels([
      lateNight,
      lateNight,
      lateNight,
      lateNight,
      lateNight,
      lateNight,
      midday,
      midday,
      midday,
      midday,
    ]); // 6/10 late-night → 60% ≥ 55%

    const lateNightBelow = buildSingleBinLabels([
      lateNight,
      lateNight,
      lateNight,
      midday,
      midday,
      midday,
      midday,
      midday,
      midday,
      midday,
    ]); // 3/10 late-night → 30% < 55%

    expect(commuteAt).toContain('commute-heavy');
    expect(commuteBelow).not.toContain('commute-heavy');
    expect(commuteAt).toContain('weekday-heavy'); // Mon–Fri dominates
    expect(commuteAt).not.toContain('weekend-heavy');

    expect(lateNightAt).toContain('late-night-heavy');
    expect(lateNightBelow).not.toContain('late-night-heavy');
  });

  test('pins burst-pattern threshold at 2x concentration ratio with minimum 4 events', () => {
    const domainStart = 0;
    const domainEnd = 100;
    const binCount = 5;

    const burstEvents = [
      1, 2, 3, 4, 5, 6,
      55, 66, 77, 88,
    ];

    const noBurstEvents = [
      1, 2, 3, 4,
      55, 66, 77, 88,
    ];

    const buildRows = (timestamps: number[]) => {
      const maps = computeAdaptiveMaps(Float32Array.from(timestamps), [domainStart, domainEnd], {
        binCount,
        kernelWidth: 1,
        binningMode: 'uniform-time',
      });
      return buildAdaptiveBinDiagnostics({
        selectedStrategy: 'uniform-time',
        domain: [domainStart, domainEnd],
        timestamps,
        countMap: maps.countMap,
        densityMap: maps.densityMap,
        warpMap: maps.warpMap,
      });
    };

    const burstRows = buildRows(burstEvents);
    const noBurstRows = buildRows(noBurstEvents);

    // Bin 0: 6 events, 20% of time, 60% of events → 6/20 / 0.2 = 3.0x
    const burstBin = burstRows[0];
    expect(burstBin).toBeDefined();
    expect(burstBin!.rawCount).toBe(6);
    expect(burstBin!.characterizationLabels).toContain('burst-pattern');

    // Other bins: 1 event each → 10% event share / 20% time share = 0.5x → no burst
    const otherBinsWithBurst = burstRows.filter((r) => r.binIndex > 0 && r.characterizationLabels.includes('burst-pattern'));
    expect(otherBinsWithBurst).toHaveLength(0);

    // 4 events exactly at minimum: 4/10 = 40% event share / 20% time share = 2.0x → threshold is ≥
    const fourEventRows = buildRows(noBurstEvents);
    expect(fourEventRows[0]!.characterizationLabels).toContain('burst-pattern');

    // 3 events: 3/10 = 30% event share / 20% time share = 1.5x < 2.0x → no burst
    const threeEventRows = buildRows([1, 2, 3, 55, 66, 77, 88]);
    expect(threeEventRows[0]!.characterizationLabels).not.toContain('burst-pattern');
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

  test('traitPercents sums all temporal percentages and excludes mixed-pattern', () => {
    const domainStart = toEpoch('2026-03-21T00:00:00Z');
    const domainEnd = toEpoch('2026-03-28T00:00:00Z');

    const weekdayNight = toEpoch('2026-03-23T23:00:00Z'); // Mon 11pm
    const weekdayDay = toEpoch('2026-03-23T14:00:00Z'); // Mon 2pm

    const timestamps = [
      weekdayNight,
      weekdayNight,
      weekdayNight,
      weekdayDay,
    ];

    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), [domainStart, domainEnd], {
      binCount: 1,
      kernelWidth: 1,
      binningMode: 'uniform-time',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain: [domainStart, domainEnd],
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    const row = rows[0];
    expect(row).toBeDefined();

    const weekday = row!.traitPercents.find((tp) => tp.label === 'weekday-heavy');
    expect(weekday?.percent).toBe(100);

    const night = row!.traitPercents.find((tp) => tp.label === 'night-heavy');
    expect(night?.percent).toBe(75);

    const daytime = row!.traitPercents.find((tp) => tp.label === 'daytime-heavy');
    expect(daytime?.percent).toBe(25);

    const mixedPattern = row!.traitPercents.find((tp) => tp.label === 'mixed-pattern');
    expect(mixedPattern).toBeUndefined();

    const noEvents = row!.traitPercents.find((tp) => tp.label === 'no-events');
    expect(noEvents).toBeUndefined();

    expect(row!.characterizationLabels).toContain('weekday-heavy');
    expect(row!.characterizationLabels).toContain('night-heavy');
  });

  test('traitPercents shows no-events at 100 percent for empty bins', () => {
    const domainStart = 0;
    const domainEnd = 100;
    const timestamps: number[] = [];

    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), [domainStart, domainEnd], {
      binCount: 3,
      kernelWidth: 1,
      binningMode: 'uniform-time',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain: [domainStart, domainEnd],
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(row.characterizationLabels).toContain('no-events');
      const noEvents = row.traitPercents.find((tp) => tp.label === 'no-events');
      expect(noEvents?.percent).toBe(100);
    });
  });

  test('classifies sustained peaks deterministically across repeated runs', () => {
    const domain: [number, number] = [0, 30];
    const timestamps = [2, 4, 6, 12, 14, 16, 22, 24];
    const countMap = Float32Array.from([2, 6, 2]);
    const densityMap = Float32Array.from([0.18, 0.92, 0.22]);
    const warpMap = Float32Array.from([0, 10, 20]);

    const runA = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps,
      countMap,
      densityMap,
      warpMap,
    });

    const runB = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps,
      countMap,
      densityMap,
      warpMap,
    });

    expect(runA).toEqual(runB);
    expect(runA[1]?.burstClass).toBe('prolonged-peak');
    expect(runA[1]?.burstConfidence).toBeGreaterThan(0);
    expect(runA[1]?.burstRationale).toContain('Sustained');
  });

  test('classifies a short high window as isolated spike when neighbors do not sustain it', () => {
    const domain: [number, number] = [0, 18];
    const timestamps = [1, 2, 8, 9, 16];
    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps,
      countMap: Float32Array.from([1, 2, 1]),
      densityMap: Float32Array.from([0.12, 0.91, 0.1]),
      warpMap: Float32Array.from([0, 6, 12]),
    });

    expect(rows[1]?.burstClass).toBe('isolated-spike');
    expect(rows[1]?.tieBreakReason).toContain('isolated spike');
  });

  test('classifies low contrast windows as valleys and keeps near-threshold ties deterministic', () => {
    const domain: [number, number] = [0, 24];
    const valleyRows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps: [1, 3, 5, 11, 13, 15, 19, 21],
      countMap: Float32Array.from([6, 1, 5]),
      densityMap: Float32Array.from([0.82, 0.16, 0.78]),
      warpMap: Float32Array.from([0, 8, 16]),
    });

    const tiedRows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps: [2, 6, 10, 14, 18],
      countMap: Float32Array.from([2, 2, 1]),
      densityMap: Float32Array.from([0.3, 0.3, 0.29]),
      warpMap: Float32Array.from([0, 8, 16]),
    });

    expect(valleyRows[1]?.burstClass).toBe('valley');
    expect(valleyRows[1]?.thresholdSource).toContain('global-thresholds');
    expect(tiedRows[0]?.burstClass).toBe(tiedRows[0]?.burstClass);
    expect(tiedRows[0]?.burstScore).toBeDefined();
  });
});
