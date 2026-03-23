import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimeslicingMode = 'auto' | 'manual';
export type TimeslicePreset = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'weekday-weekend'
  | 'morning-afternoon-evening-night'
  | 'business-hours'
  | 'custom';

interface TimeslicingState {
  // Mode control
  mode: TimeslicingMode;
  setMode: (mode: TimeslicingMode) => void;
  
  // Preset configuration
  preset: TimeslicePreset;
  setPreset: (preset: TimeslicePreset) => void;
  
  // Custom preset parameters
  customIntervals: Array<{ name: string; startHour: number; endHour: number }>;
  setCustomIntervals: (intervals: Array<{ name: string; startHour: number; endHour: number }>) => void;
  
  // Auto parameters
  autoConfig: {
    minBurstEvents: number;
    burstThreshold: number;
    maxSlices: number;
  };
  setAutoConfig: (config: Partial<TimeslicingState['autoConfig']>) => void;
  
  // Manual creation state
  isCreatingSlice: boolean;
  creationStart: number | null;
  setIsCreatingSlice: (creating: boolean) => void;
  setCreationStart: (start: number | null) => void;
  
  // Slice templates (for quick creation)
  sliceTemplates: Array<{
    id: string;
    name: string;
    duration: number; // in milliseconds
    color: string;
  }>;
  addSliceTemplate: (template: Omit<TimeslicingState['sliceTemplates'][0], 'id'>) => void;
  removeSliceTemplate: (id: string) => void;
  
  // Preset configurations
  getPresetIntervals: () => Array<{ name: string; startHour: number; endHour: number }>;
}

const PRESET_DEFINITIONS: Record<TimeslicePreset, () => Array<{ name: string; startHour: number; endHour: number }>> = {
  'hourly': () => Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, startHour: i, endHour: i + 1 })),
  'daily': () => [
    { name: '00:00-06:00', startHour: 0, endHour: 6 },
    { name: '06:00-12:00', startHour: 6, endHour: 12 },
    { name: '12:00-18:00', startHour: 12, endHour: 18 },
    { name: '18:00-24:00', startHour: 18, endHour: 24 },
  ],
  'weekly': () => [
    { name: 'Mon-Thu', startHour: 0, endHour: 96 }, // 4 days
    { name: 'Friday', startHour: 96, endHour: 120 },
    { name: 'Sat-Sun', startHour: 120, endHour: 168 },
  ],
  'monthly': () => [
    { name: 'Week 1', startHour: 0, endHour: 168 },
    { name: 'Week 2', startHour: 168, endHour: 336 },
    { name: 'Week 3', startHour: 336, endHour: 504 },
    { name: 'Week 4', startHour: 504, endHour: 672 },
  ],
  'weekday-weekend': () => [
    { name: 'Weekdays', startHour: 0, endHour: 120 }, // Mon-Fri in hour units
    { name: 'Weekend', startHour: 120, endHour: 168 },
  ],
  'morning-afternoon-evening-night': () => [
    { name: 'Morning (6-12)', startHour: 6, endHour: 12 },
    { name: 'Afternoon (12-18)', startHour: 12, endHour: 18 },
    { name: 'Evening (18-24)', startHour: 18, endHour: 24 },
    { name: 'Night (0-6)', startHour: 0, endHour: 6 },
  ],
  'business-hours': () => [
    { name: 'Business Hours (9-17)', startHour: 9, endHour: 17 },
    { name: 'Evening (17-24)', startHour: 17, endHour: 24 },
    { name: 'Night (0-9)', startHour: 0, endHour: 9 },
  ],
  'custom': () => [],
};

export const useTimeslicingModeStore = create<TimeslicingState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      setMode: (mode) => set({ mode }),
      
      preset: 'daily',
      setPreset: (preset) => set({ preset }),
      
      customIntervals: [],
      setCustomIntervals: (intervals) => set({ customIntervals: intervals }),
      
      autoConfig: {
        minBurstEvents: 10,
        burstThreshold: 0.7,
        maxSlices: 20,
      },
      setAutoConfig: (config) => set((state) => ({
        autoConfig: { ...state.autoConfig, ...config },
      })),
      
      isCreatingSlice: false,
      creationStart: null,
      setIsCreatingSlice: (creating) => set({ isCreatingSlice: creating }),
      setCreationStart: (start) => set({ creationStart: start }),
      
      sliceTemplates: [
        { id: '1h', name: '1 Hour', duration: 3600000, color: '#3b82f6' },
        { id: '4h', name: '4 Hours', duration: 4 * 3600000, color: '#10b981' },
        { id: '8h', name: '8 Hours (Workday)', duration: 8 * 3600000, color: '#f59e0b' },
        { id: '24h', name: '24 Hours (Day)', duration: 24 * 3600000, color: '#8b5cf6' },
        { id: '7d', name: '7 Days (Week)', duration: 7 * 24 * 3600000, color: '#ec4899' },
      ],
      addSliceTemplate: (template) => set((state) => ({
        sliceTemplates: [...state.sliceTemplates, { ...template, id: `custom-${Date.now()}` }],
      })),
      removeSliceTemplate: (id) => set((state) => ({
        sliceTemplates: state.sliceTemplates.filter((t) => t.id !== id),
      })),
      
      getPresetIntervals: () => {
        const { preset } = get();
        const definition = PRESET_DEFINITIONS[preset];
        if (definition) {
          return definition();
        }
        return [];
      },
    }),
    {
      name: 'timeslicing-mode-v1',
      partialize: (state) => ({
        mode: state.mode,
        preset: state.preset,
        customIntervals: state.customIntervals,
        autoConfig: state.autoConfig,
        sliceTemplates: state.sliceTemplates,
      }),
    }
  )
);