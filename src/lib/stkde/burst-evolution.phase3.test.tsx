import { describe, expect, test } from 'vitest';
import { buildBurstEvolutionModel, type BurstEvolutionSliceInput, type BurstEvolutionWindowInput } from './burst-evolution';

const buildSlice = (overrides: Partial<BurstEvolutionSliceInput> = {}): BurstEvolutionSliceInput => ({
  id: overrides.id ?? 'slice-a',
  name: overrides.name ?? 'Slice A',
  type: overrides.type ?? 'point',
  time: overrides.time ?? 20,
  range: overrides.range,
  isVisible: overrides.isVisible ?? true,
  isBurst: overrides.isBurst ?? true,
  burstScore: overrides.burstScore ?? 60,
  burstClass: overrides.burstClass ?? 'prolonged-peak',
});

const buildWindow = (overrides: Partial<BurstEvolutionWindowInput> = {}): BurstEvolutionWindowInput => ({
  id: overrides.id ?? 'window-a',
  start: overrides.start ?? 10,
  end: overrides.end ?? 40,
  burstScore: overrides.burstScore ?? 78,
  burstClass: overrides.burstClass ?? 'isolated-spike',
});

describe('buildBurstEvolutionModel', () => {
  test('returns a neutral path when nothing is selected', () => {
    const result = buildBurstEvolutionModel({ slices: [], burstWindows: [] });

    expect(result.isNeutral).toBe(true);
    expect(result.connectorSegments).toHaveLength(0);
    expect(result.sliceNodes).toHaveLength(0);
  });

  test('builds deterministic connector segments across visible slices', () => {
    const result = buildBurstEvolutionModel({
      slices: [
        buildSlice({ id: 'slice-a', name: 'A', time: 12, burstScore: 40 }),
        buildSlice({ id: 'slice-b', name: 'B', time: 22, burstScore: 80 }),
        buildSlice({ id: 'slice-hidden', name: 'Hidden', time: 30, isVisible: false, burstScore: 95 }),
        buildSlice({ id: 'slice-c', name: 'C', time: 34, burstScore: 55 }),
      ],
      burstWindows: [buildWindow({ id: 'window-a', start: 10, end: 35, burstScore: 78 })],
    });

    expect(result.sliceNodes.map((node) => node.id)).toEqual(['slice-a', 'slice-b', 'slice-c']);
    expect(result.sliceNodes.map((node) => node.normalizedScore)).toEqual([0.5, 1, 0.6875]);
    expect(result.connectorSegments.map((segment) => `${segment.fromId}->${segment.toId}`)).toEqual([
      'slice-a->slice-b',
      'slice-b->slice-c',
    ]);
    expect(result.strongestScore).toBe(80);
  });
});
