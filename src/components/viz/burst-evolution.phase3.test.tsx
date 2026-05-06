import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('BurstEvolutionOverlay contract', () => {
  test('wires the cube overlay and burst lifecycle helper', () => {
    const timeSlicesSource = readSource('./TimeSlices.tsx');
    const helperSource = readSource('../../lib/stkde/burst-evolution.ts');

    expect(timeSlicesSource).toContain('BurstEvolutionOverlay');
    expect(timeSlicesSource).toContain('selectedBurstWindows');
    expect(helperSource).toContain('connectorSegments');
  });
});
