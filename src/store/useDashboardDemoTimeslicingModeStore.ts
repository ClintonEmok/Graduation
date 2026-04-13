import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BurstWindow } from '@/components/viz/BurstList';
import { buildBurstDraftBinsFromWindows } from '@/components/dashboard-demo/lib/demo-burst-generation';
import type { TimeBin } from '@/lib/binning/types';
import {
  DEMO_PRESET_BIAS_KEYS,
  DEFAULT_PRESET_BIASES,
  clampPresetBias,
  resolvePresetBiasBinTarget,
  type DemoPresetBiasKey,
} from '@/components/dashboard-demo/lib/demo-preset-thresholds';

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

export type TimeslicingGranularity = 'hourly' | 'daily' | 'weekly';
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
  generationSource: 'burst-windows' | 'preset-bias';
  preset: TimeslicePreset;
  presetBias: number;
  inputs: GenerationInputs;
}

export type PresetBiases = Record<TimeslicePreset, number>;

interface DashboardDemoTimeslicingState {
  mode: TimeslicingMode;
  setMode: (mode: TimeslicingMode) => void;
  preset: TimeslicePreset;
  setPreset: (preset: TimeslicePreset) => void;
  presetBiases: PresetBiases;
  setPresetBias: (preset: TimeslicePreset, bias: number) => void;
  resetPresetBias: (preset: TimeslicePreset) => void;
  resetAllPresetBiases: () => void;
  customIntervals: Array<{ name: string; startHour: number; endHour: number }>;
  setCustomIntervals: (intervals: Array<{ name: string; startHour: number; endHour: number }>) => void;
  autoConfig: {
    minBurstEvents: number;
    burstThreshold: number;
    maxSlices: number;
  };
  setAutoConfig: (config: Partial<DashboardDemoTimeslicingState['autoConfig']>) => void;
  isCreatingSlice: boolean;
  creationStart: number | null;
  setIsCreatingSlice: (creating: boolean) => void;
  setCreationStart: (start: number | null) => void;
  sliceTemplates: Array<{
    id: string;
    name: string;
    duration: number;
    color: string;
  }>;
  addSliceTemplate: (template: Omit<DashboardDemoTimeslicingState['sliceTemplates'][0], 'id'>) => void;
  removeSliceTemplate: (id: string) => void;
  getPresetIntervals: () => Array<{ name: string; startHour: number; endHour: number }>;
  generationInputs: GenerationInputs;
  generationStatus: GenerationStatus;
  generationError: string | null;
  pendingGeneratedBins: TimeBin[];
  lastGeneratedMetadata: GenerationResultMetadata | null;
  lastAppliedAt: number | null;
  setGenerationInputs: (inputs: Partial<GenerationInputs>) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setPendingGeneratedBins: (bins: TimeBin[], metadata: Omit<GenerationResultMetadata, 'generatedAt'>) => void;
  generateBinsFromActivePresetBias: () => boolean;
  generateBurstDraftBinsFromWindows: (burstWindows: BurstWindow[]) => boolean;
  setGenerationError: (message: string | null) => void;
  clearPendingGeneratedBins: () => void;
  replacePendingGeneratedBins: (bins: TimeBin[]) => void;
  mergePendingGeneratedBins: (binIds: string[]) => void;
  splitPendingGeneratedBin: (binId: string, splitPoint: number) => void;
  deletePendingGeneratedBin: (binId: string) => void;
  applyGeneratedBins: (domain: [number, number]) => boolean;
}

const createDefaultPresetBiases = (): PresetBiases => ({
  hourly: DEFAULT_PRESET_BIASES.hourly,
  daily: DEFAULT_PRESET_BIASES.daily,
  weekly: DEFAULT_PRESET_BIASES.weekly,
  monthly: DEFAULT_PRESET_BIASES.monthly,
  'weekday-weekend': DEFAULT_PRESET_BIASES['weekday-weekend'],
  'morning-afternoon-evening-night': DEFAULT_PRESET_BIASES['morning-afternoon-evening-night'],
  'business-hours': DEFAULT_PRESET_BIASES['business-hours'],
  custom: DEFAULT_PRESET_BIASES.custom,
});

const sanitizePresetBiases = (candidate: unknown): PresetBiases => {
  const defaults = createDefaultPresetBiases();

  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }

  const record = candidate as Partial<Record<DemoPresetBiasKey, unknown>>;
  for (const key of DEMO_PRESET_BIAS_KEYS) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      defaults[key] = clampPresetBias(value);
    }
  }

  return defaults;
};

