/* @vitest-environment node */
import { describe, expect, test } from 'vitest';

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
