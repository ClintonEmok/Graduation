/* @vitest-environment node */
import { beforeEach, describe, expect, test } from 'vitest';

import { useAdaptiveStore } from './useAdaptiveStore';

describe('useAdaptiveStore warp control contract', () => {
  test('exposes automatic/manual controls for deferred warp UI wiring', () => {
    const state = useAdaptiveStore.getState();

    expect(state.warpControlMode).toBe('automatic');
    expect(state.warpGranularity).toBe('daily');
    expect(state.peerRelativeWarping).toBe(true);
    expect(state.manualWarpWeightOverrides).toEqual({});

    state.setWarpControlMode('manual');
    state.setWarpGranularity('weekly');
    state.setPeerRelativeWarping(false);
    state.setManualWarpWeightOverride('bin-a', 2.5);

    expect(useAdaptiveStore.getState().warpControlMode).toBe('manual');
    expect(useAdaptiveStore.getState().warpGranularity).toBe('weekly');
    expect(useAdaptiveStore.getState().peerRelativeWarping).toBe(false);
    expect(useAdaptiveStore.getState().manualWarpWeightOverrides).toEqual({ 'bin-a': 2.5 });

    state.clearManualWarpWeightOverrides();
    expect(useAdaptiveStore.getState().manualWarpWeightOverrides).toEqual({});
  });
});

describe('useAdaptiveStore public surface', () => {
  beforeEach(() => {
    useAdaptiveStore.setState({ activeSignalSource: 'density' });
  });

  test('switching activeSignalSource does not add or remove any other state keys', () => {
    const keysBefore = Object.keys(useAdaptiveStore.getState()).sort();
    expect(keysBefore).toContain('activeSignalSource');
    useAdaptiveStore.setState({ activeSignalSource: 'contextual' });
    const keysAfter = Object.keys(useAdaptiveStore.getState()).sort();
    expect(keysAfter).toEqual(keysBefore); // same keys, only the value changed
    useAdaptiveStore.setState({ activeSignalSource: 'density' });
    expect(Object.keys(useAdaptiveStore.getState()).sort()).toEqual(keysBefore);
  });

  test('setActiveSignalSource action is a function on the store', () => {
    expect(typeof useAdaptiveStore.getState().setActiveSignalSource).toBe('function');
  });

  test('activeSignalSource defaults to density', () => {
    expect(useAdaptiveStore.getState().activeSignalSource).toBe('density');
  });
});
