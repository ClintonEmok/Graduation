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

const toSelection = (ids: Iterable<string>) => new Set(ids);

export const useSliceSelectionStore = create<SliceSelectionStore>()((set, get) => ({
  selectedIds: new Set(),
  selectedCount: 0,
  selectSlice: (id) => {
    const selectedIds = toSelection([id]);
    set({ selectedIds, selectedCount: selectedIds.size });
  },
  deselectSlice: (id) => {
    const selectedIds = toSelection(get().selectedIds);
    selectedIds.delete(id);
    set({ selectedIds, selectedCount: selectedIds.size });
  },
  toggleSlice: (id) => {
    const selectedIds = toSelection(get().selectedIds);
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    set({ selectedIds, selectedCount: selectedIds.size });
  },
  clearSelection: () => {
    set({ selectedIds: new Set(), selectedCount: 0 });
  },
  selectAll: (ids) => {
    const selectedIds = toSelection(ids);
    set({ selectedIds, selectedCount: selectedIds.size });
  },
  isSelected: (id) => {
    return get().selectedIds.has(id);
  },
}));