const PRESET_DEFINITIONS: Record<TimeslicePreset, () => Array<{ name: string; startHour: number; endHour: number }>> = {
  hourly: () => Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, startHour: i, endHour: i + 1 })),
  daily: () => [
    { name: '00:00-06:00', startHour: 0, endHour: 6 },
    { name: '06:00-12:00', startHour: 6, endHour: 12 },
    { name: '12:00-18:00', startHour: 12, endHour: 18 },
    { name: '18:00-24:00', startHour: 18, endHour: 24 },
  ],
  weekly: () => [
    { name: 'Mon-Thu', startHour: 0, endHour: 96 },
    { name: 'Friday', startHour: 96, endHour: 120 },
    { name: 'Sat-Sun', startHour: 120, endHour: 168 },
  ],
  monthly: () => [
    { name: 'Week 1', startHour: 0, endHour: 168 },
    { name: 'Week 2', startHour: 168, endHour: 336 },
    { name: 'Week 3', startHour: 336, endHour: 504 },
    { name: 'Week 4', startHour: 504, endHour: 672 },
  ],
  'weekday-weekend': () => [
    { name: 'Weekdays', startHour: 0, endHour: 120 },
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
  custom: () => [],
};

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

const createGeneratedBin = (
  startTime: number,
  endTime: number,
  count: number,
  inputCrimeTypes: string[],
  neighbourhood: string | null,
  index: number,
): TimeBin => ({
  id: `demo-generated-${Date.now()}-${index}`,
  startTime,
  endTime,
  count,
  crimeTypes: inputCrimeTypes.length > 0 ? inputCrimeTypes : ['all-crime-types'],
  districts: neighbourhood ? [neighbourhood] : [],
  avgTimestamp: (startTime + endTime) / 2,
});

const generateDemoBinsFromPresetBias = (
  preset: TimeslicePreset,
  bias: number,
  generationInputs: GenerationInputs,
): { bins: TimeBin[]; warning: string | null; eventCount: number } => {
  const start = generationInputs.timeWindow.start;
  const end = generationInputs.timeWindow.end;

  if (start === null || end === null) {
    return {
      bins: [],
      warning: 'Choose a valid time window before generating.',
      eventCount: 0,
    };
  }

  const windowStart = Math.min(start, end);
  const windowEnd = Math.max(start, end);

  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd) || windowEnd <= windowStart) {
    return {
      bins: [],
      warning: 'Choose a valid time window before generating.',
      eventCount: 0,
    };
  }

  const clampedBias = clampPresetBias(bias);
  const targetBins = resolvePresetBiasBinTarget(preset, clampedBias);
  const totalDuration = windowEnd - windowStart;
  const baseWidth = totalDuration / targetBins;
  const eventCount = Math.max(1, targetBins * 12 + clampedBias);

  const bins = Array.from({ length: targetBins }, (_, index) => {
    const isEdgeBin = index === 0 || index === targetBins - 1;
    const edgeCompression = 1 - (clampedBias / 100) * 0.25;
    const widthFactor = isEdgeBin ? edgeCompression : 1;

    const binStart = windowStart + baseWidth * index;
    const fallbackEnd = index === targetBins - 1 ? windowEnd : windowStart + baseWidth * (index + 1);
    const scaledEnd = binStart + baseWidth * widthFactor;
    const binEnd = index === targetBins - 1 ? windowEnd : Math.min(fallbackEnd, scaledEnd);
    const safeEnd = Math.max(binStart + 1, binEnd);

    return createGeneratedBin(
      Math.round(binStart),
      Math.round(safeEnd),
      Math.max(1, Math.round(eventCount / targetBins)),
      generationInputs.crimeTypes,
      generationInputs.neighbourhood,
      index,
    );
  });

  return {
    bins,
    warning: bins.length <= 1
      ? 'The selected preset and Bias produced a single slice. Try a broader window or lower Bias.'
      : null,
    eventCount,
  };
};

