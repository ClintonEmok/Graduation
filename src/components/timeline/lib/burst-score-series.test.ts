import { describe, expect, test } from 'vitest';
import { buildBurstScoreSeries, type BurstScoreGeometryInput } from './burst-score-series';

const buildGeometry = (overrides: Partial<BurstScoreGeometryInput> = {}): BurstScoreGeometryInput => ({
  id: overrides.id ?? 'slice-a',
  label: overrides.label ?? 'Slice A',
  left: overrides.left ?? 0,
  width: overrides.width ?? 12,
  isActive: overrides.isActive ?? false,
  isBurst: overrides.isBurst ?? false,
  burstScore: overrides.burstScore,
});

describe('buildBurstScoreSeries', () => {
  test('falls back to a neutral baseline when scores are missing', () => {
    const series = buildBurstScoreSeries([
      buildGeometry({ id: 'slice-a', label: 'A', left: 0, burstScore: undefined }),
      buildGeometry({ id: 'slice-b', label: 'B', left: 12, burstScore: undefined }),
    ]);

    expect(series.map((entry) => entry.score)).toEqual([0, 0]);
    expect(series.every((entry) => entry.normalizedScore === 0)).toBe(true);
  });

  test('sorts visible geometries and normalizes the strongest burst score', () => {
    const series = buildBurstScoreSeries([
      buildGeometry({ id: 'slice-c', label: 'C', left: 24, burstScore: 45, isBurst: true }),
      buildGeometry({ id: 'slice-a', label: 'A', left: 0, burstScore: 15 }),
      buildGeometry({ id: 'slice-b', label: 'B', left: 12, burstScore: 30, isActive: true }),
    ]);

    expect(series.map((entry) => entry.id)).toEqual(['slice-a', 'slice-b', 'slice-c']);
    expect(series.map((entry) => entry.normalizedScore)).toEqual([1 / 3, 2 / 3, 1]);
    expect(series[2]?.isBurst).toBe(true);
    expect(series[1]?.isActive).toBe(true);
  });
});
