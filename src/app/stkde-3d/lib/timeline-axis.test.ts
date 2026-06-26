/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  AXIS_HEIGHT,
  START_Y,
  resolveEpochFromWarpedY,
  resolveWarpedEpochY,
} from './timeline-axis';

describe('timeline-axis vertical mapping', () => {
  it('anchors linear epochs to the full axis height', () => {
    const settings = {
      timeScaleMode: 'linear' as const,
      warpBlend: 0,
      warpMap: null,
      warpDomain: [100, 200] as [number, number],
    };

    expect(resolveWarpedEpochY(100, START_Y, settings)).toBeCloseTo(START_Y, 6);
    expect(resolveWarpedEpochY(200, START_Y, settings)).toBeCloseTo(START_Y + AXIS_HEIGHT, 6);
    expect(resolveEpochFromWarpedY(START_Y, START_Y, settings)).toBeCloseTo(100, 6);
    expect(resolveEpochFromWarpedY(START_Y + AXIS_HEIGHT, START_Y, settings)).toBeCloseTo(200, 6);
  });

  it('round-trips warped epochs through the axis mapping', () => {
    const settings = {
      timeScaleMode: 'adaptive' as const,
      warpBlend: 1,
      warpMap: Float32Array.from([100, 125, 180, 200]),
      warpDomain: [100, 200] as [number, number],
    };

    const midY = resolveWarpedEpochY(150, START_Y, settings);
    expect(midY).toBeGreaterThan(START_Y);
    expect(midY).toBeLessThan(START_Y + AXIS_HEIGHT);
    expect(resolveEpochFromWarpedY(midY, START_Y, settings)).toBeCloseTo(150, 0);
  });
});
