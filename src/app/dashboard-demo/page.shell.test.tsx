import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard-demo shell', () => {
  test('renders the demo shell through DashboardDemoShell', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');
    const demoTimelinePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoTimelinePanel.tsx', import.meta.url),
      'utf8'
    );
    const demoDualTimelineSource = readFileSync(
      new URL('../../components/timeline/DemoDualTimeline.tsx', import.meta.url),
      'utf8'
    );

    expect(pageSource).toMatch(/DashboardDemoShell/);
    expect(shellSource).toMatch(/WorkflowSkeleton/);
    expect(shellSource).toMatch(/MapVisualization/);
    expect(shellSource).toMatch(/CubeVisualization/);
    expect(shellSource).toMatch(/DemoTimelinePanel/);
    expect(shellSource).toMatch(/DashboardStkdePanel/);
    expect(shellSource).toMatch(/loadRealData/);
    expect(shellSource).toMatch(/z-40/);
    expect(shellSource).toMatch(/Show map viewport/);
    expect(shellSource).toMatch(/Show cube viewport/);
    expect(shellSource).not.toMatch(/Map-first shared viewport|2D map|3D cube|generationStatus|lastGeneratedMetadata|\bTimelinePanel\b/);
    expect(demoTimelinePanelSource).toMatch(/DemoDualTimeline/);
    expect(demoTimelinePanelSource).toMatch(/useSliceStore/);
    expect(demoTimelinePanelSource).toMatch(/useTimeslicingModeStore/);
    expect(demoTimelinePanelSource).toMatch(/Collapsible slice editing layer/);
    expect(demoDualTimelineSource).toMatch(/DualTimeline/);
    expect(demoDualTimelineSource).toMatch(/disableAutoBurstSlices/);
  });

  test('keeps the stable dashboard route on Phase 1 composition', () => {
    const dashboardPageSource = readFileSync(new URL('../dashboard/page.tsx', import.meta.url), 'utf8');

    expect(dashboardPageSource).toMatch(/DashboardLayout/);
    expect(dashboardPageSource).toMatch(/MapVisualization/);
    expect(dashboardPageSource).toMatch(/CubeVisualization/);
    expect(dashboardPageSource).toMatch(/TimelinePanel/);
    expect(dashboardPageSource).not.toMatch(/DashboardDemoShell|DemoTimelinePanel|DemoDualTimeline|Map-first shared viewport|WorkflowSkeleton/);
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
