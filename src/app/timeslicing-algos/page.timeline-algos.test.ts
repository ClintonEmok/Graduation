import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/timeslicing-algos route intent', () => {
  test('mounts TimeslicingAlgosRouteShell from page entry', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/TimeslicingAlgosRouteShell/);
  });

  test('exposes separate controls for strategy and interaction mode', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/TimeslicingAlgosInteractionControls/);

    const controlsSource = readFileSync(new URL('./lib/TimeslicingAlgosInteractionControls.tsx', import.meta.url), 'utf8');
    expect(controlsSource).toMatch(/Binning strategy/);
    expect(controlsSource).toMatch(/Timeline interaction mode/);

    const optionsSource = readFileSync(new URL('./lib/algorithm-options.ts', import.meta.url), 'utf8');
    expect(optionsSource).toMatch(/uniform-time/);
    expect(optionsSource).toMatch(/uniform-events/);
    expect(optionsSource).toMatch(/BINNING_STRATEGY_OPTIONS/);
  });

  test('wires timeline parity behavior and compute strategy selection', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/setTimeScaleMode/);
    expect(shellSource).toMatch(/selectedTimeScale === 'adaptive' && warpFactor === 0/);
    expect(shellSource).toMatch(/computeMaps\(timestamps, \[domainStartSec, domainEndSec\], \{ binningMode: selectedStrategy \}\)/);
    expect(shellSource).toMatch(/serializeTimeslicingAlgosSelection/);
    expect(shellSource).toMatch(/TimeslicingAlgosStrategyStats/);
  });

  test('renders a per-strategy stats widget below interaction controls', () => {
    const statsSource = readFileSync(new URL('./lib/TimeslicingAlgosStrategyStats.tsx', import.meta.url), 'utf8');
    expect(statsSource).toMatch(/Binning strategy stats/);
    expect(statsSource).toMatch(/Uniform Time/);
    expect(statsSource).toMatch(/Uniform Events/);
    expect(statsSource).toMatch(/Variance\/bin/);
    expect(statsSource).toMatch(/strategy-stats-widget/);
  });

  test('stays focused and does not include suggestion workflow orchestration UI', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).not.toMatch(/SuggestionPanel/);
    expect(shellSource).not.toMatch(/SuggestionToolbar/);
    expect(shellSource).not.toMatch(/accept-full-auto-package/);
  });
});
