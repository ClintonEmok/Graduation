import { create } from 'zustand';

interface ComparisonStore {
  comparisonIds: [string | null, string | null];

  setComparisonId: (index: 0 | 1, id: string | null) => void;
  clearComparison: () => void;
  canAddComparison: () => boolean;
  isCompared: (id: string) => boolean;
  getComparisonIds: () => [string | null, string | null];
}

export const useSuggestionComparisonStore = create<ComparisonStore>((set, get) => ({
  comparisonIds: [null, null],

  setComparisonId: (index, id) =>
    set((state) => {
      const newIds: [string | null, string | null] = [...state.comparisonIds];
      // If adding an ID, check if it's already in the other slot
      if (id !== null) {
        const otherIndex = index === 0 ? 1 : 0;
        if (newIds[otherIndex] === id) {
          // Already in other slot, swap them
          newIds[otherIndex] = newIds[index];
        }
      }
      newIds[index] = id;
      return { comparisonIds: newIds };
    }),

  clearComparison: () => set({ comparisonIds: [null, null] }),

  canAddComparison: () => {
    const [id1, id2] = get().comparisonIds;
    return id1 === null || id2 === null;
  },

  isCompared: (id) => {
    const [id1, id2] = get().comparisonIds;
    return id1 === id || id2 === id;
  },

  getComparisonIds: () => get().comparisonIds,
}));
