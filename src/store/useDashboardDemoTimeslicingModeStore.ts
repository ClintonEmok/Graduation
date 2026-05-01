import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildNonUniformDraftBinsFromSelection } from '@/components/dashboard-demo/lib/demo-burst-generation';
import type { TimeBin } from '@/lib/binning/types';
import type { CrimeRecord } from '@/types/crime';
import { useSliceDomainStore } from './useSliceDomainStore';

export type TimeslicingMode = 'auto' | 'manual';

export type TimeslicingGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
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

interface DashboardDemoTimeslicingState {
  mode: TimeslicingMode;
  setMode: (mode: TimeslicingMode) => void;
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
  generationInputs: GenerationInputs;
  generationStatus: GenerationStatus;
  generationError: string | null;
  pendingGeneratedBins: TimeBin[];
  lastGeneratedMetadata: GenerationResultMetadata | null;
  lastAppliedAt: number | null;
  setGenerationInputs: (inputs: Partial<GenerationInputs>) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setPendingGeneratedBins: (bins: TimeBin[], metadata: Omit<GenerationResultMetadata, 'generatedAt'>) => void;
  generateBurstDraftBinsFromWindows: () => Promise<boolean>;
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

  const preservedMetadataSource = selected.find(hasBurstMetadata) ?? selected[0];
  const preservedWarpWeight = Math.max(...selected.map((bin) => bin.warpWeight ?? 1));

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
    ...copyBurstMetadata(preservedMetadataSource),
    warpWeight: preservedWarpWeight,
    isNeutralPartition: selected.every((bin) => bin.isNeutralPartition),
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
  const inheritedMetadata = copyBurstMetadata(target);

  const left: TimeBin = {
    id: `pending-split-1-${now}`,
    startTime: target.startTime,
    endTime: splitPoint,
    count: leftCount,
    crimeTypes: target.crimeTypes,
    districts: target.districts,
    avgTimestamp: (target.startTime + splitPoint) / 2,
    ...inheritedMetadata,
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
    ...inheritedMetadata,
    isModified: true,
  };

  return bins
    .filter((bin) => bin.id !== binId)
    .concat([left, right])
    .sort((a, b) => a.startTime - b.startTime);
};

const deleteBin = (bins: TimeBin[], binId: string): TimeBin[] => bins.filter((bin) => bin.id !== binId);

const hasValidTimeWindow = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

const fetchCrimeRecordsForSelection = async (
  generationInputs: GenerationInputs,
  limit: number
): Promise<CrimeRecord[]> => {
  const activeStart = generationInputs.timeWindow.start;
  const activeEnd = generationInputs.timeWindow.end;

  if (!hasValidTimeWindow(activeStart) || !hasValidTimeWindow(activeEnd)) {
    return [];
  }

  const searchParams = new URLSearchParams({
    startEpoch: String(Math.floor(Math.min(activeStart, activeEnd) / 1000)),
    endEpoch: String(Math.floor(Math.max(activeStart, activeEnd) / 1000)),
    bufferDays: '0',
    limit: String(limit),
  });

  const crimeTypes = generationInputs.crimeTypes.filter((type) => type !== 'all-crime-types');
  if (crimeTypes.length > 0) {
    searchParams.set('crimeTypes', crimeTypes.join(','));
  }

  if (generationInputs.neighbourhood) {
    searchParams.set('districts', generationInputs.neighbourhood);
  }

  const response = await fetch(`/api/crimes/range?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Burst selection crime fetch failed with status ${response.status}`);
  }

  const result = (await response.json()) as { data?: CrimeRecord[] };
  return Array.isArray(result.data) ? result.data : [];
};

const BURST_METADATA_KEYS = [
  'burstClass',
  'burstRuleVersion',
  'burstScore',
  'burstinessCoefficient',
  'burstinessFormula',
  'burstinessCalculation',
  'burstinessByType',
  'burstConfidence',
  'warpWeight',
  'isNeutralPartition',
  'burstProvenance',
  'tieBreakReason',
  'thresholdSource',
  'neighborhoodSummary',
] as const;

const hasBurstMetadata = (bin: TimeBin): boolean => BURST_METADATA_KEYS.some((key) => bin[key] !== undefined);

const copyBurstMetadata = (bin: TimeBin | undefined): Partial<TimeBin> => {
  if (!bin) {
    return {};
  }

  return BURST_METADATA_KEYS.reduce<Partial<TimeBin>>((metadata, key) => {
    if (bin[key] !== undefined) {
      (metadata as Record<string, unknown>)[key] = bin[key];
    }
    return metadata;
  }, {});
};

