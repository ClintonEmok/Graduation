import { create } from 'zustand';
import { TimeBin, SavedConfiguration } from '@/lib/binning/types';
import { BinningStrategy, BinningConstraint, getPresetConfig } from '@/lib/binning/rules';
import { generateBins } from '@/lib/binning/engine';

interface CrimeEventData {
  timestamp: number;
  type: string;
  district?: string;
}

interface BinningState {
  strategy: BinningStrategy;
  constraints: BinningConstraint;
  bins: TimeBin[];
  isComputing: boolean;
  metadata: {
    totalEvents: number;
    binCount: number;
    timeSpan: number;
    avgEventsPerBin: number;
  } | null;
  selectedBinId: string | null;
  modificationHistory: Array<{ type: string; binIds: string[]; timestamp: number }>;
  savedConfigurations: SavedConfiguration[];
  data: CrimeEventData[];
  domain: [number, number];
  setStrategy: (strategy: BinningStrategy) => void;
  setConstraints: (constraints: Partial<BinningConstraint>) => void;
  computeBins: (data: CrimeEventData[], domain?: [number, number]) => void;
  selectBin: (binId: string | null) => void;
  mergeBins: (binIds: string[]) => void;
  splitBin: (binId: string, splitPoint: number) => void;
  deleteBin: (binId: string) => void;
  resizeBin: (binId: string, newStartTime: number, newEndTime: number) => void;
  saveConfiguration: (name: string) => void;
  loadConfiguration: (configId: string) => void;
  deleteConfiguration: (configId: string) => void;
  undo: () => void;
  reset: () => void;
}

let configIdCounter = 0;

