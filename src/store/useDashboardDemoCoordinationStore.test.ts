import { beforeEach, describe, expect, test } from 'vitest';
import { useDashboardDemoCoordinationStore, type DemoBurstWindowSelection } from './useDashboardDemoCoordinationStore';

const createBurstWindow = (overrides: Partial<DemoBurstWindowSelection> = {}): DemoBurstWindowSelection => ({
  id: overrides.id ?? 'burst-a',
  start: overrides.start ?? 0,
  end: overrides.end ?? 100,
  metric: overrides.metric ?? 'density',
  peak: overrides.peak ?? 0.8,
  count: overrides.count ?? 12,
  duration: overrides.duration ?? 100,
  burstClass: overrides.burstClass ?? 'prolonged-peak',
  burstConfidence: overrides.burstConfidence ?? 0.9,
  burstScore: overrides.burstScore ?? 82,
  burstRationale: overrides.burstRationale ?? 'A sustained high activity window stands out from its neighborhood.',
  burstRuleVersion: overrides.burstRuleVersion ?? '1.0.0',
  burstProvenance: overrides.burstProvenance ?? 'demo',
  tieBreakReason: overrides.tieBreakReason ?? 'demo tie-break',
  thresholdSource: overrides.thresholdSource ?? 'global-thresholds',
  neighborhoodSummary: overrides.neighborhoodSummary ?? 'no-neighbors',
});

beforeEach(() => {
  useDashboardDemoCoordinationStore.setState({
    selectedIndex: null,
    selectedSource: null,
    lastInteractionAt: null,
    lastInteractionSource: null,
    brushRange: null,
    selectedBurstWindows: [],
    detailsOpen: false,
    workflowPhase: 'generate',
    syncStatus: { status: 'synchronized' },
    panelNoMatch: {},
  });
});

describe('useDashboardDemoCoordinationStore', () => {
  test('keeps burst selection singleton', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.toggleBurstWindow(createBurstWindow({ id: 'burst-a', burstClass: 'isolated-spike' }));
    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows).toHaveLength(1);
    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows[0]?.id).toBe('burst-a');

    store.toggleBurstWindow(createBurstWindow({ id: 'burst-b', burstClass: 'valley' }));
    const state = useDashboardDemoCoordinationStore.getState();

    expect(state.selectedBurstWindows).toHaveLength(1);
    expect(state.selectedBurstWindows[0]?.id).toBe('burst-b');
    expect(state.selectedBurstWindows[0]?.burstClass).toBe('valley');
  });

  test('clears burst selection explicitly', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.toggleBurstWindow(createBurstWindow());
    store.clearSelectedBurstWindows();

    expect(useDashboardDemoCoordinationStore.getState().selectedBurstWindows).toHaveLength(0);
  });
});
