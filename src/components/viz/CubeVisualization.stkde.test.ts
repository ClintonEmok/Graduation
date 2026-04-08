import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('CubeVisualization STKDE context wiring', () => {
  test('renders STKDE context heading and provenance tokens', () => {
    const source = readFileSync(new URL('./CubeVisualization.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/STKDE Context/);
    expect(source).toMatch(/requested=/);
    expect(source).toMatch(/effective=/);
  });

  test('includes fallback copy when no hotspot is selected', () => {
    const source = readFileSync(new URL('./CubeVisualization.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/No hotspot selected/);
  });
});
