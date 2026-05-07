import { describe, expect, test } from 'vitest';
import { buildEvolutionFlowModel, type EvolutionFlowSliceInput } from './evolution-flow';

const buildSlice = (overrides: Partial<EvolutionFlowSliceInput> = {}): EvolutionFlowSliceInput => ({
  id: overrides.id ?? 'slice-a',
  label: overrides.label ?? overrides.id ?? 'slice-a',
  type: overrides.type ?? 'point',
  time: overrides.time ?? 10,
  range: overrides.range,
  isVisible: overrides.isVisible ?? true,
});

describe('buildEvolutionFlowModel', () => {
  test('returns a neutral fallback without visible slices', () => {
    const result = buildEvolutionFlowModel({ slices: [], activeSliceId: null });

    expect(result.isNeutral).toBe(true);
    expect(result.flowSegments).toHaveLength(0);
    expect(result.orderedSliceIds).toHaveLength(0);
  });

  test('creates directional flow segments across visible slices', () => {
    const result = buildEvolutionFlowModel({
      slices: [
        buildSlice({ id: 'slice-c', label: 'C', time: 60 }),
        buildSlice({ id: 'slice-a', label: 'A', time: 10 }),
        buildSlice({ id: 'slice-b', label: 'B', type: 'range', time: 30, range: [25, 35] }),
        buildSlice({ id: 'slice-hidden', label: 'Hidden', time: 90, isVisible: false }),
      ],
      activeSliceId: 'slice-b',
    });

    expect(result.orderedSliceIds).toEqual(['slice-a', 'slice-b', 'slice-c']);
    expect(result.flowSegments.map((segment) => segment.id)).toEqual(['slice-a->slice-b', 'slice-b->slice-c']);
    expect(result.flowSegments[0]?.label).toContain('A → B');
    expect(result.flowSegments[1]?.direction).toBe('forward');
    expect(result.activeSliceId).toBe('slice-b');
  });
});
