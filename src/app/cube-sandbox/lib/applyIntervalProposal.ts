import type { EditableIntervalProposal } from '@/store/useIntervalProposalStore';
import { useSliceStore, type TimeSlice } from '@/store/useSliceStore';

const PROVENANCE_PREFIX = 'interval-proposal:';

export interface IntervalApplyReceipt {
  appliedSliceId: string | null;
  previousSlice: TimeSlice | null;
  previousActiveSliceId: string | null;
  wasCreated: boolean;
}

const normalizeRange = (range: [number, number]): [number, number] =>
  range[0] <= range[1] ? range : [range[1], range[0]];

const buildProvenanceNotes = (proposal: EditableIntervalProposal): string => {
  const range = proposal.editedRange ?? proposal.range;
  return [
    `${PROVENANCE_PREFIX}${proposal.id}`,
    `source=${proposal.sourceProposalId}`,
    `constraint=${proposal.constraintId}`,
    `edited=${proposal.isEdited}`,
    `quality=${proposal.qualityState}`,
    `confidence=${proposal.confidence.band}:${proposal.confidence.score}`,
    `range=${range[0]}-${range[1]}`,
  ].join(' | ');
};

const cloneSlice = (slice: TimeSlice): TimeSlice => ({
  ...slice,
  range: slice.range ? [slice.range[0], slice.range[1]] : undefined,
});

export const applyIntervalProposal = (proposal: EditableIntervalProposal): IntervalApplyReceipt => {
  const sliceState = useSliceStore.getState();
  const previousActiveSliceId = sliceState.activeSliceId;
  const notes = buildProvenanceNotes(proposal);
  const range = normalizeRange(proposal.editedRange ?? proposal.range);
  const midpoint = (range[0] + range[1]) / 2;

  const existingSlice = sliceState.slices.find((slice) =>
    slice.notes?.includes(`${PROVENANCE_PREFIX}${proposal.id}`)
  );

  if (existingSlice) {
    const previousSlice = cloneSlice(existingSlice);
    sliceState.updateSlice(existingSlice.id, {
      type: 'range',
      name: proposal.label,
      time: midpoint,
      range,
      notes,
      isVisible: true,
      isBurst: false,
      burstSliceId: undefined,
    });
    sliceState.setActiveSlice(existingSlice.id);
    return {
      appliedSliceId: existingSlice.id,
      previousSlice,
      previousActiveSliceId,
      wasCreated: false,
    };
  }

  sliceState.addSlice({
    type: 'range',
    name: proposal.label,
    time: midpoint,
    range,
    notes,
    isVisible: true,
    isBurst: false,
  });

  const latestState = useSliceStore.getState();
  const createdSlice = latestState.slices.find((slice) =>
    slice.notes?.includes(`${PROVENANCE_PREFIX}${proposal.id}`)
  );
  const appliedSliceId = createdSlice?.id ?? latestState.activeSliceId;

  if (appliedSliceId) {
    latestState.setActiveSlice(appliedSliceId);
  }

  return {
    appliedSliceId: appliedSliceId ?? null,
    previousSlice: null,
    previousActiveSliceId,
    wasCreated: true,
  };
};

export const undoIntervalProposalApply = (receipt: IntervalApplyReceipt): void => {
  const sliceState = useSliceStore.getState();
  const { appliedSliceId, previousSlice, previousActiveSliceId, wasCreated } = receipt;

  if (appliedSliceId && wasCreated) {
    sliceState.removeSlice(appliedSliceId);
  }

  if (appliedSliceId && !wasCreated && previousSlice) {
    sliceState.updateSlice(appliedSliceId, {
      name: previousSlice.name,
      type: previousSlice.type,
      time: previousSlice.time,
      range: previousSlice.range,
      color: previousSlice.color,
      notes: previousSlice.notes,
      isBurst: previousSlice.isBurst,
      burstSliceId: previousSlice.burstSliceId,
      isLocked: previousSlice.isLocked,
      isVisible: previousSlice.isVisible,
    });
  }

  sliceState.setActiveSlice(previousActiveSliceId);
};
