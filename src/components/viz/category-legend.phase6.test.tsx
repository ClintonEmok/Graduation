import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 6 category legend contract', () => {
  test('locks dynamic data-driven legend wiring', () => {
    const sharedSource = readFileSync(new URL('./CrimeCategoryLegend.tsx', import.meta.url), 'utf8');
    const cubeSource = readFileSync(new URL('./SimpleCrimeLegend.tsx', import.meta.url), 'utf8');
    const mapSource = readFileSync(new URL('../map/MapTypeLegend.tsx', import.meta.url), 'utf8');

    expect(sharedSource).toMatch(/useCrimeData/);
    expect(sharedSource).toMatch(/buildCategoryLegendEntries/);
    expect(sharedSource).toMatch(/selectedTypes/);
    expect(sharedSource).toMatch(/onToggleType/);

    expect(cubeSource).toMatch(/CrimeCategoryLegend/);
    expect(cubeSource).not.toMatch(/ORDERED_TYPES/);

    expect(mapSource).toMatch(/CrimeCategoryLegend/);
    expect(mapSource).not.toMatch(/ORDERED_TYPES/);
  });
});
