import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateRangeTolerance, rangesMatch } from '../lib/slice-utils';

export interface TimeSlice {
  id: string;
  name?: string;
  type: 'point' | 'range';
  time: number; // Normalized time 0-100 (for point)
  range?: [number, number]; // Normalized start/end (for range)
  isBurst?: boolean;
  burstSliceId?: string;
  isLocked: boolean;
  isVisible: boolean;
}

interface SliceStore {
  slices: TimeSlice[];
  activeSliceId: string | null;
  addSlice: (initial: Partial<TimeSlice>) => void;
  addBurstSlice: (burstWindow: { start: number; end: number }) => TimeSlice | null;
  findMatchingSlice: (start: number, end: number, tolerance?: number) => TimeSlice | undefined;
  removeSlice: (id: string) => void;
  updateSlice: (id: string, updates: Partial<TimeSlice>) => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  clearSlices: () => void;
  setActiveSlice: (id: string | null) => void;
}

const BURST_TOLERANCE_RATIO = 0.005;

const normalizeRange = (start: number, end: number): [number, number] =>
  start <= end ? [start, end] : [end, start];

const getSliceStart = (slice: TimeSlice): number => {
  if (slice.type === 'range' && slice.range) {
    return Math.min(slice.range[0], slice.range[1]);
  }

  return slice.time;
};

const sortSlices = (slices: TimeSlice[]): TimeSlice[] =>
  slices
    .map((slice, index) => ({ slice, index }))
    .sort((a, b) => {
      const startDelta = getSliceStart(a.slice) - getSliceStart(b.slice);
      if (startDelta !== 0) {
        return startDelta;
      }

      if (!a.slice.isBurst && b.slice.isBurst) {
        return -1;
      }

      if (a.slice.isBurst && !b.slice.isBurst) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ slice }) => slice);

const buildBurstSliceId = (start: number, end: number): string => {
  const [normalizedStart, normalizedEnd] = normalizeRange(start, end);
  return `burst-${normalizedStart}-${normalizedEnd}`;
};

export const useSliceStore = create<SliceStore>()(
  persist(
    (set, get) => ({
      slices: [],
      activeSliceId: null,
      addSlice: (initial) =>
        set((state) => {
          const id = crypto.randomUUID();
          const nextSlice: TimeSlice = {
            id,
            type: initial.type || 'point',
            time: initial.time ?? 50,
            range: initial.range || [40, 60],
            isLocked: false,
            isVisible: true,
            ...initial,
          };

          return {
            slices: sortSlices([...state.slices, nextSlice]),
            activeSliceId: id, // Automatically set as active on creation
          };
        }),
      findMatchingSlice: (start, end, tolerance) => {
        const [targetStart, targetEnd] = normalizeRange(start, end);
        const resolvedTolerance =
          tolerance ?? calculateRangeTolerance([targetStart, targetEnd], BURST_TOLERANCE_RATIO);

        return get().slices.find((slice) => {
          if (slice.type !== 'range' || !slice.range) {
            return false;
          }

          return rangesMatch(slice.range, [targetStart, targetEnd], resolvedTolerance);
        });
      },
      addBurstSlice: (burstWindow) => {
        const [rangeStart, rangeEnd] = normalizeRange(burstWindow.start, burstWindow.end);
        const existing = get().findMatchingSlice(rangeStart, rangeEnd);
        if (existing) {
          set({ activeSliceId: existing.id });
          return existing;
        }

        const id = crypto.randomUUID();
        const burstNumber = get().slices.filter((slice) => slice.isBurst).length + 1;
        const burstSlice: TimeSlice = {
          id,
          name: `Burst ${burstNumber}`,
          type: 'range',
          time: (rangeStart + rangeEnd) / 2,
          range: [rangeStart, rangeEnd],
          isBurst: true,
          burstSliceId: buildBurstSliceId(rangeStart, rangeEnd),
          isLocked: false,
          isVisible: true,
        };

        set((state) => ({
          slices: sortSlices([...state.slices, burstSlice]),
          activeSliceId: id,
        }));

        return burstSlice;
      },
      removeSlice: (id) =>
        set((state) => ({
          slices: state.slices.filter((s) => s.id !== id),
          activeSliceId: state.activeSliceId === id ? null : state.activeSliceId,
        })),
      updateSlice: (id, updates) =>
        set((state) => ({
          slices: sortSlices(
            state.slices.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            )
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
      clearSlices: () => set({ slices: [], activeSliceId: null }),
      setActiveSlice: (id) => set({ activeSliceId: id }),
    }),
    {
      name: 'slice-store-v1',
      partialize: (state) => ({ slices: state.slices }), // Don't persist activeSliceId if we want it ephemeral
    }
  )
);
