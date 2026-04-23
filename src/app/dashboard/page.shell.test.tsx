import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard shell', () => {
  test('keeps the phase-1 overview shell composition', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/DashboardLayout/);
    expect(pageSource).toMatch(/MapVisualization/);
    expect(pageSource).toMatch(/CubeVisualization/);
    expect(pageSource).toMatch(/DashboardHeader/);
    expect(pageSource).toMatch(/ContextualSlicePanel/);
  });

  test('does not include dashboard-demo rail chrome', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).not.toMatch(/DashboardStkdePanel|Map-first shared viewport|2D map|3D cube|DemoExplainPanel|WorkflowSkeleton|DemoTimelinePanel/);
  });
});
