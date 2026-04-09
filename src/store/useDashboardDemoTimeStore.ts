import { create } from 'zustand';
import {
  TIME_MIN,
  TIME_MAX,
  PLAYBACK_SPEED_DEFAULT,
  TIME_WINDOW_DEFAULT,
  TIME_STEP_DEFAULT,
} from '@/lib/constants';

const clampToRange = (time: number, range: [number, number]): number => {
  return Math.max(range[0], Math.min(range[1], time));
};

const normalizeRange = (range: [number, number]): [number, number] => {
  const [start, end] = range;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return range;
  }

  return start <= end ? [start, end] : [end, start];
};

interface DashboardDemoTimeState {
  currentTime: number;
  isPlaying: boolean;
  timeRange: [number, number];
  speed: number;
  timeWindow: number;
  timeResolution: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  timeScaleMode: 'linear' | 'adaptive';

  setTime: (time: number) => void;
  stepTime: (direction: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setRange: (range: [number, number]) => void;
  setSpeed: (speed: number) => void;
  setTimeWindow: (window: number) => void;
  setTimeResolution: (resolution: DashboardDemoTimeState['timeResolution']) => void;
  setTimeScaleMode: (mode: 'linear' | 'adaptive') => void;
}

export const useDashboardDemoTimeStore = create<DashboardDemoTimeState>((set) => ({
  currentTime: TIME_MIN,
  isPlaying: false,
  timeRange: [TIME_MIN, TIME_MAX],
  speed: PLAYBACK_SPEED_DEFAULT,
  timeWindow: TIME_WINDOW_DEFAULT,
  timeResolution: 'days',
  timeScaleMode: 'linear',

  setTime: (time) => set((state) => ({ currentTime: clampToRange(time, state.timeRange) })),

  stepTime: (direction) => set((state) => {
    const nextTime = state.currentTime + (direction * TIME_STEP_DEFAULT);
    return {
      currentTime: clampToRange(nextTime, state.timeRange),
    };
  }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setRange: (range) => set((state) => {
    const nextRange = normalizeRange(range);

    return {
      timeRange: nextRange,
      currentTime: clampToRange(state.currentTime, nextRange),
    };
  }),

  setSpeed: (speed) => set({ speed }),

  setTimeWindow: (timeWindow) => set({ timeWindow }),

  setTimeResolution: (timeResolution) => set({ timeResolution }),

  setTimeScaleMode: (mode) => set({ timeScaleMode: mode }),
}));
