import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('timeslicing adaptive binning mode intent', () => {
  test('keeps uniform-events override on page computeMaps call', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/computeMaps\([\s\S]*?binningMode:\s*'uniform-events'/);
  });

  test('applies generated bins and routes directly to the dashboard', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/applyGeneratedBins/);
    expect(pageSource).toMatch(/push\('\/dashboard'\)/);
    expect(pageSource).not.toMatch(/confirmation screen|intermediate summary/i);
  });

  test('opts both DualTimeline callsites into span-aware tick labels', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource.match(/tickLabelStrategy="span-aware"/g)).toHaveLength(2);
  });
});
