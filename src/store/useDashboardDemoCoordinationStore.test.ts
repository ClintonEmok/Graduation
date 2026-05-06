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
    selectedDetailPeriod: null,
    detailsOpen: false,
    workflowPhase: 'generate',
    syncStatus: { status: 'synchronized' },
    panelNoMatch: {},
    comparisonSliceIds: { left: null, right: null },
    comparisonSelectionOrder: [],
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

  test('tracks detail period selection', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setSelectedDetailPeriod({
      id: 'detail-bin-1',
      startSec: 100,
      endSec: 200,
      count: 12,
      label: 'Jan 1 → Jan 5',
      renderMode: 'bins',
      summary: '12 crimes in this detail period',
    });

    expect(useDashboardDemoCoordinationStore.getState().selectedDetailPeriod?.id).toBe('detail-bin-1');

    store.clearSelectedDetailPeriod();

    expect(useDashboardDemoCoordinationStore.getState().selectedDetailPeriod).toBeNull();
  });

  test('manages a two-slot comparison pair', () => {
    const store = useDashboardDemoCoordinationStore.getState();

    store.setComparisonSliceId('left', 'slice-a');
    store.setComparisonSliceId('right', 'slice-b');

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-a',
      right: 'slice-b',
    });

    store.swapComparisonSlices();

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-b',
      right: 'slice-a',
    });

    store.pushComparisonSlice('slice-c');

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: 'slice-b',
      right: 'slice-c',
    });

    store.clearComparisonSlices();

    expect(useDashboardDemoCoordinationStore.getState().comparisonSliceIds).toEqual({
      left: null,
      right: null,
    });
  });
});
