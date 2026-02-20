import { create } from 'zustand';

interface SliceSelectionStore {
  selectedIds: Set<string>;
  selectedCount: number;
  selectSlice: (id: string) => void;
  deselectSlice: (id: string) => void;
  toggleSlice: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
}

const setFromIds = (ids: string[]): Set<string> => new Set(ids);

export const useSliceSelectionStore = create<SliceSelectionStore>((set, get) => ({
  selectedIds: new Set<string>(),
  selectedCount: 0,
  selectSlice: (id) =>
    set({
      selectedIds: new Set([id]),
      selectedCount: 1,
    }),
  deselectSlice: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.delete(id);
      return {
        selectedIds: next,
        selectedCount: next.size,
      };
    }),
  toggleSlice: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return {
        selectedIds: next,
        selectedCount: next.size,
      };
    }),
  clearSelection: () =>
    set({
      selectedIds: new Set<string>(),
      selectedCount: 0,
    }),
  selectAll: (ids) => {
    const selected = setFromIds(ids);
    set({
      selectedIds: selected,
      selectedCount: selected.size,
    });
  },
  isSelected: (id) => get().selectedIds.has(id),
}));
