import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard-demo shell', () => {
  test('renders map-first shared viewport and fixed STKDE rail using reused primitives', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/DashboardDemoShell/);
    expect(shellSource).toMatch(/MapVisualization/);
    expect(shellSource).toMatch(/CubeVisualization/);
    expect(shellSource).toMatch(/TimelinePanel/);
    expect(shellSource).toMatch(/DashboardStkdePanel/);
    expect(shellSource).toMatch(/Map-first shared viewport/);
    expect(shellSource).toMatch(/2D map/);
    expect(shellSource).toMatch(/3D cube/);
  });

  test('keeps demo orchestration isolated from timeslicing workflow shell', () => {
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');

    expect(shellSource).not.toMatch(/TimeslicingWorkflowShell|BinningControls|SuggestionToolbar/);
  });
});
