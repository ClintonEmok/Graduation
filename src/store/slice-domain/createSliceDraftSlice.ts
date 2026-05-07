import type { SliceDomainStateCreator, TimeSlice, SliceDraftState } from './types';

export const createSliceDraftSlice: SliceDomainStateCreator<SliceDraftState> = (set, get) => ({
  pendingDraftSlices: [],

  addDraftSlice: (initial) =>
    set((state) => {
      const id = crypto.randomUUID();
      const nextSlice: TimeSlice = {
        id,
        type: initial.type || 'point',
        time: initial.time ?? 50,
        range: initial.range || [40, 60],
        warpEnabled: true,
        warpWeight: 1,
        isLocked: false,
        isVisible: true,
        source: 'manual',
        ...initial,
      };
      return {
        pendingDraftSlices: [...state.pendingDraftSlices, nextSlice],
      };
    }),

  removeDraftSlice: (id) =>
    set((state) => ({
      pendingDraftSlices: state.pendingDraftSlices.filter((s) => s.id !== id),
    })),

  clearDraftSlices: () => set({ pendingDraftSlices: [] }),

  applyDraftSlices: () => {
    const { pendingDraftSlices } = get();
    if (!pendingDraftSlices.length) return;

    pendingDraftSlices.forEach((draft) => {
      get().addSlice(draft);
    });
    set({ pendingDraftSlices: [] });
  },
});
