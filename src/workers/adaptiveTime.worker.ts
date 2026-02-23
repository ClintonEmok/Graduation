export interface WorkerConfig {
  binCount: number;
  kernelWidth?: number;
}

export interface WorkerInput {
  requestId: number;
  timestamps: Float32Array;
  domain: [number, number];
  config: WorkerConfig;
}

export interface WorkerOutput {
  requestId: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { requestId, timestamps, domain, config } = e.data;
  const { binCount, kernelWidth = 1 } = config;

  const tStart = domain[0];
  const tEnd = domain[1];
  const tSpan = tEnd - tStart || 1;

  if (!timestamps || timestamps.length === 0) {
    const emptyDensity = new Float32Array(binCount);
    const emptyBurstiness = new Float32Array(binCount);
    const emptyWarp = new Float32Array(binCount);
    // Default linear warp map across the provided domain
    const denom = binCount > 1 ? binCount - 1 : 1;
    for (let i = 0; i < binCount; i++) {
      emptyWarp[i] = tStart + (i / denom) * tSpan;
    }
    self.postMessage(
      { requestId, densityMap: emptyDensity, burstinessMap: emptyBurstiness, warpMap: emptyWarp }
    );
    return;
  }

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
    warpMap[i] = tStart + (accumulated / totalWeight) * tSpan;
    accumulated += weights[i];
  }

  // Normalize density for visualization (0-1)
  const normalizedDensity = new Float32Array(binCount);
  for (let i = 0; i < binCount; i++) {
    normalizedDensity[i] = smoothedDensity[i] / maxDensity;
  }

  // 4. Burstiness (inter-arrival) per bin
  const burstCounts = new Float32Array(binCount);
  const burstSum = new Float32Array(binCount);
  const burstSumSq = new Float32Array(binCount);
  const sorted = Array.from(timestamps)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sorted.length > 1) {
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i] - sorted[i - 1];
      if (!Number.isFinite(delta) || delta < 0) continue;
      const norm = (sorted[i] - tStart) / tSpan;
      if (norm < 0 || norm > 1) continue;
      const idx = Math.min(Math.floor(norm * binCount), binCount - 1);
      burstCounts[idx] += 1;
      burstSum[idx] += delta;
      burstSumSq[idx] += delta * delta;
    }
  }

  const burstinessMap = new Float32Array(binCount);
  for (let i = 0; i < binCount; i++) {
    const count = burstCounts[i];
    if (count <= 1) {
      burstinessMap[i] = 0;
      continue;
    }
    const mean = burstSum[i] / count;
    const variance = Math.max(0, burstSumSq[i] / count - mean * mean);
    const sigma = Math.sqrt(variance);
    const denom = sigma + mean;
    const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
    const normalized = Math.max(0, Math.min(1, (burstiness + 1) / 2));
    burstinessMap[i] = normalized;
  }

  self.postMessage(
    { requestId, densityMap: normalizedDensity, burstinessMap, warpMap }
  );
};
