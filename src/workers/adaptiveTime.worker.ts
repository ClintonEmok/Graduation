/* eslint-disable no-restricted-globals */

export interface WorkerConfig {
  binCount: number;
  kernelWidth?: number;
}

export interface WorkerInput {
  timestamps: Float32Array;
  domain: [number, number];
  config: WorkerConfig;
}

export interface WorkerOutput {
  densityMap: Float32Array;
  warpMap: Float32Array;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { timestamps, domain, config } = e.data;
  const { binCount, kernelWidth = 1 } = config;

  if (!timestamps || timestamps.length === 0) {
    const emptyDensity = new Float32Array(binCount);
    const emptyWarp = new Float32Array(binCount);
    // Default linear warp map (0 to 1)
    for (let i = 0; i < binCount; i++) {
      emptyWarp[i] = i / binCount;
    }
    self.postMessage(
      { densityMap: emptyDensity, warpMap: emptyWarp }, 
      [emptyDensity.buffer, emptyWarp.buffer] as any
    );
    return;
  }

  const tStart = domain[0];
  const tEnd = domain[1];
  const tSpan = tEnd - tStart || 1;

  // 1. Binning (Histogram)
  const density = new Float32Array(binCount);

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const norm = (t - tStart) / tSpan;
    if (norm >= 0 && norm <= 1) {
      const idx = Math.floor(norm * binCount);
      const clampedIdx = idx >= binCount ? binCount - 1 : idx;
      density[clampedIdx]++;
    }
  }

  // 2. Smoothing (Simple Moving Average)
  let smoothedDensity = density;
  if (kernelWidth > 1) {
    smoothedDensity = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) {
      let sum = 0;
      let count = 0;
      for (let k = -kernelWidth; k <= kernelWidth; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < binCount) {
          sum += density[idx];
          count++;
        }
      }
      smoothedDensity[i] = sum / count;
    }
  }

  // 3. Compute CDF (Warp Map)
  // Weight logic: 1 + (density / max * 5)
  // This makes dense areas 6x "larger" in warped time than empty areas.
  let maxDensity = 0;
  for (let i = 0; i < binCount; i++) {
    if (smoothedDensity[i] > maxDensity) maxDensity = smoothedDensity[i];
  }
  if (maxDensity === 0) maxDensity = 1;

  const weights = new Float32Array(binCount);
  let totalWeight = 0;

  for (let i = 0; i < binCount; i++) {
    const w = 1 + (smoothedDensity[i] / maxDensity) * 5;
    weights[i] = w;
    totalWeight += w;
  }

  const warpMap = new Float32Array(binCount);
  let accumulated = 0;
  for (let i = 0; i < binCount; i++) {
    // warpMap[i] represents the warped start position of bin i
    warpMap[i] = accumulated / totalWeight;
    accumulated += weights[i];
  }

  // Normalize density for visualization (0-1)
  const normalizedDensity = new Float32Array(binCount);
  for (let i = 0; i < binCount; i++) {
    normalizedDensity[i] = smoothedDensity[i] / maxDensity;
  }

  self.postMessage(
    { densityMap: normalizedDensity, warpMap }, 
    [normalizedDensity.buffer, warpMap.buffer] as any
  );
};
