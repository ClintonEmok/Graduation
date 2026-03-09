import { describe, expect, it } from 'vitest';
import { toDisplaySeconds, toLinearSeconds } from '@/components/timeline/hooks/useScaleTransforms';

describe('useScaleTransforms', () => {
  const warpDomain: [number, number] = [0, 100];
  const identityWarpMap = new Float32Array([0, 25, 50, 75, 100]);
  const shiftedWarpMap = new Float32Array([0, 35, 60, 85, 100]);

  it('keeps display seconds linear when warp factor is zero', () => {
    const linearSec = 42;
    const displaySec = toDisplaySeconds(linearSec, 0, shiftedWarpMap, warpDomain);
    expect(displaySec).toBe(linearSec);
  });

  it('follows warp map interpolation when warp factor is one', () => {
    const displaySec = toDisplaySeconds(25, 1, shiftedWarpMap, warpDomain);
    expect(displaySec).toBeCloseTo(35, 6);
  });

  it('round-trips display-to-linear conversion for adaptive mode', () => {
    const linearSec = 25;
    const displaySec = toDisplaySeconds(linearSec, 1, shiftedWarpMap, warpDomain);
    const recoveredLinear = toLinearSeconds(displaySec, [0, 100], 1, shiftedWarpMap, warpDomain);

    expect(recoveredLinear).toBeCloseTo(linearSec, 3);
  });

  it('matches identity behavior with an identity warp map', () => {
    const linearSec = 73;
    const displaySec = toDisplaySeconds(linearSec, 1, identityWarpMap, warpDomain);
    const recoveredLinear = toLinearSeconds(displaySec, [0, 100], 1, identityWarpMap, warpDomain);

    expect(displaySec).toBeCloseTo(linearSec, 6);
    expect(recoveredLinear).toBeCloseTo(linearSec, 3);
  });
});
