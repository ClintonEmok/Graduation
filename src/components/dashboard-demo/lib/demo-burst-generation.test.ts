import { describe, expect, test } from 'vitest';
import {
  buildBurstDraftBinsFromWindows,
  buildNonUniformDraftBinsFromSelection,
  buildDemoBurstWindowsFromSelection,
  partitionSelectionByGranularity,
} from './demo-burst-generation';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('buildBurstDraftBinsFromWindows', () => {
  test('treats millisecond selections and second-based burst windows as the same range', () => {
    const result = buildBurstDraftBinsFromWindows(
      [
        {
          id: 'burst-1',
          start: 100,
          end: 160,
          peak: 0.92,
          count: 4,
          duration: 60,
          burstClass: 'isolated-spike',
          burstScore: 0.84,
        },
      ],
      {
        crimeTypes: [],
        neighbourhood: null,
        timeWindow: {
          start: 90_000,
          end: 180_000,
        },
        granularity: 'daily',
      }
    );

    expect(result.warning).toBeNull();
    expect(result.eventCount).toBe(4);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]?.startTime).toBe(100_000);
    expect(result.bins[0]?.endTime).toBe(160_000);
    expect(result.bins[0]?.burstScore).toBe(0.84);
  });
});

describe('buildDemoBurstWindowsFromSelection', () => {
  test('derives burst windows from the selected subrange only', () => {
    const windows = buildDemoBurstWindowsFromSelection({
      densityMap: new Float32Array([0.12, 0.25, 0.92, 0.95, 0.18, 0.81]),
      burstThreshold: 0.85,
      mapDomain: [0, 50],
      selectionRange: [20, 40],
    });

    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBe(20);
    expect(windows[0]?.end).toBe(40);
    expect(windows[0]?.peak).toBeCloseTo(0.95);
  });

  test('ignores stronger peaks outside the selected range', () => {
    const windows = buildDemoBurstWindowsFromSelection({
      densityMap: new Float32Array([0.08, 0.91, 0.94, 0.11, 0.99]),
      burstThreshold: 0.9,
      mapDomain: [0, 50],
      selectionRange: [0, 30],
    });

    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBeCloseTo(12.5);
    expect(windows[0]?.end).toBe(30);
    expect(windows[0]?.peak).toBeCloseTo(0.94);
  });
});

describe('partitionSelectionByGranularity', () => {
  test('partitions an hourly selection into contiguous hourly bins', () => {
    const bins = partitionSelectionByGranularity([5_000, 5_000 + (2 * HOUR_MS) + 15 * 60 * 1000], 'hourly');

    expect(bins).toEqual([
      { startTime: 5_000, endTime: 5_000 + HOUR_MS },
      { startTime: 5_000 + HOUR_MS, endTime: 5_000 + (2 * HOUR_MS) },
      { startTime: 5_000 + (2 * HOUR_MS), endTime: 5_000 + (2 * HOUR_MS) + 15 * 60 * 1000 },
    ]);
  });

  test('partitions a daily selection into contiguous daily bins', () => {
    const bins = partitionSelectionByGranularity([12_000, 12_000 + DAY_MS + 3 * HOUR_MS], 'daily');

    expect(bins).toEqual([
      { startTime: 12_000, endTime: 12_000 + DAY_MS },
      { startTime: 12_000 + DAY_MS, endTime: 12_000 + DAY_MS + 3 * HOUR_MS },
    ]);
  });
});

describe('buildNonUniformDraftBinsFromSelection', () => {
  test('preserves exact coverage for the brushed selection', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['all-crime-types'],
      neighbourhood: null,
      timeWindow: {
        start: 2_500,
        end: 2_500 + DAY_MS + 30 * 60 * 1000,
      },
      granularity: 'daily',
      eventTimestamps: [10_000, DAY_MS + 15 * 60 * 1000],
    });

    expect(result.warning).toBeNull();
    expect(result.bins).toHaveLength(2);
    expect(result.bins[0]?.startTime).toBe(2_500);
    expect(result.bins[1]?.endTime).toBe(2_500 + DAY_MS + 30 * 60 * 1000);
    expect(result.bins.reduce((sum, bin) => sum + (bin.endTime - bin.startTime), 0)).toBe(DAY_MS + 30 * 60 * 1000);
  });

  test('returns a neutral partition when no bin stands out', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: [],
      neighbourhood: 'Central',
      timeWindow: {
        start: 0,
        end: 3 * HOUR_MS,
      },
      granularity: 'hourly',
      eventTimestamps: [15 * 60 * 1000, HOUR_MS + 15 * 60 * 1000, (2 * HOUR_MS) + 15 * 60 * 1000],
    });

    expect(result.bins).toHaveLength(3);
    expect(result.warning).toBeNull();
    expect(result.bins.every((bin) => bin.isNeutralPartition)).toBe(true);
    expect(result.bins.every((bin) => (bin.warpWeight ?? 1) === 1)).toBe(true);
    expect(result.bins.every((bin) => bin.burstClass === 'neutral')).toBe(true);
  });

  test('expands the burstiest bin through warp metadata', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['burglary'],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 3 * HOUR_MS,
      },
      granularity: 'hourly',
      eventTimestamps: [
        5 * 60 * 1000,
        12 * 60 * 1000,
        70 * 60 * 1000,
        72 * 60 * 1000,
        78 * 60 * 1000,
        85 * 60 * 1000,
        90 * 60 * 1000,
        95 * 60 * 1000,
      ],
    });

    expect(result.bins).toHaveLength(3);
    expect(result.bins[1]?.warpWeight ?? 1).toBeGreaterThan(result.bins[0]?.warpWeight ?? 1);
    expect(result.bins[1]?.warpWeight ?? 1).toBeGreaterThan(result.bins[2]?.warpWeight ?? 1);
    expect(result.bins[1]?.burstClass).not.toBe('neutral');
    expect(result.bins[1]?.burstScore ?? 0).toBeGreaterThan(0);
  });
});
