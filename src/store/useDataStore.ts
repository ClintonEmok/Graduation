import { create } from 'zustand';
import { TIME_MIN, TIME_MAX } from '@/lib/constants';

export interface DataPoint {
  id: string;
  timestamp: number; // Using number to align with useTimeStore
  [key: string]: any;
}

interface DataState {
  data: DataPoint[];
  setData: (data: DataPoint[]) => void;
  generateMockData: (count: number) => void;
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  setData: (data) => set({ data }),
  generateMockData: (count) => {
    const data: DataPoint[] = Array.from({ length: count }).map((_, i) => ({
      id: String(i),
      timestamp: TIME_MIN + Math.random() * (TIME_MAX - TIME_MIN),
      value: Math.random()
    }));
    // Sort by timestamp
    data.sort((a, b) => a.timestamp - b.timestamp);
    set({ data });
  }
}));
