import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard-demo shell', () => {
  test('renders the demo shell through DashboardDemoShell', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/DashboardDemoShell/);
    expect(shellSource).toMatch(/WorkflowSkeleton/);
    expect(shellSource).toMatch(/MapVisualization/);
    expect(shellSource).toMatch(/CubeVisualization/);
    expect(shellSource).toMatch(/TimelinePanel/);
    expect(shellSource).toMatch(/DashboardStkdePanel/);
    expect(shellSource).toMatch(/loadRealData/);
    expect(shellSource).toMatch(/z-40/);
    expect(shellSource).toMatch(/Show map viewport/);
    expect(shellSource).toMatch(/Show cube viewport/);
    expect(shellSource).not.toMatch(/Map-first shared viewport|2D map|3D cube|generationStatus|lastGeneratedMetadata|Ready for applied state handoff|Applied state carried forward/);
  });

  test('keeps the stable dashboard route on Phase 1 composition', () => {
    const dashboardPageSource = readFileSync(new URL('../dashboard/page.tsx', import.meta.url), 'utf8');

    expect(dashboardPageSource).toMatch(/DashboardLayout/);
    expect(dashboardPageSource).toMatch(/MapVisualization/);
    expect(dashboardPageSource).toMatch(/CubeVisualization/);
    expect(dashboardPageSource).not.toMatch(/DashboardDemoShell|Map-first shared viewport|WorkflowSkeleton/);
  });

  test('keeps applied-state text inside the STKDE panel instead of the viewport shell', () => {
    const stkdePanelSource = readFileSync(new URL('../../components/stkde/DashboardStkdePanel.tsx', import.meta.url), 'utf8');

    expect(stkdePanelSource).toMatch(/Applied state carried forward|No applied state yet/);
    expect(stkdePanelSource).not.toMatch(/Ready for applied state handoff/);
  });

  test('keeps the timeslicing workflow shell separate from the demo chrome', () => {
    const timeslicingPageSource = readFileSync(new URL('../timeslicing/page.tsx', import.meta.url), 'utf8');
    const workflowShellSource = readFileSync(
      new URL('../timeslicing/components/TimeslicingWorkflowShell.tsx', import.meta.url),
      'utf8'
    );

    expect(workflowShellSource).toMatch(/Workflow shell/);
    expect(workflowShellSource).toMatch(/Generate → Review → Apply/);
    expect(timeslicingPageSource).not.toMatch(/DashboardDemoShell|Map-first shared viewport|WorkflowSkeleton/);
  });
});
