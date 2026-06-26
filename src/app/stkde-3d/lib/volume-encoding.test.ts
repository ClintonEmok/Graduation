import { describe, expect, test } from 'vitest';
import { buildDurationVolumeProfile, DEFAULT_DURATION_VOLUME_SETTINGS } from './volume-encoding';

describe('buildDurationVolumeProfile', () => {
  const slices = [
    { index: 0, startEpoch: 0, endEpoch: 3_600 },
    { index: 1, startEpoch: 0, endEpoch: 7_200 },
    { index: 2, startEpoch: 0, endEpoch: 7_200 },
  ];

  test('returns an empty profile for empty input', () => {
    expect(buildDurationVolumeProfile([], DEFAULT_DURATION_VOLUME_SETTINGS)).toEqual([]);
  });

  test('keeps longer durations thicker and deterministic', () => {
    const profileA = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.2,
      normalizationMode: 'window',
    });
    const profileB = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.2,
      normalizationMode: 'window',
    });

    expect(profileA).toEqual(profileB);
    expect(profileA).toHaveLength(3);
    expect(profileA[0]?.durationSeconds).toBe(3_600);
    expect(profileA[1]?.durationSeconds).toBe(7_200);
    expect(profileA[1]?.thickness).toBeGreaterThan(profileA[0]?.thickness ?? 0);
    expect(profileA[1]?.normalizedDuration).toBeGreaterThan(profileA[0]?.normalizedDuration ?? 0);
  });

  test('responds to exaggeration changes without changing ordering', () => {
    const conservative = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 0.8,
      normalizationMode: 'reference',
    });
    const exaggerated = buildDurationVolumeProfile(slices, {
      scaleSeconds: 3_600,
      exaggeration: 1.6,
      normalizationMode: 'reference',
    });

    expect(exaggerated[1]?.thickness).toBeGreaterThan(conservative[1]?.thickness ?? 0);
    expect(exaggerated.map((entry) => entry.index)).toEqual(conservative.map((entry) => entry.index));
    expect(exaggerated[2]?.opacity).toBeLessThanOrEqual(exaggerated[0]?.opacity ?? 1);
  });

  test('uses warp-adjusted duration when adaptive warp is enabled', () => {
    const warpedSlices = [
      { index: 0, startEpoch: 0, endEpoch: 50 },
      { index: 1, startEpoch: 50, endEpoch: 100 },
    ];

    const profile = buildDurationVolumeProfile(warpedSlices, {
      scaleSeconds: 50,
      exaggeration: 1,
      normalizationMode: 'reference',
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: new Float32Array([0, 10, 100]),
      warpDomain: [0, 100],
    });

    expect(profile).toHaveLength(2);
    expect(profile[0]?.durationSeconds).toBeCloseTo(10, 5);
    expect(profile[1]?.durationSeconds).toBeCloseTo(90, 5);
    expect(profile[1]?.thickness).toBeGreaterThan(profile[0]?.thickness ?? 0);
  });
});
