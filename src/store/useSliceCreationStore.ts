import { create } from 'zustand';
import { useSliceStore, type TimeSlice } from './useSliceStore';

type CreationMode = 'click' | 'drag';

type GhostPosition = {
  x: number;
  width: number;
};

type PreviewFeedback = {
  isValid: boolean;
  reason?: string;
  durationLabel?: string;
  timeRangeLabel?: string;
  snapInterval?: number;
};

type SliceCreationBaseState = {
  isCreating: boolean;
  creationMode: CreationMode | null;
  dragActive: boolean;
  snapEnabled: boolean;
  previewStart: number | null;
  previewEnd: number | null;
  ghostPosition: GhostPosition | null;
  previewIsValid: boolean;
  previewReason: string | null;
  previewDurationLabel: string | null;
  previewTimeRangeLabel: string | null;
  snapInterval: number | null;
};

export interface SliceCreationState extends SliceCreationBaseState {
  startCreation: (mode: CreationMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setDragActive: (active: boolean) => void;
  updatePreview: (start: number, end: number) => void;
  setPreviewFeedback: (feedback: PreviewFeedback) => void;
  commitCreation: () => TimeSlice | null;
  cancelCreation: () => void;
}

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

export const useSliceCreationStore = create<SliceCreationState>()((set, get) => ({
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
  setPreviewFeedback: (feedback) =>
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

    const sliceStore = useSliceStore.getState();
    const sliceName = `Slice ${sliceStore.slices.length + 1}`;
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

    useSliceStore.getState().addSlice(createdSlice);
    set(resetCreationState());
    return createdSlice;
  },
  cancelCreation: () =>
    set((state) => ({
      ...resetCreationState(),
      snapEnabled: state.snapEnabled,
    })),
}));
