import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DualTimeline tick rollout wiring', () => {
  it('keeps DualTimeline wired to the shared timeline surface and view model', () => {
    const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/DualTimelineSurface/);
    expect(source).toMatch(/useDualTimelineViewModel/);
    expect(source).not.toMatch(/useDualTimelineScales/);
    expect(source).not.toMatch(/formatDateByResolution/);
    expect(source).not.toMatch(/buildSpanAwareTicks/);
    expect(source).not.toMatch(/formatSpanAwareTickLabel/);
  });

  it('keeps the wrapper materially smaller than the original monolith', () => {
    const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');

    expect(source.split('\n').length).toBeLessThan(1150);
  });
});
