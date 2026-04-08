import { describe, expect, test } from 'vitest';
import { projectHotspots } from './stkdeHotspot.worker';

const hotspots = [
  {
    id: 'a',
    centroidLng: -87.63,
    centroidLat: 41.88,
    intensityScore: 0.91,
    supportCount: 22,
    peakStartEpochSec: 1_700_010_000,
    peakEndEpochSec: 1_700_020_000,
    radiusMeters: 750,
  },
  {
    id: 'b',
    centroidLng: -87.70,
    centroidLat: 41.75,
    intensityScore: 0.45,
    supportCount: 5,
    peakStartEpochSec: 1_700_030_000,
    peakEndEpochSec: 1_700_040_000,
    radiusMeters: 750,
  },
  {
    id: 'c',
    centroidLng: -87.64,
    centroidLat: 41.89,
    intensityScore: 0.8,
    supportCount: 12,
    peakStartEpochSec: 1_700_000_000,
    peakEndEpochSec: 1_700_005_000,
    radiusMeters: 750,
  },
];

describe('projectHotspots', () => {
  test('filters and sorts hotspots for panel projection', () => {
    const output = projectHotspots({
      requestId: 7,
      hotspots,
      filters: {
        minIntensity: 0.5,
        minSupport: 10,
      },
    });

    expect(output.requestId).toBe(7);
    expect(output.rows.map((row) => row.id)).toEqual(['a', 'c']);
  });

  test('applies temporal and spatial filters', () => {
    const output = projectHotspots({
      requestId: 9,
      hotspots,
      filters: {
        temporalWindow: [1_700_000_000, 1_700_015_000],
        spatialBbox: [-87.66, 41.86, -87.60, 41.90],
      },
    });

    expect(output.rows.map((row) => row.id)).toEqual(['a', 'c']);

    const output2 = projectHotspots({
      requestId: 10,
      hotspots,
      filters: {
        temporalWindow: [1_700_018_000, 1_700_025_000],
      },
    });
    expect(output2.rows.map((row) => row.id)).toEqual(['a']);
  });
});
