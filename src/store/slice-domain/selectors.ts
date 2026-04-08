import type { SliceDomainState, TimeSlice } from './types';

export const select = <T>(selector: (state: SliceDomainState) => T) => selector;

export const selectSlices = select((state) => state.slices);
export const selectVisibleSlices = select((state) => state.slices.filter((slice) => slice.isVisible));
export const selectActiveSliceId = select((state) => state.activeSliceId);
export const selectActiveSliceUpdatedAt = select((state) => state.activeSliceUpdatedAt);
export const selectActiveSlice = select((state): TimeSlice | null => {
  if (!state.activeSliceId) {
    return null;
  }
  return state.slices.find((slice) => slice.id === state.activeSliceId) ?? null;
});

export const selectSelectedIds = select((state) => state.selectedIds);
export const selectSelectedCount = select((state) => state.selectedCount);
export const selectHasSelection = select((state) => state.selectedCount > 0);

export const selectCreationMode = select((state) => state.creationMode);
export const selectIsCreating = select((state) => state.isCreating);
export const selectCreationSnapEnabled = select((state) => state.snapEnabled);
export const selectCreationPreviewStart = select((state) => state.previewStart);
export const selectCreationPreviewEnd = select((state) => state.previewEnd);
export const selectCreationPreviewRange = select((state) =>
  state.previewStart === null || state.previewEnd === null
    ? null
    : ([state.previewStart, state.previewEnd] as [number, number])
);

type CreationPreviewFeedback = {
  isValid: boolean;
  reason: string | null;
  durationLabel: string | null;
  timeRangeLabel: string | null;
  snapInterval: number | null;
};

let cachedCreationPreviewFeedback: CreationPreviewFeedback | null = null;
export const selectCreationPreviewFeedback = select((state) => {
  const next: CreationPreviewFeedback = {
    isValid: state.previewIsValid,
    reason: state.previewReason,
    durationLabel: state.previewDurationLabel,
    timeRangeLabel: state.previewTimeRangeLabel,
    snapInterval: state.snapInterval,
  };

  const prev = cachedCreationPreviewFeedback;
  if (
    prev !== null &&
    prev.isValid === next.isValid &&
    prev.reason === next.reason &&
    prev.durationLabel === next.durationLabel &&
    prev.timeRangeLabel === next.timeRangeLabel &&
    prev.snapInterval === next.snapInterval
  ) {
    return prev;
  }

  cachedCreationPreviewFeedback = next;
  return next;
});

export const selectDraggingSliceId = select((state) => state.draggingSliceId);
export const selectDraggingHandle = select((state) => state.draggingHandle);
export const selectLiveBoundarySec = select((state) => state.liveBoundarySec);
export const selectLiveBoundaryX = select((state) => state.liveBoundaryX);
export const selectHoverSliceId = select((state) => state.hoverSliceId);
export const selectHoverHandle = select((state) => state.hoverHandle);
export const selectAdjustmentTooltip = select((state) => state.tooltip);
export const selectAdjustmentLimitCue = select((state) => state.limitCue);
export const selectAdjustmentModifierBypass = select((state) => state.modifierBypass);
export const selectAdjustmentSnapEnabled = select((state) => state.snapEnabled);
export const selectAdjustmentSnapMode = select((state) => state.snapMode);
export const selectAdjustmentFixedSnapPresetSec = select((state) => state.fixedSnapPresetSec);
