import { describe, expect, it } from 'vitest';
import {
  getSelectionThresholdSeconds,
  resolveNearestSelectionIndex,
  resolvePointerPosition,
  type NearestSelectionResult,
} from '@/components/timeline/hooks/usePointSelection';

describe('usePointSelection', () => {
  it('keeps threshold semantics as max(rangeSpan * 0.01, 60)', () => {
    expect(getSelectionThresholdSeconds([0, 10_000])).toBe(100);
    expect(getSelectionThresholdSeconds([0, 1_000])).toBe(60);
    expect(getSelectionThresholdSeconds([500, 500])).toBe(60);
  });

  it('selects nearest index when distance is inside threshold', () => {
    const nearest: NearestSelectionResult = {
      index: 7,
      distance: 80,
      point: { timestampSec: 1_000 },
    };

    expect(resolveNearestSelectionIndex(nearest, [0, 10_000])).toBe(7);
  });

  it('clears selection when nearest distance is outside threshold', () => {
    const nearest: NearestSelectionResult = {
      index: 4,
      distance: 101,
      point: { timestampSec: 1_000 },
    };

    expect(resolveNearestSelectionIndex(nearest, [0, 10_000])).toBeNull();
  });

  it('behaves safely when nearest data is empty', () => {
    expect(resolveNearestSelectionIndex(null, [0, 10_000])).toBeNull();
  });

  it('ignores invalid pointer coordinates safely', () => {
    const invert = (x: number) => new Date(x * 1_000);
    expect(resolvePointerPosition(Number.NaN, 10, 100, invert)).toBeNull();
    expect(resolvePointerPosition(30, Number.NaN, 100, invert)).toBeNull();
    expect(resolvePointerPosition(30, 10, 0, invert)).toBeNull();
  });
});
