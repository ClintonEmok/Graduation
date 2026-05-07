import { describe, expect, test } from 'vitest';
import { bucketCrimeRecordsByShape, resolveCategoryShape, getCategoryShapeLabel } from './category-shapes';

describe('category-shapes', () => {
  test('maps crime types into stable shapes', () => {
    expect(resolveCategoryShape('THEFT')).toBe('sphere');
    expect(resolveCategoryShape('BATTERY')).toBe('cube');
    expect(resolveCategoryShape('NARCOTICS')).toBe('cone');
  });

  test('buckets crime records by shape', () => {
    const buckets = bucketCrimeRecordsByShape([
      { type: 'THEFT' } as any,
      { type: 'BATTERY' } as any,
      { type: 'NARCOTICS' } as any,
      { type: 'THEFT' } as any,
    ]);

    expect(buckets.sphere).toHaveLength(2);
    expect(buckets.cube).toHaveLength(1);
    expect(buckets.cone).toHaveLength(1);
  });

  test('labels the broad shapes consistently', () => {
    expect(getCategoryShapeLabel('sphere')).toBe('Property');
    expect(getCategoryShapeLabel('cube')).toBe('Violent');
    expect(getCategoryShapeLabel('cone')).toBe('Public order');
  });
});
