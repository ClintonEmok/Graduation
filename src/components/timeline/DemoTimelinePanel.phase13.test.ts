import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 13 / DemoTimelinePanel contract', () => {
  test('keeps compare framing and the primary driver story', () => {
    const panelSource = readFileSync(new URL('../dashboard-demo/DemoTimelinePanel.tsx', import.meta.url), 'utf8');
    const summarySource = readFileSync(new URL('./hooks/useDemoTimelineSummary.ts', import.meta.url), 'utf8');

    expect(panelSource).toMatch(/useDemoTimelineSummary/);
    expect(panelSource).toMatch(/Focused track above · raw baseline below/);
    expect(panelSource).toMatch(/Compare: \{summary\.compareLabel\}/);
    expect(panelSource).toMatch(/Scale: \{summary\.modeLabel\}/);
    expect(panelSource).toMatch(/Window: \{summary\.selectedWindowLabel\}/);
    expect(panelSource).toMatch(/Linked: \{summary\.linkedHighlightLabel\}/);
    expect(panelSource).toMatch(/Burst windows: \{summary\.burstLabel\}/);
    expect(panelSource).toMatch(/Linear|Adaptive/);

    expect(summarySource).toMatch(/useDashboardDemoSelectionStory/);
    expect(summarySource).toMatch(/primaryDriverLabel/);
    expect(summarySource).toMatch(/selectedWindowLabel/);
    expect(summarySource).toMatch(/linkedHighlightLabel/);
    expect(summarySource).toMatch(/compareLabel/);
    expect(summarySource).toMatch(/Adaptive|Linear/);
  });
});
