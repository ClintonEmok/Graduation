import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/timeslicing-algos route intent', () => {
  test('mounts TimeslicingAlgosRouteShell from page entry', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/TimeslicingAlgosRouteShell/);
  });

  test('exposes both binning mode controls in algorithm shell', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/uniform-time/);
    expect(shellSource).toMatch(/uniform-events/);
    expect(shellSource).toMatch(/algo-mode-controls/);
  });

  test('stays focused and does not include suggestion workflow orchestration UI', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).not.toMatch(/SuggestionPanel/);
    expect(shellSource).not.toMatch(/SuggestionToolbar/);
    expect(shellSource).not.toMatch(/accept-full-auto-package/);
  });
});
