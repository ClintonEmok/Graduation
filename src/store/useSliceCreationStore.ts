import { create } from 'zustand';
import { useSliceStore, type TimeSlice } from './useSliceStore';

type CreationMode = 'click' | 'drag';

type GhostPosition = {
  x: number;
  width: number;
};

type SliceCreationBaseState = {
  isCreating: boolean;
  creationMode: CreationMode | null;
  previewStart: number | null;
  previewEnd: number | null;
  ghostPosition: GhostPosition | null;
};

export interface SliceCreationState extends SliceCreationBaseState {
  startCreation: (mode: CreationMode) => void;
  updatePreview: (start: number, end: number) => void;
  commitCreation: () => TimeSlice | null;
  cancelCreation: () => void;
}

const clampNormalizedTime = (value: number): number => Math.max(0, Math.min(100, value));

const resetPreviewState = (): Pick<SliceCreationBaseState, 'previewStart' | 'previewEnd' | 'ghostPosition'> => ({
  previewStart: null,
  previewEnd: null,
  ghostPosition: null,
});

const resetCreationState = (): SliceCreationBaseState => ({
  isCreating: false,
  creationMode: null,
  ...resetPreviewState(),
});

export const useSliceCreationStore = create<SliceCreationState>()((set, get) => ({
  ...resetCreationState(),
  startCreation: (mode) =>
    set({
      isCreating: true,
      creationMode: mode,
      ...resetPreviewState(),
    }),
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
  commitCreation: () => {
    const { previewStart, previewEnd, creationMode } = get();
    if (previewStart === null) {
      return null;
    }

    const sliceStore = useSliceStore.getState();
    const sliceName = `Slice ${sliceStore.slices.length + 1}`;
    const id = crypto.randomUUID();

    const hasRange = creationMode === 'drag' && previewEnd !== null && previewEnd !== previewStart;
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
  cancelCreation: () => set(resetCreationState()),
}));
