import type { SliceAdjustmentState, SliceDomainStateCreator } from './types';

const createInitialState = () => ({
  draggingSliceId: null,
  draggingHandle: null,
  liveBoundarySec: null,
  liveBoundaryX: null,
  hoverSliceId: null,
  hoverHandle: null,
  tooltip: null,
  limitCue: 'none' as const,
  modifierBypass: false,
  snapEnabled: true,
  snapMode: 'adaptive' as const,
  fixedSnapPresetSec: null,
});

export const createSliceAdjustmentSlice: SliceDomainStateCreator<SliceAdjustmentState> = (set) => ({
  ...createInitialState(),
  beginDrag: ({ sliceId, handle }) =>
    set({
      draggingSliceId: sliceId,
      draggingHandle: handle,
      liveBoundarySec: null,
      liveBoundaryX: null,
      hoverSliceId: sliceId,
      hoverHandle: handle,
      tooltip: null,
      limitCue: 'none',
      modifierBypass: false,
    }),
  updateDrag: ({ limitCue, modifierBypass, liveBoundarySec, liveBoundaryX }) =>
    set((state) => ({
      limitCue: limitCue ?? state.limitCue,
      modifierBypass: modifierBypass ?? state.modifierBypass,
      liveBoundarySec: liveBoundarySec ?? state.liveBoundarySec,
      liveBoundaryX: liveBoundaryX ?? state.liveBoundaryX,
    })),
  endDrag: () =>
    set({
      draggingSliceId: null,
      draggingHandle: null,
      liveBoundarySec: null,
      liveBoundaryX: null,
      tooltip: null,
      limitCue: 'none',
      modifierBypass: false,
    }),
  setHover: (sliceId, handle) =>
    set({
      hoverSliceId: sliceId,
      hoverHandle: handle,
    }),
  updateTooltip: (tooltip) => set({ tooltip }),
  setSnap: ({ snapEnabled, snapMode, fixedSnapPresetSec }) =>
    set((state) => ({
      snapEnabled: snapEnabled === undefined ? state.snapEnabled : snapEnabled,
      snapMode: snapMode === undefined ? state.snapMode : snapMode,
      fixedSnapPresetSec: fixedSnapPresetSec === undefined ? state.fixedSnapPresetSec : fixedSnapPresetSec,
    })),
});
