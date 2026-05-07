import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('DemoEvolutionPanel source contract', () => {
  test('exposes playback and stepping controls', () => {
    const panelSource = readSource('./DemoEvolutionPanel.tsx');
    const hookSource = readSource('./lib/useDemoEvolutionSequence.ts');

    expect(panelSource).toContain('play/pause');
    expect(panelSource).toContain('Next');
    expect(panelSource).toContain('Previous');
    expect(hookSource).toContain('orderedSliceIds');
    expect(hookSource).toContain('nextSliceId');
    expect(hookSource).toContain('previousSliceId');
    expect(panelSource).toContain('No slices available for evolution playback');
  });
});