export const useDashboardDemoTimeslicingModeStore = create<DashboardDemoTimeslicingState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      setMode: (mode) => set({ mode }),
      preset: 'daily',
      setPreset: (preset) => set({ preset }),
      presetBiases: createDefaultPresetBiases(),
      setPresetBias: (preset, bias) => set((state) => ({
        presetBiases: {
          ...state.presetBiases,
          [preset]: clampPresetBias(bias),
        },
      })),
      resetPresetBias: (preset) =>
        set((state) => ({
          presetBiases: {
            ...state.presetBiases,
            [preset]: DEFAULT_PRESET_BIASES[preset],
          },
        })),
      resetAllPresetBiases: () => set({ presetBiases: createDefaultPresetBiases() }),
      customIntervals: [],
      setCustomIntervals: (intervals) => set({ customIntervals: intervals }),
      autoConfig: {
        minBurstEvents: 10,
        burstThreshold: 0.7,
        maxSlices: 20,
      },
      setAutoConfig: (config) => set((state) => ({ autoConfig: { ...state.autoConfig, ...config } })),
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
        set((state) => ({
          generationInputs: {
            crimeTypes: inputs.crimeTypes ?? state.generationInputs.crimeTypes,
            neighbourhood: inputs.neighbourhood ?? state.generationInputs.neighbourhood,
            timeWindow: {
              start: inputs.timeWindow?.start ?? state.generationInputs.timeWindow.start,
              end: inputs.timeWindow?.end ?? state.generationInputs.timeWindow.end,
            },
            granularity: inputs.granularity ?? state.generationInputs.granularity,
          },
        })),
      setGenerationStatus: (status) => set({ generationStatus: status }),
      setPendingGeneratedBins: (bins, metadata) =>
        set({
          pendingGeneratedBins: bins,
          lastGeneratedMetadata: { ...metadata, generatedAt: Date.now() },
          generationStatus: 'ready',
          generationError: null,
        }),
      generateBinsFromActivePresetBias: () => {
        const { preset, presetBiases, generationInputs } = get();
        const presetBias = clampPresetBias(presetBiases[preset]);

        set({ generationStatus: 'generating', generationError: null });

        const generated = generateDemoBinsFromPresetBias(preset, presetBias, generationInputs);

        if (generated.bins.length === 0) {
          set({
            pendingGeneratedBins: [],
            generationStatus: 'error',
            generationError: generated.warning ?? 'Could not generate draft slices from this preset.',
          });
          return false;
        }

        set({
          pendingGeneratedBins: generated.bins,
          generationStatus: 'ready',
          generationError: null,
          lastGeneratedMetadata: {
            generatedAt: Date.now(),
            binCount: generated.bins.length,
            eventCount: generated.eventCount,
            warning: generated.warning,
            generationSource: 'preset-bias',
            preset,
            presetBias,
            inputs: generationInputs,
          },
        });

        return true;
      },
      generateBurstDraftBinsFromWindows: (burstWindows) => {
        const { preset, presetBiases, generationInputs } = get();
        const presetBias = clampPresetBias(presetBiases[preset]);

        set({ generationStatus: 'generating', generationError: null });

        const generated = buildBurstDraftBinsFromWindows(burstWindows, generationInputs);

        if (generated.shouldFallbackToPresetBias || generated.bins.length === 0) {
          return get().generateBinsFromActivePresetBias();
        }

        get().setPendingGeneratedBins(generated.bins, {
          binCount: generated.bins.length,
          eventCount: generated.eventCount,
          warning: generated.warning,
          generationSource: 'burst-windows',
          preset,
          presetBias,
          inputs: generationInputs,
        });

        return true;
      },
      setGenerationError: (message) => set({ generationError: message, generationStatus: message ? 'error' : 'idle' }),
      clearPendingGeneratedBins: () => set({ pendingGeneratedBins: [], generationStatus: 'idle' }),
      replacePendingGeneratedBins: (bins) => set({ pendingGeneratedBins: bins }),
      mergePendingGeneratedBins: (binIds) => set((state) => ({ pendingGeneratedBins: mergeBins(state.pendingGeneratedBins, binIds) })),
      splitPendingGeneratedBin: (binId, splitPoint) => set((state) => ({ pendingGeneratedBins: splitBin(state.pendingGeneratedBins, binId, splitPoint) })),
      deletePendingGeneratedBin: (binId) => set((state) => ({ pendingGeneratedBins: deleteBin(state.pendingGeneratedBins, binId) })),
      applyGeneratedBins: () => {
        set({
          lastAppliedAt: Date.now(),
          generationStatus: 'applied',
          pendingGeneratedBins: [],
        });
        return true;
      },
    }),
    {
      name: 'dashboard-demo-timeslicing-mode-v1',
      partialize: (state) => ({
        mode: state.mode,
        preset: state.preset,
        presetBiases: state.presetBiases,
        customIntervals: state.customIntervals,
        autoConfig: state.autoConfig,
        isCreatingSlice: state.isCreatingSlice,
        creationStart: state.creationStart,
        sliceTemplates: state.sliceTemplates,
        generationInputs: state.generationInputs,
        generationStatus: state.generationStatus,
        generationError: state.generationError,
        pendingGeneratedBins: state.pendingGeneratedBins,
        lastGeneratedMetadata: state.lastGeneratedMetadata,
        lastAppliedAt: state.lastAppliedAt,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }

        const typedPersisted = persistedState as Partial<DashboardDemoTimeslicingState>;
        const merged = {
          ...currentState,
          ...typedPersisted,
        };

        return {
          ...merged,
          presetBiases: sanitizePresetBiases(typedPersisted.presetBiases),
        };
      },
    }
  )
);

export type { TimeBin } from '@/lib/binning/types';
