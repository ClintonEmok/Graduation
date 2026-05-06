import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('DemoComparisonPanel source contract', () => {
  test('exposes compare panel and shared diff metrics', () => {
    const panelSource = readSource('./DemoComparisonPanel.tsx');
    const railSource = readSource('./DashboardDemoRailTabs.tsx');

    expect(panelSource).toContain('compareAdjacentSlices');
    expect(panelSource).toContain('countDelta');
    expect(panelSource).toContain('densityRatio');
    expect(panelSource).toContain('Pick a left and right slice');
    expect(railSource).toContain('Compare');
    expect(railSource).toContain('DemoComparisonPanel');
  });
});
