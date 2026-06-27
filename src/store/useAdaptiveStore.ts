import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_BURST_INFLUENCE, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';
import { clampComparableWarpWeight, type ComparableWarpGranularity } from '@/lib/binning/warp-scaling';
import { type AdaptiveSignalSource } from '@/lib/signal-sources/contract';
import { type AdaptiveBinningMode } from '@/types/adaptive';

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
  mapDomain: [number, number];
  /**
   * Phase 84 (BFT-01 / BFT-02): runtime-mutable signal source used to
   * compute `warpWeight` for newly created TimeSlices. Defaults to
   * `'burstiness'` to preserve pre-Phase-84 behavior. Persisted in
   * localStorage under key `adaptive-signal-source-v1` so the user's
   * choice survives page reloads.
   */
  activeSignalSource: AdaptiveSignalSource;

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
  setActiveSignalSource: (source: AdaptiveSignalSource) => void;
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

/**
 * Storage adapter for the persist middleware. On the client this returns
 * the real `window.localStorage`; in node (tests) it returns a noop
 * shim that satisfies the `StateStorage` contract without throwing, so
 * `useAdaptiveStore` can be imported in vitest's node environment
 * without crashing. `useEvaluationStudyStore.ts:230-237` uses a similar
 * pattern (returning `null` to disable persistence), but zustand v5's
 * `createJSONStorage` calls `setItem` unconditionally on the resolved
 * value, so we must return a real object whose `setItem` / `getItem`
 * are noops rather than `null`. We also return the noop when
 * `window.localStorage` is `undefined` (e.g. when the test installs a
 * `{}` window shim that does not include `localStorage`).
 */
const noopLocalStorage = (): Storage => {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // fall through to noop
    }
  }
  const noopStateStorage = {
    getItem: (_name: string) => null,
    setItem: (_name: string, _value: string) => {
      // noop
    },
    removeItem: (_name: string) => {
      // noop
    },
  };
  return noopStateStorage as unknown as Storage;
};

// Module-level worker instance
let worker: Worker | null = null;
let activeRequestId = 0;

if (typeof window !== 'undefined') {
  // Use new URL(...) pattern for Vite/Webpack worker compatibility
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}

export const useAdaptiveStore = create<AdaptiveState>()(
  persist(
    (set) => {
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
      burstMetric: 'burstiness',
      burstThreshold: 0.7,
      mapDomain: [0, 100],
      activeSignalSource: 'burstiness' as AdaptiveSignalSource,

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
        set({ burstMetric: metric }),
      setBurstThreshold: (v) =>
        set({ burstThreshold: v }),
      setActiveSignalSource: (source) =>
        set({ activeSignalSource: source }),
      resetSandboxDefaults: () =>
        set((state) => {
          const nextThreshold = 0.7;
          return {
            warpFactor: 0,
            warpSource: 'density',
            warpControlMode: 'automatic',
            warpGranularity: 'daily',
            peerRelativeWarping: true,
            manualWarpWeightOverrides: {},
            densityScope: 'viewport',
            burstMetric: 'burstiness',
            burstThreshold: nextThreshold,
            activeSignalSource: 'burstiness' as AdaptiveSignalSource,
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
            burstInfluence: ADAPTIVE_BURST_INFLUENCE,
            binningMode
          }
        }, [timestampsCopy.buffer]);
      }
    };
  },
  {
    name: 'adaptive-signal-source-v1',
    storage: createJSONStorage(() => noopLocalStorage()),
    partialize: (state) => ({ activeSignalSource: state.activeSignalSource }),
  }
  )
);
