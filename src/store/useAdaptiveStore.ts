import { create } from 'zustand';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';

interface AdaptiveState {
  warpFactor: number; // 0 = Linear, 1 = Fully Adaptive
  densityMap: Float32Array | null;
  burstinessMap: Float32Array | null;
  warpMap: Float32Array | null;
  isComputing: boolean;
  burstMetric: 'density' | 'burstiness';
  burstThreshold: number;
  burstCutoff: number;
  mapDomain: [number, number];
  
  setWarpFactor: (v: number) => void;
  setBurstMetric: (metric: AdaptiveState['burstMetric']) => void;
  setBurstThreshold: (v: number) => void;
  computeMaps: (timestamps: Float32Array, domain: [number, number]) => void;
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

if (typeof window !== 'undefined') {
  // Use new URL(...) pattern for Vite/Webpack worker compatibility
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}

export const useAdaptiveStore = create<AdaptiveState>((set) => {
    // Setup listener
    if (worker) {
        worker.onmessage = (e) => {
            const { densityMap, burstinessMap, warpMap } = e.data;
            set((state) => ({
              densityMap,
              burstinessMap,
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
      densityMap: null,
      burstinessMap: null,
      warpMap: null,
      isComputing: false,
      burstMetric: 'density',
      burstThreshold: 0.7,
      burstCutoff: 1,
      mapDomain: [0, 100],
      
      setWarpFactor: (v) => set({ warpFactor: v }),
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
      
      computeMaps: (timestamps, domain) => {
        if (!worker) return;
        set({ isComputing: true, mapDomain: domain });
        
        // Copy data to avoid detaching the original buffer
        const timestampsCopy = timestamps.slice();
        
        worker.postMessage({
          timestamps: timestampsCopy,
          domain,
          config: {
            binCount: ADAPTIVE_BIN_COUNT,
            kernelWidth: ADAPTIVE_KERNEL_WIDTH
          }
        }, [timestampsCopy.buffer]);
      }
    };
});
