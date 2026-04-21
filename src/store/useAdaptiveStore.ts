import { create } from 'zustand';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { clampComparableWarpWeight, type ComparableWarpGranularity } from '@/lib/binning/warp-scaling';

export type AdaptiveBinningMode = 'uniform-time' | 'uniform-events';

interface ComputeMapsOptions {
  binningMode?: AdaptiveBinningMode;
}

interface AdaptiveState {
  warpFactor: number; // 0 = Linear, 1 = Fully Adaptive
  warpSource: 'density' | 'slice-authored' | 'proposal-applied';
  warpControlMode: 'automatic' | 'manual';
  warpGranularity: ComparableWarpGranularity;
  peerRelativeWarping: boolean;
  manualWarpWeightOverrides: Record<string, number>;
  densityScope: 'viewport' | 'global';
  densityMap: Float32Array | null;
  burstinessMap: Float32Array | null;
  countMap: Float32Array | null;
  warpMap: Float32Array | null;
  isComputing: boolean;
  burstMetric: 'density' | 'burstiness';
  burstThreshold: number;
  burstCutoff: number;
  mapDomain: [number, number];
  
  setWarpFactor: (v: number) => void;
  setWarpSource: (source: AdaptiveState['warpSource']) => void;
  setWarpControlMode: (mode: AdaptiveState['warpControlMode']) => void;
  setWarpGranularity: (granularity: ComparableWarpGranularity) => void;
  setPeerRelativeWarping: (enabled: boolean) => void;
  setManualWarpWeightOverride: (binId: string, weight: number) => void;
  clearManualWarpWeightOverrides: () => void;
  setDensityScope: (scope: AdaptiveState['densityScope']) => void;
  setBurstMetric: (metric: AdaptiveState['burstMetric']) => void;
  setBurstThreshold: (v: number) => void;
  resetSandboxDefaults: () => void;
  setPrecomputedMaps: (
    densityMap: Float32Array,
    burstinessMap: Float32Array,
    warpMap: Float32Array,
    domain: [number, number],
    countMap?: Float32Array | null
  ) => void;
  computeMaps: (timestamps: Float32Array, domain: [number, number], options?: ComputeMapsOptions) => void;
}

const computePercentile = (values: Float32Array, percentile: number): number => {
  if (!values.length) return 1;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, percentile));
  const index = Math.min(sorted.length - 1, Math.floor(clamped * (sorted.length - 1)));
  return sorted[index] ?? 1;
};

const resolveBurstMap = (state: AdaptiveState) => {
  return state.burstMetric === 'burstiness' ? state.burstinessMap : state.densityMap;
};

// Module-level worker instance
let worker: Worker | null = null;
let activeRequestId = 0;

if (typeof window !== 'undefined') {
  // Use new URL(...) pattern for Vite/Webpack worker compatibility
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}

export const useAdaptiveStore = create<AdaptiveState>((set) => {
    // Setup listener
    if (worker) {
        worker.onmessage = (e) => {
            const { requestId, densityMap, burstinessMap, warpMap, countMap } = e.data as {
              requestId: number;
              densityMap: Float32Array;
              burstinessMap: Float32Array;
              warpMap: Float32Array;
              countMap: Float32Array;
            };
            if (requestId !== activeRequestId) {
              return;
            }
            set((state) => ({
              densityMap,
              burstinessMap,
              countMap,
              warpMap,
              isComputing: false,
              burstCutoff: computePercentile(
                state.burstMetric === 'burstiness' ? burstinessMap : densityMap,
                state.burstThreshold
              )
            }));
        };
    }

    return {
      warpFactor: 0,
      warpSource: 'density',
      warpControlMode: 'automatic',
      warpGranularity: 'daily',
      peerRelativeWarping: true,
      manualWarpWeightOverrides: {},
      densityScope: 'viewport',
      densityMap: null,
      burstinessMap: null,
      countMap: null,
      warpMap: null,
      isComputing: false,
      burstMetric: 'density',
      burstThreshold: 0.7,
      burstCutoff: 1,
      mapDomain: [0, 100],
      
      setWarpFactor: (v) => set({ warpFactor: v }),
      setWarpSource: (source) => set({ warpSource: source }),
      setWarpControlMode: (mode) => set({ warpControlMode: mode }),
      setWarpGranularity: (granularity) => set({ warpGranularity: granularity }),
      setPeerRelativeWarping: (enabled) => set({ peerRelativeWarping: enabled }),
      setManualWarpWeightOverride: (binId, weight) =>
        set((state) => ({
          manualWarpWeightOverrides: {
            ...state.manualWarpWeightOverrides,
            [binId]: clampComparableWarpWeight(weight),
          },
        })),
      clearManualWarpWeightOverrides: () => set({ manualWarpWeightOverrides: {} }),
      setDensityScope: (scope) => {
        activeRequestId += 1;
        set({ densityScope: scope, isComputing: false });
      },
      setBurstMetric: (metric) =>
        set((state) => {
          const nextState = { ...state, burstMetric: metric };
          const map = resolveBurstMap(nextState);
          return {
            burstMetric: metric,
            burstCutoff: map ? computePercentile(map, state.burstThreshold) : state.burstCutoff
          };
        }),
      setBurstThreshold: (v) =>
        set((state) => ({
          burstThreshold: v,
          burstCutoff: resolveBurstMap(state) ? computePercentile(resolveBurstMap(state) as Float32Array, v) : state.burstCutoff
        })),
      resetSandboxDefaults: () =>
        set((state) => {
          const nextThreshold = 0.7;
          const map = resolveBurstMap(state);
          return {
            warpFactor: 0,
            warpSource: 'density',
            warpControlMode: 'automatic',
            warpGranularity: 'daily',
            peerRelativeWarping: true,
            manualWarpWeightOverrides: {},
            densityScope: 'viewport',
            burstMetric: 'density',
            burstThreshold: nextThreshold,
            burstCutoff: map ? computePercentile(map, nextThreshold) : 1,
          };
        }),

      setPrecomputedMaps: (densityMap, burstinessMap, warpMap, domain, countMap = null) =>
        {
          activeRequestId += 1;
          set((state) => ({
            densityMap,
            burstinessMap,
            countMap,
            warpMap,
            mapDomain: domain,
            isComputing: false,
            burstCutoff: computePercentile(
              state.burstMetric === 'burstiness' ? burstinessMap : densityMap,
              state.burstThreshold
            )
          }));
        },
      
      computeMaps: (timestamps, domain, options) => {
        if (!worker) return;
        activeRequestId += 1;
        const requestId = activeRequestId;
        const binningMode: AdaptiveBinningMode = options?.binningMode ?? 'uniform-time';
        set({ isComputing: true, mapDomain: domain });
        
        // Copy data to avoid detaching the original buffer
        const timestampsCopy = timestamps.slice();
        
        worker.postMessage({
          requestId,
          timestamps: timestampsCopy,
          domain,
          config: {
            binCount: ADAPTIVE_BIN_COUNT,
            kernelWidth: ADAPTIVE_KERNEL_WIDTH,
            binningMode
          }
        }, [timestampsCopy.buffer]);
      }
    };
});
