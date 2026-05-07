import { describe, expect, test } from 'vitest';
import { buildCategoryLegendEntries } from './category-legend';

describe('buildCategoryLegendEntries', () => {
  const palette = {
    THEFT: '#ffd700',
    BATTERY: '#f59e0b',
    ASSAULT: '#ff4500',
    OTHER: '#ffffff',
  };

  test('returns no entries for empty records', () => {
    expect(buildCategoryLegendEntries([], palette)).toEqual([]);
  });

  test('counts records and preserves palette colors', () => {
    const entries = buildCategoryLegendEntries(
      [
        { type: 'THEFT' } as any,
        { type: 'THEFT' } as any,
        { type: 'ASSAULT' } as any,
      ],
      palette
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      typeId: 1,
      label: 'THEFT',
      count: 2,
      color: '#ffd700',
    });
    expect(entries[1]).toMatchObject({
      typeId: 5,
      label: 'ASSAULT',
      count: 1,
      color: '#ff4500',
    });
  });

  test('sorts deterministically when counts match', () => {
    const entries = buildCategoryLegendEntries(
      [
        { type: 'BATTERY' } as any,
        { type: 'ASSAULT' } as any,
      ],
      palette
    );

    expect(entries.map((entry) => entry.label)).toEqual(['ASSAULT', 'BATTERY']);
  });
});
