import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimeSlice {
  id: string;
  type: 'point' | 'range';
  time: number; // Normalized time 0-100 (for point)
  range?: [number, number]; // Normalized start/end (for range)
  isLocked: boolean;
  isVisible: boolean;
}

interface SliceStore {
  slices: TimeSlice[];
  addSlice: (initial: Partial<TimeSlice>) => void;
  removeSlice: (id: string) => void;
  updateSlice: (id: string, updates: Partial<TimeSlice>) => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  clearSlices: () => void;
}

export const useSliceStore = create<SliceStore>()(
  persist(
    (set) => ({
      slices: [],
      addSlice: (initial) =>
        set((state) => ({
          slices: [
            ...state.slices,
            {
              id: crypto.randomUUID(),
              type: initial.type || 'point',
              time: initial.time ?? 50,
              range: initial.range || [40, 60],
              isLocked: false,
              isVisible: true,
              ...initial,
            },
          ],
        })),
      removeSlice: (id) =>
        set((state) => ({
          slices: state.slices.filter((s) => s.id !== id),
        })),
      updateSlice: (id, updates) =>
        set((state) => ({
          slices: state.slices.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      toggleLock: (id) =>
        set((state) => ({
          slices: state.slices.map((s) =>
            s.id === id ? { ...s, isLocked: !s.isLocked } : s
          ),
        })),
      toggleVisibility: (id) =>
        set((state) => ({
          slices: state.slices.map((s) =>
            s.id === id ? { ...s, isVisible: !s.isVisible } : s
          ),
        })),
      clearSlices: () => set({ slices: [] }),
    }),
    {
      name: 'slice-store-v1',
    }
  )
);
