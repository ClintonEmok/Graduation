import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/timeslicing workflow shell', () => {
  test('wraps the route in an isolated workflow shell with linear steps', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('./components/TimeslicingWorkflowShell.tsx', import.meta.url), 'utf8');

    expect(pageSource).toMatch(/TimeslicingWorkflowShell/);
    expect(shellSource).toMatch(/Generate/);
    expect(shellSource).toMatch(/Review/);
    expect(shellSource).toMatch(/Apply/);
    expect(pageSource).toMatch(/TimelineQaContextCard/);
    expect(pageSource).toMatch(/shouldAutoAdvanceToReview/);
  });

  test('keeps dashboard-only chrome out of the workflow route', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    expect(pageSource).not.toMatch(/DashboardHeader|DashboardStkdePanel|ContextualSlicePanel/);
  });
});
