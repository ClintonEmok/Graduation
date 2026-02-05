import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimeSlice {
  id: string;
  time: number; // Normalized time 0-100
  isLocked: boolean;
  isVisible: boolean;
}

interface SliceStore {
  slices: TimeSlice[];
  addSlice: (time: number) => void;
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
      addSlice: (time) =>
        set((state) => ({
          slices: [
            ...state.slices,
            {
              id: crypto.randomUUID(),
              time,
              isLocked: false,
              isVisible: true,
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
