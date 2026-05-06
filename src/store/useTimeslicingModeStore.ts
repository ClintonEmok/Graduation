import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimeBin } from '@/lib/binning/types';
import { useSliceDomainStore } from './useSliceDomainStore';

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

export type TimeslicingGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type GenerationStatus = 'idle' | 'generating' | 'ready' | 'applied' | 'error';

export interface GenerationInputs {
  crimeTypes: string[];
  neighbourhood: string | null;
  timeWindow: {
    start: number | null;
    end: number | null;
  };
  granularity: TimeslicingGranularity;
}

export interface GenerationResultMetadata {
  generatedAt: number;
  binCount: number;
  eventCount: number;
  warning: string | null;
  inputs: GenerationInputs;
}

const areStringArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const areGenerationInputsEqual = (a: GenerationInputs, b: GenerationInputs) =>
  a.neighbourhood === b.neighbourhood
  && a.granularity === b.granularity
  && a.timeWindow.start === b.timeWindow.start
  && a.timeWindow.end === b.timeWindow.end
  && areStringArraysEqual(a.crimeTypes, b.crimeTypes);

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

  // Generate -> review -> apply workflow
  generationInputs: GenerationInputs;
  generationStatus: GenerationStatus;
  generationError: string | null;
  pendingGeneratedBins: TimeBin[];
  lastGeneratedMetadata: GenerationResultMetadata | null;
  lastAppliedAt: number | null;
  setGenerationInputs: (inputs: Partial<GenerationInputs>) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setPendingGeneratedBins: (bins: TimeBin[], metadata: Omit<GenerationResultMetadata, 'generatedAt'>) => void;
  setGenerationError: (message: string | null) => void;
  clearPendingGeneratedBins: () => void;
  replacePendingGeneratedBins: (bins: TimeBin[]) => void;
  mergePendingGeneratedBins: (binIds: string[]) => void;
  splitPendingGeneratedBin: (binId: string, splitPoint: number) => void;
  deletePendingGeneratedBin: (binId: string) => void;
  applyGeneratedBins: (domain: [number, number]) => boolean;
}

const mergeBins = (bins: TimeBin[], binIds: string[]): TimeBin[] => {
  if (binIds.length < 2) return bins;

  const selected = binIds
    .map((id) => bins.find((bin) => bin.id === id))
    .filter((bin): bin is TimeBin => Boolean(bin))
    .sort((a, b) => a.startTime - b.startTime);

  if (selected.length < 2) return bins;

  const totalCount = selected.reduce((sum, bin) => sum + bin.count, 0);
  const merged: TimeBin = {
    id: `pending-merged-${Date.now()}`,
    startTime: selected[0].startTime,
    endTime: selected[selected.length - 1].endTime,
    count: totalCount,
    crimeTypes: Array.from(new Set(selected.flatMap((bin) => bin.crimeTypes))),
    districts: Array.from(new Set(selected.flatMap((bin) => bin.districts ?? []))),
    avgTimestamp:
      totalCount > 0
        ? selected.reduce((sum, bin) => sum + bin.avgTimestamp * bin.count, 0) / totalCount
        : (selected[0].startTime + selected[selected.length - 1].endTime) / 2,
    isModified: true,
    mergedFrom: selected.map((bin) => bin.id),
  };

  return bins
    .filter((bin) => !binIds.includes(bin.id))
    .concat(merged)
    .sort((a, b) => a.startTime - b.startTime);
};

const splitBin = (bins: TimeBin[], binId: string, splitPoint: number): TimeBin[] => {
  const target = bins.find((bin) => bin.id === binId);
  if (!target) return bins;
  if (splitPoint <= target.startTime || splitPoint >= target.endTime) return bins;

  const leftCount = Math.floor(target.count / 2);
  const rightCount = target.count - leftCount;
  const now = Date.now();

  const left: TimeBin = {
    id: `pending-split-1-${now}`,
    startTime: target.startTime,
    endTime: splitPoint,
    count: leftCount,
    crimeTypes: target.crimeTypes,
    districts: target.districts,
    avgTimestamp: (target.startTime + splitPoint) / 2,
    isModified: true,
  };

  const right: TimeBin = {
    id: `pending-split-2-${now}`,
    startTime: splitPoint,
    endTime: target.endTime,
    count: rightCount,
    crimeTypes: target.crimeTypes,
    districts: target.districts,
    avgTimestamp: (splitPoint + target.endTime) / 2,
    isModified: true,
  };

  return bins
    .filter((bin) => bin.id !== binId)
    .concat([left, right])
    .sort((a, b) => a.startTime - b.startTime);
};

