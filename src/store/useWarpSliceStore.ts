import { create } from 'zustand';

export interface WarpSlice {
  id: string;
  label: string;
  range: [number, number];
  weight: number;
  enabled: boolean;
}

interface WarpSliceState {
  slices: WarpSlice[];
  addSlice: (initial?: Partial<Omit<WarpSlice, 'id'>>) => string;
  updateSlice: (id: string, updates: Partial<Pick<WarpSlice, 'label' | 'range' | 'weight' | 'enabled'>>) => void;
  removeSlice: (id: string) => void;
  clearSlices: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeRange = (range: [number, number]): [number, number] => {
  const rawStart = clamp(Number.isFinite(range[0]) ? range[0] : 0, 0, 100);
  const rawEnd = clamp(Number.isFinite(range[1]) ? range[1] : 100, 0, 100);
  const start = Math.min(rawStart, rawEnd);
  const end = Math.max(rawStart, rawEnd);
  if (end - start < 0.5) {
    const adjustedEnd = clamp(start + 0.5, 0, 100);
    const adjustedStart = adjustedEnd === 100 ? 99.5 : start;
    return [adjustedStart, adjustedEnd];
  }
  return [start, end];
};

export const useWarpSliceStore = create<WarpSliceState>((set, get) => ({
  slices: [],
  addSlice: (initial) => {
    const index = get().slices.length;
    const nextSlice: WarpSlice = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `warp-slice-${Date.now()}-${index}`,
      label: initial?.label ?? `Warp ${index + 1}`,
      range: initial?.range ?? [clamp(12 + index * 10, 0, 94), clamp(20 + index * 10, 1, 100)],
      weight: initial?.weight ?? 1,
      enabled: initial?.enabled ?? true,
    };
    set((state) => ({ slices: [...state.slices, nextSlice] }));
    return nextSlice.id;
  },
  updateSlice: (id, updates) => {
    set((state) => ({
      slices: state.slices.map((slice) => {
        if (slice.id !== id) return slice;
        const nextRange = updates.range ? normalizeRange(updates.range) : slice.range;
        const nextWeight = updates.weight !== undefined ? clamp(updates.weight, 0, 3) : slice.weight;
        const nextLabel = updates.label !== undefined ? updates.label : slice.label;
        const nextEnabled = updates.enabled !== undefined ? updates.enabled : slice.enabled;
        return {
          ...slice,
          range: nextRange,
          weight: nextWeight,
          label: nextLabel,
          enabled: nextEnabled,
        };
      })
    }));
  },
  removeSlice: (id) => {
    set((state) => ({ slices: state.slices.filter((slice) => slice.id !== id) }));
  },
  clearSlices: () => {
    set({ slices: [] });
  },
}));
