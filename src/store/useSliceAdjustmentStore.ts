import { create } from 'zustand';
import type { AdjustmentHandle, LimitCue, SnapMode } from '@/app/timeline-test/lib/slice-adjustment';

type TooltipPayload = {
  x: number;
  y: number;
  boundarySec: number;
  durationSec: number;
  label: string;
  snapState: 'snapped' | 'free' | 'bypass';
};

type DragPayload = {
  sliceId: string;
  handle: AdjustmentHandle;
};

export interface SliceAdjustmentState {
  draggingSliceId: string | null;
  draggingHandle: AdjustmentHandle | null;
  hoverSliceId: string | null;
  hoverHandle: AdjustmentHandle | null;
  tooltip: TooltipPayload | null;
  limitCue: LimitCue;
  modifierBypass: boolean;
  snapEnabled: boolean;
  snapMode: SnapMode;
  fixedSnapPresetSec: number | null;
  beginDrag: (payload: DragPayload) => void;
  updateDrag: (payload: Partial<Pick<SliceAdjustmentState, 'limitCue' | 'modifierBypass'>>) => void;
  endDrag: () => void;
  setHover: (sliceId: string | null, handle: AdjustmentHandle | null) => void;
  updateTooltip: (tooltip: TooltipPayload | null) => void;
  setSnap: (payload: Partial<Pick<SliceAdjustmentState, 'snapEnabled' | 'snapMode' | 'fixedSnapPresetSec'>>) => void;
}

const createInitialState = () => ({
  draggingSliceId: null,
  draggingHandle: null,
  hoverSliceId: null,
  hoverHandle: null,
  tooltip: null,
  limitCue: 'none' as LimitCue,
  modifierBypass: false,
  snapEnabled: true,
  snapMode: 'adaptive' as SnapMode,
  fixedSnapPresetSec: null,
});

export const useSliceAdjustmentStore = create<SliceAdjustmentState>()((set) => ({
  ...createInitialState(),
  beginDrag: ({ sliceId, handle }) =>
    set({
      draggingSliceId: sliceId,
      draggingHandle: handle,
      hoverSliceId: sliceId,
      hoverHandle: handle,
      tooltip: null,
      limitCue: 'none',
      modifierBypass: false,
    }),
  updateDrag: ({ limitCue, modifierBypass }) =>
    set((state) => ({
      limitCue: limitCue ?? state.limitCue,
      modifierBypass: modifierBypass ?? state.modifierBypass,
    })),
  endDrag: () =>
    set({
      draggingSliceId: null,
      draggingHandle: null,
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
}));

export type { TooltipPayload };
