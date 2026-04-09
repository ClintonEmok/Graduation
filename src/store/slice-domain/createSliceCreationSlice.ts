import type {
  PreviewFeedback,
  SliceCreationState,
  SliceDomainStateCreator,
  TimeSlice,
} from './types';
import { normalizedToEpochSeconds } from '../../lib/time-domain';
import { useTimelineDataStore } from '../useTimelineDataStore';

type SliceCreationBaseState = Pick<
  SliceCreationState,
  | 'isCreating'
  | 'creationMode'
  | 'dragActive'
  | 'snapEnabled'
  | 'previewStart'
  | 'previewEnd'
  | 'ghostPosition'
  | 'previewIsValid'
  | 'previewReason'
  | 'previewDurationLabel'
  | 'previewTimeRangeLabel'
  | 'snapInterval'
>;

const clampNormalizedTime = (value: number): number => Math.max(0, Math.min(100, value));

const resetPreviewState = (): Pick<SliceCreationBaseState, 'previewStart' | 'previewEnd' | 'ghostPosition'> => ({
  previewStart: null,
  previewEnd: null,
  ghostPosition: null,
});

const resetPreviewFeedback = (): Pick<
  SliceCreationBaseState,
  'previewIsValid' | 'previewReason' | 'previewDurationLabel' | 'previewTimeRangeLabel' | 'snapInterval'
> => ({
  previewIsValid: true,
  previewReason: null,
  previewDurationLabel: null,
  previewTimeRangeLabel: null,
  snapInterval: null,
});

const resetCreationState = (): SliceCreationBaseState => ({
  isCreating: false,
  creationMode: null,
  dragActive: false,
  snapEnabled: true,
  ...resetPreviewState(),
  ...resetPreviewFeedback(),
});

const toDateTimeMs = (normalizedValue: number): number | null => {
  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
  if (minTimestampSec === null || maxTimestampSec === null || maxTimestampSec <= minTimestampSec) {
    return null;
  }

  return normalizedToEpochSeconds(normalizedValue, minTimestampSec, maxTimestampSec) * 1000;
};

export const createSliceCreationSlice: SliceDomainStateCreator<SliceCreationState> = (set, get) => ({
  ...resetCreationState(),
  startCreation: (mode) =>
    set({
      isCreating: true,
      creationMode: mode,
      dragActive: false,
      ...resetPreviewState(),
      ...resetPreviewFeedback(),
    }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setDragActive: (active) => set({ dragActive: active }),
  updatePreview: (start, end) => {
    const normalizedStart = clampNormalizedTime(Math.min(start, end));
    const normalizedEnd = clampNormalizedTime(Math.max(start, end));

    set({
      previewStart: normalizedStart,
      previewEnd: normalizedEnd,
      ghostPosition: {
        x: normalizedStart,
        width: Math.max(0, normalizedEnd - normalizedStart),
      },
    });
  },
  setPreviewFeedback: (feedback: PreviewFeedback) =>
    set({
      previewIsValid: feedback.isValid,
      previewReason: feedback.reason ?? null,
      previewDurationLabel: feedback.durationLabel ?? null,
      previewTimeRangeLabel: feedback.timeRangeLabel ?? null,
      snapInterval: feedback.snapInterval ?? null,
    }),
  commitCreation: () => {
    const { previewStart, previewEnd } = get();
    if (previewStart === null) {
      return null;
    }

    const sliceName = `Slice ${get().slices.length + 1}`;
    const id = crypto.randomUUID();

    const hasRange = previewEnd !== null && previewEnd !== previewStart;
    const createdSlice: TimeSlice = hasRange
        ? {
            id,
            name: sliceName,
            type: 'range',
            time: previewStart,
            range: [previewStart, previewEnd],
            warpEnabled: true,
            warpWeight: 1,
            isLocked: false,
            isVisible: true,
            startDateTimeMs: toDateTimeMs(previewStart),
            endDateTimeMs: previewEnd === null ? null : toDateTimeMs(previewEnd),
          }
        : {
            id,
            name: sliceName,
            type: 'point',
            time: previewStart,
            warpEnabled: true,
            warpWeight: 1,
            isLocked: false,
            isVisible: true,
            startDateTimeMs: toDateTimeMs(previewStart),
          };

    get().addSlice(createdSlice);
    set(resetCreationState());
    return createdSlice;
  },
  cancelCreation: () =>
    set((state) => ({
      ...resetCreationState(),
      snapEnabled: state.snapEnabled,
    })),
});
