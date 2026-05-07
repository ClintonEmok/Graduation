import { describe, expect, test } from 'vitest';
import { buildDemoEvolutionSequence } from './useDemoEvolutionSequence';

describe('buildDemoEvolutionSequence', () => {
  test('orders visible slices, derives active step, and clamps traversal', () => {
    const result = buildDemoEvolutionSequence({
      currentTime: 42,
      slices: [
        { id: 'slice-c', type: 'point', time: 75, isVisible: true },
        { id: 'slice-a', type: 'point', time: 10, isVisible: true },
        { id: 'slice-b', type: 'range', time: 40, range: [35, 45], isVisible: true },
        { id: 'slice-hidden', type: 'point', time: 20, isVisible: false },
      ],
      isPlaying: false,
      speed: 1,
    });

    expect(result.orderedSliceIds).toEqual(['slice-a', 'slice-b', 'slice-c']);
    expect(result.activeSliceId).toBe('slice-b');
    expect(result.nextSliceId).toBe('slice-c');
    expect(result.previousSliceId).toBe('slice-a');
    expect(result.playbackLabel).toContain('step 2 of 3');
  });

  test('returns a neutral empty sequence when nothing is visible', () => {
    const result = buildDemoEvolutionSequence({
      currentTime: 42,
      slices: [
        { id: 'slice-hidden', type: 'point', time: 20, isVisible: false },
      ],
      isPlaying: false,
      speed: 1,
    });

    expect(result.orderedSliceIds).toHaveLength(0);
    expect(result.activeSliceId).toBeNull();
    expect(result.nextSliceId).toBeNull();
    expect(result.previousSliceId).toBeNull();
    expect(result.playbackLabel).toContain('No slices available');
  });
});
