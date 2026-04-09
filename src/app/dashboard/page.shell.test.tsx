import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard shell', () => {
  test('renders the map-first shared viewport with a fixed STKDE rail', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const layoutSource = readFileSync(new URL('../../components/layout/DashboardLayout.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/DashboardLayout/);
    expect(pageSource).toMatch(/MapVisualization/);
    expect(pageSource).toMatch(/CubeVisualization/);
    expect(pageSource).toMatch(/DashboardStkdePanel/);
    expect(pageSource).toMatch(/Map-first shared viewport/);
    expect(layoutSource).toMatch(/dashboard shared viewport swap target/);
  });

  test('keeps workflow chrome out of the final dashboard route', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).not.toMatch(/TimeslicingWorkflowShell|SuggestionToolbar|BinningControls|TimelineQaContextCard/);
  });
});
