import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Phase 13 / DemoTimelinePanel contract', () => {
  test('keeps the timeline panel as a pure visualization surface', () => {
    const panelSource = readFileSync(new URL('../dashboard-demo/DemoTimelinePanel.tsx', import.meta.url), 'utf8');

    expect(panelSource).toMatch(/DemoDualTimeline/);
    expect(panelSource).toMatch(/border-t border-border bg-card\/70/);
    expect(panelSource).not.toMatch(/Temporal Resolution|Time Scale|Warp source|Warp factor|Settings2|ChevronRight/);
  });
});