export const stripTransientTimeslicingState = (
  state: Partial<DashboardDemoTimeslicingState> | undefined
): Partial<DashboardDemoTimeslicingState> => ({
  mode: state?.mode ?? 'auto',
  customIntervals: state?.customIntervals ?? [],
  autoConfig: state?.autoConfig ?? {
    minBurstEvents: 10,
    burstThreshold: 0.7,
    maxSlices: 20,
  },
  sliceTemplates: state?.sliceTemplates ?? [
    { id: '1h', name: '1 Hour', duration: 3600000, color: '#3b82f6' },
    { id: '4h', name: '4 Hours', duration: 4 * 3600000, color: '#10b981' },
    { id: '8h', name: '8 Hours (Workday)', duration: 8 * 3600000, color: '#f59e0b' },
    { id: '24h', name: '24 Hours (Day)', duration: 24 * 3600000, color: '#8b5cf6' },
    { id: '7d', name: '7 Days (Week)', duration: 7 * 24 * 3600000, color: '#ec4899' },
  ],
  generationInputs: state?.generationInputs ?? {
    crimeTypes: [],
    neighbourhood: null,
    timeWindow: {
      start: null,
      end: null,
    },
    granularity: 'daily',
  },
});

export const useDashboardDemoTimeslicingModeStore = create<DashboardDemoTimeslicingState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      setMode: (mode) => set({ mode }),
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
      generateBurstDraftBinsFromWindows: async () => {
        const { generationInputs } = get();

        const { timeWindow } = generationInputs;
        if (!hasValidTimeWindow(timeWindow.start) || !hasValidTimeWindow(timeWindow.end)) {
          set({
            pendingGeneratedBins: [],
            generationStatus: 'error',
            generationError: 'Choose a valid time window before generating burst drafts.',
          });
          return false;
        }

        set({ generationStatus: 'generating', generationError: null });

        try {
          const crimeRecords = await fetchCrimeRecordsForSelection(generationInputs, 100000);
          const generated = buildNonUniformDraftBinsFromSelection({
            ...generationInputs,
            eventTimestamps: crimeRecords.map((crime) => crime.timestamp * 1000),
            eventTypes: crimeRecords.map((crime) => crime.type),
          });

          if (generated.bins.length === 0) {
            set({
              pendingGeneratedBins: [],
              generationStatus: 'error',
              generationError: generated.warning ?? 'Could not generate burst drafts from the selected window.',
            });
            return false;
          }

          get().setPendingGeneratedBins(generated.bins, {
            binCount: generated.bins.length,
            eventCount: generated.eventCount,
            warning: generated.warning,
            inputs: generationInputs,
          });

          return true;
        } catch (error) {
          set({
            pendingGeneratedBins: [],
            generationStatus: 'error',
            generationError: error instanceof Error ? error.message : 'Failed to fetch crimes for the selected bursts.',
          });
          return false;
        }
      },
      setGenerationError: (message) => set({ generationError: message, generationStatus: message ? 'error' : 'idle' }),
      clearPendingGeneratedBins: () => set({ pendingGeneratedBins: [], generationStatus: 'idle' }),
      replacePendingGeneratedBins: (bins) => set({ pendingGeneratedBins: bins }),
      mergePendingGeneratedBins: (binIds) => set((state) => ({ pendingGeneratedBins: mergeBins(state.pendingGeneratedBins, binIds) })),
      splitPendingGeneratedBin: (binId, splitPoint) => set((state) => ({ pendingGeneratedBins: splitBin(state.pendingGeneratedBins, binId, splitPoint) })),
      deletePendingGeneratedBin: (binId) => set((state) => ({ pendingGeneratedBins: deleteBin(state.pendingGeneratedBins, binId) })),
      applyGeneratedBins: (domain) => {
        const { pendingGeneratedBins } = get();

        if (!pendingGeneratedBins.length) {
          return false;
        }

        useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);

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
      version: 2,
      partialize: (state) => ({
        mode: state.mode,
        customIntervals: state.customIntervals,
        autoConfig: state.autoConfig,
        sliceTemplates: state.sliceTemplates,
        generationInputs: state.generationInputs,
      }),
      migrate: (persistedState) => stripTransientTimeslicingState(persistedState as Partial<DashboardDemoTimeslicingState> | undefined),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }

        return {
          ...currentState,
          ...(persistedState as Partial<DashboardDemoTimeslicingState>),
        };
      },
    }
  )
);

export type { TimeBin } from '@/lib/binning/types';
