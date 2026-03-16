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
    expect(shellSource).toMatch(/useFilterStore\(\(state\) => state\.selectedTimeRange\)/);
    expect(shellSource).not.toMatch(/SELECTION_SETTLE_DELAY_MS/);
    expect(shellSource).not.toMatch(/setSettledSelectedTimeRange/);
    expect(shellSource).not.toMatch(/window\.setTimeout/);
    expect(shellSource).not.toMatch(/queryKey: \['crime-meta'\]/);
    expect(shellSource).not.toMatch(/fetch\('\/api\/crime\/meta'\)/);
    expect(shellSource).toMatch(/startEpoch: baseDomainStartSec/);
    expect(shellSource).toMatch(/endEpoch: baseDomainEndSec/);
    expect(shellSource).toMatch(/bufferDays: 30/);
    expect(shellSource).toMatch(/limit: 50000/);
    expect(shellSource).toMatch(/startEpoch: rangeStart/);
    expect(shellSource).toMatch(/endEpoch: rangeEnd/);
    expect(shellSource).toMatch(/bufferDays: 0/);
    expect(shellSource).toMatch(/limit: selectionDetailLimit/);
    expect(shellSource).toMatch(/buildSelectionDetailDataset/);
    expect(shellSource).toMatch(/Selection detail:/);
    expect(shellSource).toMatch(/Diagnostics detail:/);
    expect(shellSource).toMatch(/using context fallback/);
    expect(shellSource).toMatch(/const \[rangeStart, rangeEnd\] = useMemo/);
    expect(shellSource).toMatch(/detailRangeOverride=\{\[rangeStart, rangeEnd\]\}/);
    expect(shellSource).toMatch(/detailPointsOverride=\{selectionDetailDataset\.renderTimestamps\}/);
    expect(shellSource).toMatch(/tickLabelStrategy="span-aware"/);
    expect(shellSource).toMatch(/computeMaps\(timestamps, \[baseDomainStartSec, baseDomainEndSec\], \{ binningMode: selectedStrategy \}\)/);
    expect(shellSource).toMatch(/buildAdaptiveBinDiagnostics/);
    expect(shellSource).toMatch(/AdaptiveBinDiagnosticsPanel/);
    expect(shellSource).toMatch(/serializeTimeslicingAlgosSelection/);
    expect(shellSource).toMatch(/TimeslicingAlgosStrategyStats/);
    expect(shellSource).toMatch(/Timeline: \{dataDomainLabel\}/);
    expect(shellSource).toMatch(/Fetched: \{fetchedDomainLabel\}/);
    expect(shellSource).toMatch(/buildTimelineQaModel/);
    expect(shellSource).toMatch(/TimelineQaContextCard/);
    expect(shellSource).toMatch(/routeRole:\s*'timeslicing-algos'/);
    expect(shellSource).toMatch(/strategyLabel:\s*selectedStrategy/);
    expect(shellSource).toMatch(/timescaleLabel:\s*selectedTimeScale/);
    expect(shellSource).toMatch(/const hasEmptyData = !isLoading && !error && crimes.length === 0/);
    expect(shellSource).toMatch(/timeslicing-algos-empty-data/);
    expect(shellSource).toMatch(/No crime data returned for this timeline context\./);
  });

  test('renders a per-strategy stats widget below interaction controls', () => {
    const statsSource = readFileSync(new URL('./lib/TimeslicingAlgosStrategyStats.tsx', import.meta.url), 'utf8');
    expect(statsSource).toMatch(/Binning strategy stats/);
    expect(statsSource).toMatch(/Uniform Time/);
    expect(statsSource).toMatch(/Uniform Events/);
    expect(statsSource).toMatch(/Variance\/bin/);
    expect(statsSource).toMatch(/strategy-stats-widget/);
  });

  test('renders an algos-only adaptive bin diagnostics table from current route state', () => {
    const panelSource = readFileSync(new URL('./lib/AdaptiveBinDiagnosticsPanel.tsx', import.meta.url), 'utf8');
    expect(panelSource).toMatch(/Adaptive bin diagnostics/);
    expect(panelSource).toMatch(/adaptiveMultiplier/);
    expect(panelSource).toMatch(/Diagnostics source:/);
    expect(panelSource).toMatch(/Selection usage:/);
    expect(panelSource).toMatch(/Selection stride:/);
    expect(panelSource).toMatch(/Fallback:/);
    expect(panelSource).toMatch(/Diagnostics source preference:/);
    expect(panelSource).toMatch(/Strategy: \{selectedStrategy\}/);
    expect(panelSource).toMatch(/Interaction: \{selectedTimeScale\}/);
    expect(panelSource).toMatch(/adaptive-bin-diagnostics-panel/);

    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).toMatch(/rows=\{adaptiveDiagnosticsRows\}/);
    expect(shellSource).toMatch(/selectedTimeScale=\{selectedTimeScale\}/);
    expect(shellSource).toMatch(/diagnosticsSource=\{diagnosticsSource\}/);
    expect(shellSource).toMatch(/selectionUsed=\{diagnosticsSelectionUsed\}/);
    expect(shellSource).toMatch(/fallbackToContextReason=\{diagnosticsFallbackReason\}/);

    const timeslicingPageSource = readFileSync(new URL('../timeslicing/page.tsx', import.meta.url), 'utf8');
    expect(timeslicingPageSource).not.toMatch(/AdaptiveBinDiagnosticsPanel/);
  });

  test('stays focused and does not include suggestion workflow orchestration UI', () => {
    const shellSource = readFileSync(new URL('./lib/TimeslicingAlgosRouteShell.tsx', import.meta.url), 'utf8');
    expect(shellSource).not.toMatch(/SuggestionPanel/);
    expect(shellSource).not.toMatch(/SuggestionToolbar/);
    expect(shellSource).not.toMatch(/accept-full-auto-package/);
  });
});
