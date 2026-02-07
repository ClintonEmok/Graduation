import { create } from 'zustand';
import { 
  TIME_MIN, 
  TIME_MAX, 
  PLAYBACK_SPEED_DEFAULT, 
  TIME_WINDOW_DEFAULT,
  TIME_STEP_DEFAULT
} from '@/lib/constants';

interface TimeState {
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
  setTimeResolution: (resolution: TimeState['timeResolution']) => void;
  setTimeScaleMode: (mode: 'linear' | 'adaptive') => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  currentTime: TIME_MIN,
  isPlaying: false,
  timeRange: [TIME_MIN, TIME_MAX],
  speed: PLAYBACK_SPEED_DEFAULT,
  timeWindow: TIME_WINDOW_DEFAULT,
  timeResolution: 'days',
  timeScaleMode: 'linear',

  setTime: (time) => set((state) => ({ 
    currentTime: Math.max(state.timeRange[0], Math.min(state.timeRange[1], time)) 
  })),
  
  stepTime: (direction) => set((state) => {
    const nextTime = state.currentTime + (direction * TIME_STEP_DEFAULT);
    return {
      currentTime: Math.max(state.timeRange[0], Math.min(state.timeRange[1], nextTime))
    };
  }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setRange: (range) => set({ timeRange: range }),
  
  setSpeed: (speed) => set({ speed }),
  
  setTimeWindow: (timeWindow) => set({ timeWindow }),

  setTimeResolution: (timeResolution) => set({ timeResolution }),

  setTimeScaleMode: (mode) => set({ timeScaleMode: mode }),
}));
