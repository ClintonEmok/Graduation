// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  DEMO_PRESETS,
  DEMO_PRESET_ORDER,
  type DemoPreset,
  type DemoPresetId,
  presetToNormalizedRange,
} from './preset-windows';
import { STUDY_TASKS, type StudyTaskId } from '@/lib/study/protocol';

const PROTOCOL_ALIGNED_PRESETS: ReadonlyArray<DemoPresetId> = ['T4', 'T1u', 'T1a', 'T2u', 'T2a', 'T3a', 'T3b', 'T8u', 'T8a'];

describe('presetToNormalizedRange', () => {
  const minTime = 978307200; // 2001-01-01T00:00:00Z
  const maxTime = 1767225600; // 2026-01-01T00:00:00Z (exact boundary)

  const makePreset = (timeRange: [string, string] | null): DemoPreset => ({
    id: 'T1u',
    label: 'synthetic',
    timeRange,
    mode: 'linear',
    chip: 'synthetic',
  });

  test('returns null when timeRange is null (reset / full range)', () => {
    const preset = makePreset(null);
    expect(presetToNormalizedRange(preset, minTime, maxTime)).toBeNull();
  });

  test('returns null when minTimestampSec is null', () => {
    const preset = makePreset(['2023-12-17', '2023-12-24']);
    expect(presetToNormalizedRange(preset, null, maxTime)).toBeNull();
  });

  test('returns null when maxTimestampSec is null', () => {
    const preset = makePreset(['2023-12-17', '2023-12-24']);
    expect(presetToNormalizedRange(preset, minTime, null)).toBeNull();
  });

  test('returns null when min >= max (degenerate data bounds)', () => {
    const preset = makePreset(['2023-12-17', '2023-12-24']);
    expect(presetToNormalizedRange(preset, maxTime, minTime)).toBeNull();
    expect(presetToNormalizedRange(preset, minTime, minTime)).toBeNull();
  });

  test('returns [0, 100] for a range that fully covers the data domain', () => {
    // Use ISO timestamps that are exactly the min/max boundaries so we get
    // exact [0, 100] (the rounded epoch seconds for 2001-01-01 / 2026-01-01
    // are stable but the test only needs to assert the limits are hit).
    const preset = makePreset(['2001-01-01T00:00:00Z', '2026-01-01T00:00:01Z']);
    const result = presetToNormalizedRange(preset, minTime, maxTime);
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0, 2);
    expect(result?.[1]).toBeCloseTo(100, 2);
  });

  test('returns correct [a, b] for a range inside the data domain (T1u: Dec 17–24, 2023)', () => {
    const preset = DEMO_PRESETS.T1u;
    const result = presetToNormalizedRange(preset, minTime, maxTime);
    expect(result).not.toBeNull();
    const [start, end] = result as [number, number];
    // Expected ratio: (start - min) / (max - min) * 100
    const startSec = Date.parse('2023-12-17') / 1000;
    const endSec = Date.parse('2023-12-24') / 1000;
    const expectedStart = ((startSec - minTime) / (maxTime - minTime)) * 100;
    const expectedEnd = ((endSec - minTime) / (maxTime - minTime)) * 100;
    expect(start).toBeCloseTo(expectedStart, 6);
    expect(end).toBeCloseTo(expectedEnd, 6);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeLessThan(100);
    expect(start).toBeLessThan(end);
  });

  test('clamps values < 0 to 0 when the range starts before the data domain', () => {
    const preset = makePreset(['1990-01-01', '2023-12-24']);
    const result = presetToNormalizedRange(preset, minTime, maxTime);
    expect(result?.[0]).toBe(0);
  });

  test('clamps values > 100 to 100 when the range ends after the data domain', () => {
    const preset = makePreset(['2023-12-17', '2099-12-31']);
    const result = presetToNormalizedRange(preset, minTime, maxTime);
    expect(result?.[1]).toBe(100);
  });

  test('returns null when both date strings fail to parse', () => {
    const preset = makePreset(['not-a-date', 'also-not-a-date']);
    expect(presetToNormalizedRange(preset, minTime, maxTime)).toBeNull();
  });

  test('output is in percent [0, 100] (matches useCoordinationStore.brushRange contract)', () => {
    for (const id of PROTOCOL_ALIGNED_PRESETS) {
      const result = presetToNormalizedRange(DEMO_PRESETS[id], minTime, maxTime);
      expect(result, `${id} should yield a normalized range`).not.toBeNull();
      const [start, end] = result as [number, number];
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThanOrEqual(100);
      expect(end).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(100);
    }
  });
});

