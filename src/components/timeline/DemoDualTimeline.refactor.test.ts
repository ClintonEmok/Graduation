import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DemoDualTimeline refactor wiring', () => {
  it('reuses the shared timeline surface and view model', () => {
    const source = readFileSync(new URL('./DemoDualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/DualTimelineSurface/);
    expect(source).toMatch(/useDualTimelineViewModel/);
    expect(source).not.toMatch(/useDualTimelineScales/);
    expect(source).not.toMatch(/formatDateByResolution/);
  });

  it('keeps demo-specific warp wiring intact while dropping duplicate render chrome', () => {
    const source = readFileSync(new URL('./DemoDualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/buildDemoSliceAuthoredWarpMap/);
    expect(source).toMatch(/useDashboardDemoWarpStore/);
    expect(source).toMatch(/overviewSliceBoxes/);
    expect(source).toMatch(/detailInteractionScale/);
    expect(source).toMatch(/return <DualTimelineSurface \{\.\.\.surfaceProps\} \/>;/);
  });

  it('is materially smaller than the original monolith', () => {
    const source = readFileSync(new URL('./DemoDualTimeline.tsx', import.meta.url), 'utf8');

    expect(source.split('\n').length).toBeLessThan(1500);
  });
});
