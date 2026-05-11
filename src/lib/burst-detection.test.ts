import { describe, expect, it } from 'vitest';
import {
  allocateSlices,
  computeSpatialBBinned,
  resolveBurstMetricValue,
} from './burst-detection';

describe('computeSpatialBBinned', () => {
  it('keeps highly concentrated bins from collapsing when surprise is tiny', () => {
    const points = [
      { x: 0, z: 0 },
      { x: 0.1, z: 0.1 },
      { x: 0.2, z: 0.2 },
      { x: 0.3, z: 0.3 },
    ];

    const score = computeSpatialBBinned(points, points);

    expect(score).toBeCloseTo(0.25, 5);
  });

  it('stays bounded while still reacting to a different baseline', () => {
    const points = [
      { x: 0, z: 0 },
      { x: 0.1, z: 0.1 },
      { x: 0.2, z: 0.2 },
      { x: 0.3, z: 0.3 },
    ];

    const baselinePoints = [
      { x: 0, z: 0 },
      { x: 18, z: 18 },
      { x: -18, z: -18 },
      { x: 24, z: -24 },
      { x: -24, z: 24 },
      { x: 30, z: 0 },
      { x: 0, z: 30 },
    ];

    const score = computeSpatialBBinned(points, baselinePoints);

    expect(score).toBeGreaterThan(0.25);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('burst metric selection', () => {
  const bins = [
    { startEpoch: 0, endEpoch: 10, recordCount: 12, temporalB: 0.9, spatialB: 0.1, combinedB: 0.5 },
    { startEpoch: 10, endEpoch: 20, recordCount: 8, temporalB: 0.1, spatialB: 0.9, combinedB: 0.5 },
  ];

  it('resolves the requested metric from each burst bin', () => {
    expect(resolveBurstMetricValue(bins[0], 'temporal')).toBe(0.9);
    expect(resolveBurstMetricValue(bins[0], 'spatial')).toBe(0.1);
    expect(resolveBurstMetricValue(bins[0], 'combined')).toBe(0.5);
  });

  it('allocates slices according to the selected burst metric', () => {
    expect(allocateSlices(bins, 6, 'temporal')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 5 },
      { sourceBinIndex: 1, slicesAllocated: 1 },
    ]);

    expect(allocateSlices(bins, 6, 'spatial')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 1 },
      { sourceBinIndex: 1, slicesAllocated: 5 },
    ]);

    expect(allocateSlices(bins, 6, 'combined')).toEqual([
      { sourceBinIndex: 0, slicesAllocated: 3 },
      { sourceBinIndex: 1, slicesAllocated: 3 },
    ]);
  });
});
