import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('timeslicing adaptive binning mode intent', () => {
  test('keeps uniform-events override on page computeMaps call', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/computeMaps\([\s\S]*?binningMode:\s*'uniform-events'/);
  });
});
