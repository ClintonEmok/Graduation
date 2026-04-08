import { describe, expect, it } from 'vitest';
import {
  deriveDetailDensityMap,
  DETAIL_DENSITY_RECOMPUTE_MAX_DAYS,
} from '@/components/timeline/hooks/useDensityStripDerivation';

describe('useDensityStripDerivation', () => {
  it('recomputes density from detail points for short detail windows', () => {
    const densityMap = new Float32Array([0, 0.2, 0.4, 0.6, 0.8]);
    const shortRange: [number, number] = [0, 86_400 * 5];
    const detailPoints = [1000, 1200, 1400, 1600, 1800, 2000];

    const derived = deriveDetailDensityMap(detailPoints, shortRange, densityMap, 0, 86_400 * 365);

    expect(derived).not.toBeNull();
    expect(derived).toHaveLength(densityMap.length);
    expect(Array.from(derived ?? [])).not.toEqual(Array.from(densityMap));
  });

  it('falls back to density map slicing when detail window exceeds threshold', () => {
    const densityMap = new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    const domainStart = 0;
    const domainEnd = 86_400 * 365;
    const wideRange: [number, number] = [0, 86_400 * 120];
    const longWindowPoints = [86_400 * 10, 86_400 * 20, 86_400 * 30];

    const derived = deriveDetailDensityMap(longWindowPoints, wideRange, densityMap, domainStart, domainEnd);

    expect(DETAIL_DENSITY_RECOMPUTE_MAX_DAYS).toBe(60);
    expect(derived).not.toBeNull();
    const values = Array.from(derived ?? []);
    expect(values).toHaveLength(4);
    expect(values[0]).toBeCloseTo(0, 6);
    expect(values[1]).toBeCloseTo(0.1, 6);
    expect(values[2]).toBeCloseTo(0.2, 6);
    expect(values[3]).toBeCloseTo(0.3, 6);
  });
});
