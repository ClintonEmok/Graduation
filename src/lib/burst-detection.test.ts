import { describe, expect, it } from 'vitest';
import { computeSpatialBBinned } from './burst-detection';

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
