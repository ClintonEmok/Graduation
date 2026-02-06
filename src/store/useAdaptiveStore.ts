import { create } from 'zustand';
import { ADAPTIVE_BIN_COUNT, ADAPTIVE_KERNEL_WIDTH } from '@/lib/adaptive-utils';

interface AdaptiveState {
  warpFactor: number; // 0 = Linear, 1 = Fully Adaptive
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  isComputing: boolean;
  
  setWarpFactor: (v: number) => void;
  computeMaps: (timestamps: Float32Array, domain: [number, number]) => void;
}

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
            const { densityMap, warpMap } = e.data;
            set({ densityMap, warpMap, isComputing: false });
        };
    }

    return {
      warpFactor: 0,
      densityMap: null,
      warpMap: null,
      isComputing: false,
      
      setWarpFactor: (v) => set({ warpFactor: v }),
      
      computeMaps: (timestamps, domain) => {
        if (!worker) return;
        set({ isComputing: true });
        
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