export const useBinningStore = create<BinningState>((set, get) => ({
  strategy: 'auto-adaptive',
  constraints: {
    minEvents: 5,
    maxEvents: 500,
    maxBins: 40,
    contiguous: true,
  },
  bins: [],
  isComputing: false,
  metadata: null,
  selectedBinId: null,
  modificationHistory: [],
  savedConfigurations: [],
  data: [],
  domain: [0, 0],

  setStrategy: (strategy) => {
    const state = get();
    const config = getPresetConfig(strategy);
    set({
      strategy,
      constraints: { ...state.constraints, ...config.constraints },
    });
    if (state.data.length > 0) {
      get().computeBins(state.data, state.domain);
    }
  },

  setConstraints: (newConstraints) => {
    set((state) => ({
      constraints: { ...state.constraints, ...newConstraints },
    }));
    const state = get();
    if (state.data.length > 0) {
      get().computeBins(state.data, state.domain);
    }
  },

  computeBins: (data, domain) => {
    const state = get();
    const timeDomain = domain || state.domain;

    if (data.length === 0) {
      set({ bins: [], metadata: null });
      return;
    }

    set({ isComputing: true });

    const config = {
      strategy: state.strategy,
      constraints: state.constraints,
      domain: timeDomain,
    };

    setTimeout(() => {
      const result = generateBins(data, config);
      set({
        bins: result.bins,
        metadata: result.metadata,
        isComputing: false,
        data,
        domain: timeDomain,
      });
    }, 0);
  },

  selectBin: (binId) => {
    set({ selectedBinId: binId });
  },

  mergeBins: (binIds) => {
    const state = get();
    if (binIds.length < 2) return;

    const sortedBins = binIds
      .map(id => state.bins.find(b => b.id === id))
      .filter((b): b is TimeBin => Boolean(b))
      .sort((a, b) => a.startTime - b.startTime);

    if (sortedBins.length < 2) return;

    const newBin: TimeBin = {
      id: `merged-${Date.now()}`,
      startTime: sortedBins[0].startTime,
      endTime: sortedBins[sortedBins.length - 1].endTime,
      count: sortedBins.reduce((sum, b) => sum + b.count, 0),
      crimeTypes: Array.from(new Set(sortedBins.flatMap(b => b.crimeTypes))),
      districts: Array.from(new Set(sortedBins.flatMap(b => b.districts || []))),
      avgTimestamp: sortedBins.reduce((sum, b) => sum + b.avgTimestamp * b.count, 0) / sortedBins.reduce((sum, b) => sum + b.count, 0),
      isModified: true,
      mergedFrom: sortedBins.map(b => b.id),
    };

    const newBins = state.bins
      .filter(b => !binIds.includes(b.id))
      .concat(newBin)
      .sort((a, b) => a.startTime - b.startTime);

    set({
      bins: newBins,
      selectedBinId: newBin.id,
      modificationHistory: [
        ...state.modificationHistory,
        { type: 'merge', binIds, timestamp: Date.now() },
      ],
    });
  },

  splitBin: (binId, splitPoint) => {
    const state = get();
    const bin = state.bins.find(b => b.id === binId);
    if (!bin) return;

    const bin1: TimeBin = {
      id: `split1-${Date.now()}`,
      startTime: bin.startTime,
      endTime: splitPoint,
      count: Math.floor(bin.count / 2),
      crimeTypes: bin.crimeTypes,
      districts: bin.districts,
      avgTimestamp: (bin.startTime + splitPoint) / 2,
      isModified: true,
    };

    const bin2: TimeBin = {
      id: `split2-${Date.now()}`,
      startTime: splitPoint,
      endTime: bin.endTime,
      count: bin.count - bin1.count,
      crimeTypes: bin.crimeTypes,
      districts: bin.districts,
      avgTimestamp: (splitPoint + bin.endTime) / 2,
      isModified: true,
    };

    const newBins = state.bins
      .filter(b => b.id !== binId)
      .concat([bin1, bin2])
      .sort((a, b) => a.startTime - b.startTime);

    set({
      bins: newBins,
      modificationHistory: [
        ...state.modificationHistory,
        { type: 'split', binIds: [binId], timestamp: Date.now() },
      ],
    });
  },

  deleteBin: (binId) => {
    const state = get();
    const newBins = state.bins.filter(b => b.id !== binId);

    set({
      bins: newBins,
      selectedBinId: state.selectedBinId === binId ? null : state.selectedBinId,
      modificationHistory: [
        ...state.modificationHistory,
        { type: 'delete', binIds: [binId], timestamp: Date.now() },
      ],
    });
  },

  resizeBin: (binId, newStartTime, newEndTime) => {
    const state = get();
    if (newEndTime <= newStartTime) return;

    const newBins = state.bins.map(bin => {
      if (bin.id !== binId) return bin;
      return {
        ...bin,
        startTime: newStartTime,
        endTime: newEndTime,
        isModified: true,
      };
    });

    set({
      bins: newBins,
      modificationHistory: [
        ...state.modificationHistory,
        { type: 'resize', binIds: [binId], timestamp: Date.now() },
      ],
    });
  },

  saveConfiguration: (name) => {
    const state = get();
    const config: SavedConfiguration = {
      id: `config-${++configIdCounter}`,
      name,
      config: {
        strategy: state.strategy,
        constraints: state.constraints,
        domain: state.domain,
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    set({
      savedConfigurations: [...state.savedConfigurations, config],
    });
  },

  loadConfiguration: (configId) => {
    const state = get();
    const config = state.savedConfigurations.find(c => c.id === configId);
    if (!config) return;

    set({
      strategy: config.config.strategy,
      constraints: config.config.constraints,
      domain: config.config.domain,
    });

    if (state.data.length > 0) {
      get().computeBins(state.data, config.config.domain);
    }
  },

  deleteConfiguration: (configId) => {
    const state = get();
    set({
      savedConfigurations: state.savedConfigurations.filter(c => c.id !== configId),
    });
  },

  undo: () => {
    const state = get();
    if (state.data.length > 0) {
      get().computeBins(state.data, state.domain);
    }
  },

  reset: () => {
    set({
      strategy: 'auto-adaptive',
      constraints: {
        minEvents: 5,
        maxEvents: 500,
        maxBins: 40,
        contiguous: true,
      },
      bins: [],
      metadata: null,
      selectedBinId: null,
      modificationHistory: [],
    });
  },
}));