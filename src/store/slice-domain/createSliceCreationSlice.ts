import type {
  PreviewFeedback,
  SliceCreationState,
  SliceDomainStateCreator,
  TimeSlice,
} from './types';

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
          isLocked: false,
          isVisible: true,
        }
      : {
          id,
          name: sliceName,
          type: 'point',
          time: previewStart,
          isLocked: false,
          isVisible: true,
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
