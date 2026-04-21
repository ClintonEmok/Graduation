import { describe, expect, it } from 'vitest';
import type { CrimeRecord } from '@/types/crime';
import { deriveBoundsFromCrimes } from '@/lib/bounds';

describe('deriveBoundsFromCrimes', () => {
  it('returns undefined when no finite lat/lon values exist', () => {
    const crimes = [
      { lat: Number.NaN, lon: -87.63 } as CrimeRecord,
      { lat: 41.88, lon: Number.POSITIVE_INFINITY } as CrimeRecord,
    ];

    expect(deriveBoundsFromCrimes(crimes)).toBeUndefined();
  });

  it('pads min/max bounds by 10% with a 0.01 floor', () => {
    const crimes = [
      { lat: 41.8, lon: -87.7 } as CrimeRecord,
      { lat: 42.0, lon: -87.5 } as CrimeRecord,
    ];

    const bounds = deriveBoundsFromCrimes(crimes);

    expect(bounds).toBeDefined();
    expect(bounds?.minLat).toBeCloseTo(41.78, 6);
    expect(bounds?.maxLat).toBeCloseTo(42.02, 6);
    expect(bounds?.minLon).toBeCloseTo(-87.72, 6);
    expect(bounds?.maxLon).toBeCloseTo(-87.48, 6);
  });
});
