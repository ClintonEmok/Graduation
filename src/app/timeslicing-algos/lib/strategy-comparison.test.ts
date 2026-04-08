import { describe, expect, test } from 'vitest';
import { buildStrategyComparison } from './strategy-comparison';
import { computeBinningStrategyStats } from './strategy-stats';

describe('buildStrategyComparison', () => {
  test('explains burst-heavy differences deterministically', () => {
    const timestamps = [
      5, 10, 12, 15, 18, 20,
      150, 151, 152, 153, 154, 155, 156, 157,
      160, 161, 162, 163, 164, 165, 166, 167,
      500, 700,
    ];

    const comparison = buildStrategyComparison(computeBinningStrategyStats(timestamps, [0, 960], 12));

    expect(comparison.headline).toContain('Uniform Time keeps the calendar legible');
    expect(comparison.bursts.preferredStrategy).toBe('uniform-events');
    expect(comparison.bursts.title).toBe('Best for burst identification');
    expect(comparison.quickDeltas).toEqual([
      expect.objectContaining({
        id: 'empty-bins',
        change: expect.stringContaining('fewer empty bins with Uniform Events'),
      }),
      expect.objectContaining({
        id: 'peak-bin',
        change: expect.stringContaining('fewer events in the busiest bin'),
      }),
      expect.objectContaining({
        id: 'width-spread',
        change: expect.stringContaining('more width remapping'),
      }),
    ]);
  });

  test('keeps comparison compact when the distribution is relatively even', () => {
    const timestamps = Array.from({ length: 24 }, (_, index) => index * 40 + 10);

    const comparison = buildStrategyComparison(computeBinningStrategyStats(timestamps, [0, 960], 12));

    expect(comparison.headline).toContain('Both strategies read similarly here');
    expect(comparison.summary).toContain('relatively even');
    expect(comparison.bursts.title).toBe('Burst emphasis is subtle in this context');
    expect(comparison.cards[1]?.summary).toContain('light remapping');
  });
});
