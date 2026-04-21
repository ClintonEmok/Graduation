import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DualTimeline tick rollout wiring', () => {
  it('keeps DualTimeline wired to the shared span-aware tick helper with a legacy fallback', () => {
    const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/tickLabelStrategy\?: TickLabelStrategy/);
    expect(source).toMatch(/tickLabelStrategy = 'legacy'/);
    expect(source).toMatch(/buildSpanAwareTicks/);
    expect(source).toMatch(/formatSpanAwareTickLabel/);
    expect(source).toMatch(/if \(tickLabelStrategy === 'span-aware'\)/);
    expect(source).toMatch(/hasLoadedDomain/);
  });

  it('requires explicit tick strategy ownership at all audited route callsites', () => {
    const timeslicingSource = readFileSync(new URL('../../app/timeslicing/page.tsx', import.meta.url), 'utf8');
    const algosSource = readFileSync(new URL('../../app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    const timelineTestSource = readFileSync(new URL('../../app/timeline-test/page.tsx', import.meta.url), 'utf8');
    const timelineTest3dSource = readFileSync(new URL('../../app/timeline-test-3d/page.tsx', import.meta.url), 'utf8');

    expect(timeslicingSource.match(/tickLabelStrategy="span-aware"/g)).toHaveLength(2);
    expect(algosSource).toMatch(/tickLabelStrategy="span-aware"/);
    expect(timelineTestSource).toMatch(/tickLabelStrategy="span-aware"/);
    expect(timelineTest3dSource).toMatch(/tickLabelStrategy="span-aware"/);
  });

  it('leaves dashboard on legacy behavior without new rollout wiring', () => {
    const timelinePanelSource = readFileSync(new URL('./TimelinePanel.tsx', import.meta.url), 'utf8');

    expect(timelinePanelSource).not.toMatch(/timelineSpanAwareTicks/);
    expect(timelinePanelSource).not.toMatch(/tickLabelStrategy=/);
  });
});
