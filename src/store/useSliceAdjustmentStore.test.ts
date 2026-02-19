import { beforeEach, describe, expect, test } from 'vitest';
import { useSliceAdjustmentStore } from './useSliceAdjustmentStore';

const resetStore = () => {
  useSliceAdjustmentStore.setState({
    draggingSliceId: null,
    draggingHandle: null,
    hoverSliceId: null,
    hoverHandle: null,
    tooltip: null,
    limitCue: 'none',
    modifierBypass: false,
    snapEnabled: true,
    snapMode: 'adaptive',
    fixedSnapPresetSec: null,
  });
};

describe('useSliceAdjustmentStore', () => {
  beforeEach(() => {
    resetStore();
  });

  test('initializes with snap enabled and adaptive mode', () => {
    const state = useSliceAdjustmentStore.getState();

    expect(state.snapEnabled).toBe(true);
    expect(state.snapMode).toBe('adaptive');
    expect(state.fixedSnapPresetSec).toBeNull();
    expect(state.limitCue).toBe('none');
    expect(state.draggingSliceId).toBeNull();
    expect(state.tooltip).toBeNull();
  });

  test('beginDrag seeds drag and hover lifecycle state', () => {
    useSliceAdjustmentStore.getState().beginDrag({
      sliceId: 'slice-1',
      handle: 'start',
    });

    const state = useSliceAdjustmentStore.getState();
    expect(state.draggingSliceId).toBe('slice-1');
    expect(state.draggingHandle).toBe('start');
    expect(state.hoverSliceId).toBe('slice-1');
    expect(state.hoverHandle).toBe('start');
    expect(state.limitCue).toBe('none');
    expect(state.modifierBypass).toBe(false);
  });

  test('updateTooltip and updateDrag expose live feedback fields', () => {
    const store = useSliceAdjustmentStore.getState();
    store.beginDrag({ sliceId: 'slice-2', handle: 'end' });

    store.updateTooltip({
      x: 120,
      y: 32,
      boundarySec: 420,
      durationSec: 180,
      label: '07:00 - 10:00',
      snapState: 'snapped',
    });
    store.updateDrag({ limitCue: 'minDuration', modifierBypass: true });

    const state = useSliceAdjustmentStore.getState();
    expect(state.tooltip).toEqual({
      x: 120,
      y: 32,
      boundarySec: 420,
      durationSec: 180,
      label: '07:00 - 10:00',
      snapState: 'snapped',
    });
    expect(state.limitCue).toBe('minDuration');
    expect(state.modifierBypass).toBe(true);
  });

  test('setSnap updates enabled flag, mode, and fixed preset', () => {
    const store = useSliceAdjustmentStore.getState();
    store.setSnap({ snapEnabled: false });
    store.setSnap({ snapMode: 'fixed', fixedSnapPresetSec: 300 });

    let state = useSliceAdjustmentStore.getState();
    expect(state.snapEnabled).toBe(false);
    expect(state.snapMode).toBe('fixed');
    expect(state.fixedSnapPresetSec).toBe(300);

    store.setSnap({ fixedSnapPresetSec: null, snapMode: 'adaptive' });
    state = useSliceAdjustmentStore.getState();
    expect(state.snapMode).toBe('adaptive');
    expect(state.fixedSnapPresetSec).toBeNull();
  });

  test('endDrag clears transient drag fields while preserving snap config', () => {
    const store = useSliceAdjustmentStore.getState();
    store.beginDrag({ sliceId: 'slice-3', handle: 'start' });
    store.setSnap({ snapMode: 'fixed', fixedSnapPresetSec: 60, snapEnabled: false });
    store.updateTooltip({
      x: 10,
      y: 20,
      boundarySec: 100,
      durationSec: 120,
      label: 'test',
      snapState: 'bypass',
    });
    store.updateDrag({ limitCue: 'domainStart', modifierBypass: true });
    store.setHover('slice-3', 'start');

    store.endDrag();

    const state = useSliceAdjustmentStore.getState();
    expect(state.draggingSliceId).toBeNull();
    expect(state.draggingHandle).toBeNull();
    expect(state.tooltip).toBeNull();
    expect(state.limitCue).toBe('none');
    expect(state.modifierBypass).toBe(false);
    expect(state.snapEnabled).toBe(false);
    expect(state.snapMode).toBe('fixed');
    expect(state.fixedSnapPresetSec).toBe(60);
  });
});