const deleteBin = (bins: TimeBin[], binId: string): TimeBin[] => bins.filter((bin) => bin.id !== binId);

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

      generationInputs: {
        crimeTypes: [],
        neighbourhood: null,
        timeWindow: {
          start: null,
          end: null,
        },
        granularity: 'daily',
      },
      generationStatus: 'idle',
      generationError: null,
      pendingGeneratedBins: [],
      lastGeneratedMetadata: null,
      lastAppliedAt: null,
      setGenerationInputs: (inputs) =>
        set((state) => {
          const nextGenerationInputs: GenerationInputs = {
            ...state.generationInputs,
            ...inputs,
            timeWindow: {
              ...state.generationInputs.timeWindow,
              ...(inputs.timeWindow ?? {}),
            },
          };

          if (areGenerationInputsEqual(state.generationInputs, nextGenerationInputs)) {
            return state;
          }

          return {
            generationInputs: nextGenerationInputs,
          };
        }),
      setGenerationStatus: (generationStatus) => set({ generationStatus }),
      setPendingGeneratedBins: (bins, metadata) =>
        set({
          pendingGeneratedBins: bins,
          generationStatus: 'ready',
          generationError: null,
          lastGeneratedMetadata: {
            ...metadata,
            generatedAt: Date.now(),
          },
        }),
      setGenerationError: (generationError) =>
        set({
          generationError,
          generationStatus: generationError ? 'error' : get().generationStatus,
        }),
      clearPendingGeneratedBins: () =>
        set({
          pendingGeneratedBins: [],
          generationError: null,
          generationStatus: 'idle',
          lastGeneratedMetadata: null,
        }),
      replacePendingGeneratedBins: (bins) =>
        set((state) => ({
          pendingGeneratedBins: bins,
          generationStatus: bins.length > 0 ? 'ready' : 'idle',
          generationError: null,
          lastGeneratedMetadata: state.lastGeneratedMetadata
            ? {
                ...state.lastGeneratedMetadata,
                binCount: bins.length,
              }
            : null,
        })),
      mergePendingGeneratedBins: (binIds) =>
        set((state) => {
          const nextBins = mergeBins(state.pendingGeneratedBins, binIds);
          if (nextBins === state.pendingGeneratedBins) {
            return state;
          }

          return {
            pendingGeneratedBins: nextBins,
            generationStatus: nextBins.length > 0 ? 'ready' : 'idle',
            generationError: null,
            lastGeneratedMetadata: state.lastGeneratedMetadata
              ? {
                  ...state.lastGeneratedMetadata,
                  binCount: nextBins.length,
                }
              : null,
          };
        }),
      splitPendingGeneratedBin: (binId, splitPoint) =>
        set((state) => {
          const nextBins = splitBin(state.pendingGeneratedBins, binId, splitPoint);
          if (nextBins === state.pendingGeneratedBins) {
            return state;
          }

          return {
            pendingGeneratedBins: nextBins,
            generationStatus: nextBins.length > 0 ? 'ready' : 'idle',
            generationError: null,
            lastGeneratedMetadata: state.lastGeneratedMetadata
              ? {
                  ...state.lastGeneratedMetadata,
                  binCount: nextBins.length,
                }
              : null,
          };
        }),
      deletePendingGeneratedBin: (binId) =>
        set((state) => {
          const nextBins = deleteBin(state.pendingGeneratedBins, binId);
          if (nextBins.length === state.pendingGeneratedBins.length) {
            return state;
          }

          return {
            pendingGeneratedBins: nextBins,
            generationStatus: nextBins.length > 0 ? 'ready' : 'idle',
            generationError: null,
            lastGeneratedMetadata: state.lastGeneratedMetadata
              ? {
                  ...state.lastGeneratedMetadata,
                  binCount: nextBins.length,
                }
              : null,
          };
        }),
      applyGeneratedBins: (domain) => {
        const { pendingGeneratedBins } = get();
        if (!pendingGeneratedBins.length) {
          return false;
        }

        useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
        set({
          generationStatus: 'applied',
          pendingGeneratedBins: [],
          generationError: null,
          lastAppliedAt: Date.now(),
        });
        return true;
      },
    }),
    {
      name: 'timeslicing-mode-v2',
      partialize: (state) => ({
        mode: state.mode,
        preset: state.preset,
        customIntervals: state.customIntervals,
        autoConfig: state.autoConfig,
        sliceTemplates: state.sliceTemplates,
        generationInputs: state.generationInputs,
        generationStatus: state.generationStatus,
        lastGeneratedMetadata: state.lastGeneratedMetadata,
        lastAppliedAt: state.lastAppliedAt,
      }),
    }
  )
);
