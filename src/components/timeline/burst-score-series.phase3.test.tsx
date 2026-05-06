import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('BurstScoreRail contract', () => {
  test('threads burst score series into the timeline rail', () => {
    const demoDualTimelineSource = readSource('./DemoDualTimeline.tsx');
    const surfaceSource = readSource('./DualTimelineSurface.tsx');
    const railSource = readSource('./BurstScoreRail.tsx');

    expect(demoDualTimelineSource).toContain('burstScoreSeries');
    expect(surfaceSource).toContain('BurstScoreRail');
    expect(railSource).toContain('No burst scores yet');
    expect(railSource).toContain('Peak');
  });
});
