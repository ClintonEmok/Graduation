import { describe, expect, it } from 'vitest';
import { sampleTimelinePoints, selectTimelinePointsInRange } from '@/lib/timeline-series';

describe('timeline-series', () => {
  it('samples an overview series by stride', () => {
    const values = Array.from({ length: 10 }, (_, index) => index + 1);
    expect(sampleTimelinePoints(values, 4)).toEqual([1, 4, 7, 10]);
  });

  it('keeps detail points at full resolution within the selected range', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(selectTimelinePointsInRange(values, [3, 7])).toEqual([3, 4, 5, 6, 7]);
  });

  it('normalizes reversed ranges before selection', () => {
    const values = [1, 2, 3, 4, 5];
    expect(selectTimelinePointsInRange(values, [5, 2])).toEqual([2, 3, 4, 5]);
  });
});
