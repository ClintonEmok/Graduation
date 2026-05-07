import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 6 category shape contract', () => {
  test('locks the cube shape-encoding path', () => {
    const rendererSource = readFileSync(new URL('./SimpleCrimePoints.tsx', import.meta.url), 'utf8');
    const helperSource = readFileSync(new URL('../../lib/category-shapes.ts', import.meta.url), 'utf8');

    expect(helperSource).toMatch(/sphere/);
    expect(helperSource).toMatch(/cube/);
    expect(helperSource).toMatch(/cone/);
    expect(helperSource).toMatch(/bucketCrimeRecordsByShape/);
    expect(helperSource).toMatch(/resolveCategoryShape/);

    expect(rendererSource).toMatch(/sphereGeometry/);
    expect(rendererSource).toMatch(/boxGeometry/);
    expect(rendererSource).toMatch(/coneGeometry/);
    expect(rendererSource).toMatch(/selectedTypes/);
    expect(rendererSource).toMatch(/selectedDistricts/);
    expect(rendererSource).toMatch(/selectedSpatialBounds/);
  });
});
