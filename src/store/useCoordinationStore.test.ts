import { beforeEach, describe, expect, test } from 'vitest';
import { useCoordinationStore, type WorkflowPhase } from './useCoordinationStore';

beforeEach(() => {
  useCoordinationStore.setState({
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

describe('useCoordinationStore', () => {
  test('last interaction wins when committing from map after timeline', () => {
    const store = useCoordinationStore.getState();

    store.commitSelection(4, 'timeline');
    const firstInteractionAt = useCoordinationStore.getState().lastInteractionAt;

    store.commitSelection(9, 'map');
    const state = useCoordinationStore.getState();

    expect(state.selectedIndex).toBe(9);
    expect(state.selectedSource).toBe('map');
    expect(state.lastInteractionSource).toBe('map');
    expect(state.lastInteractionAt).not.toBeNull();
    expect((state.lastInteractionAt ?? 0) >= (firstInteractionAt ?? 0)).toBe(true);
  });

  test('panel-local no-match preserves global selection and marks partial state', () => {
    const store = useCoordinationStore.getState();

    store.commitSelection(12, 'timeline');
    store.reconcileSelection({
      isValid: false,
      reason: 'Selected index not in current map viewport',
      panel: 'map',
    });

    const state = useCoordinationStore.getState();

    expect(state.selectedIndex).toBe(12);
    expect(state.selectedSource).toBe('timeline');
    expect(state.syncStatus.status).toBe('partial');
    expect(state.syncStatus.reason).toContain('not in current map viewport');
    expect(state.syncStatus.panel).toBe('map');
    expect(state.panelNoMatch.map?.reason).toContain('not in current map viewport');
  });

  test('clearSelection removes selection and stores invalidation reason for status strip', () => {
    const store = useCoordinationStore.getState();

    store.commitSelection(6, 'cube');
    store.clearSelection('Selection became globally invalid after workflow change');

    const state = useCoordinationStore.getState();

    expect(state.selectedIndex).toBeNull();
    expect(state.selectedSource).toBeNull();
    expect(state.syncStatus.status).toBe('partial');
    expect(state.syncStatus.reason).toContain('globally invalid');
  });

  test('workflow phase transitions persist generate review applied refine', () => {
    const phases: WorkflowPhase[] = ['generate', 'review', 'applied', 'refine'];

    for (const phase of phases) {
      useCoordinationStore.getState().setWorkflowPhase(phase);
      expect(useCoordinationStore.getState().workflowPhase).toBe(phase);
    }
  });
});