describe('DEMO_PRESETS integrity', () => {
  test('every preset ID in DEMO_PRESETS appears in DEMO_PRESET_ORDER (no orphans)', () => {
    const presetIds = Object.keys(DEMO_PRESETS) as DemoPresetId[];
    for (const id of presetIds) {
      expect(DEMO_PRESET_ORDER, `missing ${id} in DEMO_PRESET_ORDER`).toContain(id);
    }
    expect(new Set(DEMO_PRESET_ORDER).size).toBe(DEMO_PRESET_ORDER.length);
  });

  test('DEMO_PRESET_ORDER contains no unknown IDs', () => {
    for (const id of DEMO_PRESET_ORDER) {
      expect(DEMO_PRESETS[id], `unknown preset id ${id}`).toBeDefined();
    }
  });

  test('all preset.timeRange date strings parse as valid dates', () => {
    for (const id of Object.keys(DEMO_PRESETS) as DemoPresetId[]) {
      const range = DEMO_PRESETS[id].timeRange;
      if (range === null) continue;
      const start = Date.parse(range[0]);
      const end = Date.parse(range[1]);
      expect(Number.isNaN(start), `${id} start "${range[0]}" should parse`).toBe(false);
      expect(Number.isNaN(end), `${id} end "${range[1]}" should parse`).toBe(false);
      expect(start).toBeLessThanOrEqual(end);
    }
  });

  test('all presets have a non-empty label and a non-empty chip', () => {
    for (const id of Object.keys(DEMO_PRESETS) as DemoPresetId[]) {
      const preset = DEMO_PRESETS[id];
      expect(preset.label.length, `${id} label should be non-empty`).toBeGreaterThan(0);
      expect(preset.chip.length, `${id} chip should be non-empty`).toBeGreaterThan(0);
    }
  });

  test('uniform variants (T1u, T2u, T8u) declare linear mode', () => {
    expect(DEMO_PRESETS.T1u.mode).toBe('linear');
    expect(DEMO_PRESETS.T2u.mode).toBe('linear');
    expect(DEMO_PRESETS.T8u.mode).toBe('linear');
  });

  test('adaptive variants (T1a, T2a, T8a) declare adaptive mode', () => {
    expect(DEMO_PRESETS.T1a.mode).toBe('adaptive');
    expect(DEMO_PRESETS.T2a.mode).toBe('adaptive');
    expect(DEMO_PRESETS.T8a.mode).toBe('adaptive');
  });

  test('T1u/T1a, T2u/T2a, T8u/T8a share identical time windows (mode is the only difference)', () => {
    expect(DEMO_PRESETS.T1u.timeRange).toEqual(DEMO_PRESETS.T1a.timeRange);
    expect(DEMO_PRESETS.T2u.timeRange).toEqual(DEMO_PRESETS.T2a.timeRange);
    expect(DEMO_PRESETS.T8u.timeRange).toEqual(DEMO_PRESETS.T1u.timeRange);
  });
});

describe('STUDY_TASKS protocol alignment', () => {
  test('every preset task ID (T1, T2, T3, T4) is present in STUDY_TASKS', () => {
    const ids: ReadonlyArray<StudyTaskId> = ['T1', 'T2', 'T3', 'T4'];
    for (const id of ids) {
      expect(STUDY_TASKS[id], `STUDY_TASKS missing ${id}`).toBeDefined();
    }
  });

  test('T4 preset timeRange matches STUDY_TASKS.T4.timeRange', () => {
    const [, , t4End] = STUDY_TASKS.T4.timeRange.split(' ');
    expect(DEMO_PRESETS.T4.timeRange?.[0]).toBe(STUDY_TASKS.T4.timeRange.split(' ')[0]);
    expect(DEMO_PRESETS.T4.timeRange?.[1]).toBe(t4End);
  });

  test('T1u preset timeRange matches STUDY_TASKS.T1.timeRange', () => {
    const parts = STUDY_TASKS.T1.timeRange.split(' ');
    expect(DEMO_PRESETS.T1u.timeRange?.[0]).toBe(parts[0]);
    expect(DEMO_PRESETS.T1u.timeRange?.[1]).toBe(parts[2]);
  });

  test('T2u preset timeRange matches STUDY_TASKS.T2.timeRange', () => {
    const parts = STUDY_TASKS.T2.timeRange.split(' ');
    expect(DEMO_PRESETS.T2u.timeRange?.[0]).toBe(parts[0]);
    expect(DEMO_PRESETS.T2u.timeRange?.[1]).toBe(parts[2]);
  });

  test('T3a/T3b preset timeRanges match STUDY_TASKS.T3.timeRange / .comparisonRange', () => {
    const parts = STUDY_TASKS.T3.timeRange.split(' ');
    expect(DEMO_PRESETS.T3a.timeRange?.[0]).toBe(parts[0]);
    expect(DEMO_PRESETS.T3a.timeRange?.[1]).toBe(parts[2]);
    const compParts = (STUDY_TASKS.T3.comparisonRange ?? '').split(' ');
    expect(DEMO_PRESETS.T3b.timeRange?.[0]).toBe(compParts[0]);
    expect(DEMO_PRESETS.T3b.timeRange?.[1]).toBe(compParts[2]);
  });
});
