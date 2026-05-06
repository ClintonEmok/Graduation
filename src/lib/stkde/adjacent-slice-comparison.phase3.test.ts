import { describe, expect, test } from 'vitest';
import { compareAdjacentSlices, type SliceComparisonInput } from './adjacent-slice-comparison';

const buildSnapshot = (overrides: Partial<SliceComparisonInput> = {}): SliceComparisonInput => ({
  sliceId: overrides.sliceId ?? 'slice-a',
  totalCount: overrides.totalCount ?? 24,
  typeCounts: overrides.typeCounts ?? {
    theft: 12,
    assault: 8,
    burglary: 4,
  },
  districtCounts: overrides.districtCounts ?? {
    north: 10,
    central: 8,
    south: 6,
  },
});

describe('compareAdjacentSlices', () => {
  test('returns a neutral comparison for missing inputs', () => {
    const result = compareAdjacentSlices(null, undefined);

    expect(result.countDelta).toBe(0);
    expect(result.densityRatio).toBe(1);
    expect(result.dominantTypeShift.left).toBeNull();
    expect(result.dominantTypeShift.right).toBeNull();
    expect(result.districtOverlap.ratio).toBe(0);
    expect(result.hotspotDelta.delta).toBe(0);
  });

  test('summarizes adjacent slice differences deterministically', () => {
    const left = buildSnapshot({
      sliceId: 'slice-left',
      totalCount: 20,
      typeCounts: {
        theft: 10,
        burglary: 6,
        assault: 4,
      },
      districtCounts: {
        north: 10,
        west: 6,
        central: 4,
      },
    });

    const right = buildSnapshot({
      sliceId: 'slice-right',
      totalCount: 30,
      typeCounts: {
        assault: 14,
        theft: 10,
        burglary: 6,
      },
      districtCounts: {
        north: 8,
        central: 10,
        south: 12,
      },
    });

    const result = compareAdjacentSlices(left, right);

    expect(result.countDelta).toBe(10);
    expect(result.densityRatio).toBeCloseTo(1.5, 2);
    expect(result.dominantTypeShift.left).toBe('theft');
    expect(result.dominantTypeShift.right).toBe('assault');
    expect(result.districtOverlap.shared).toEqual(['central', 'north']);
    expect(result.hotspotDelta.delta).toBe(2);
  });
});
