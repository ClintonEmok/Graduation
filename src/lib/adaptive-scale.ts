import { max } from 'd3-array';

export interface TimePoint {
  timestamp: Date | number;
  [key: string]: any;
}

export interface AdaptiveScaleConfig {
  domain: number[];
  range: number[];
}

function getTime(t: Date | number): number {
  return t instanceof Date ? t.getTime() : t;
}

/**
 * Calculates the adaptive scale configuration (domain and range arrays)
 * to be used with d3.scaleLinear().
 */
export function getAdaptiveScaleConfig(
  data: TimePoint[],
  timeRange: [Date | number, Date | number],
  yRange: [number, number],
  binCount: number = 100
): AdaptiveScaleConfig {
  if (!data || data.length === 0) {
    return {
      domain: [getTime(timeRange[0]), getTime(timeRange[1])],
      range: [yRange[0], yRange[1]]
    };
  }

  const tStart = getTime(timeRange[0]);
  const tEnd = getTime(timeRange[1]);
  const [yMin, yMax] = yRange;
  const tSpan = tEnd - tStart;
  
  if (tSpan <= 0) {
    return {
      domain: [tStart, tEnd],
      range: [yMin, yMax]
    };
  }

  // 1. Binning
  const counts = new Float64Array(binCount);
  
  for (const d of data) {
    const t = getTime(d.timestamp);
    const norm = (t - tStart) / tSpan;
    const idx = Math.floor(norm * binCount);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    counts[clampedIdx]++;
  }
  
  // 2. Weights
  const maxDensity = max(counts) || 1;
  const weights = new Float64Array(binCount);
  
  for (let i = 0; i < binCount; i++) {
    const density = counts[i];
    // Scale Logic: Base 1 + (density/max * 5)
    weights[i] = 1 + (density / maxDensity) * 5;
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const totalHeight = yMax - yMin;
  
  // 3. Build Domain and Range Arrays
  const domain = new Array(binCount + 1);
  const range = new Array(binCount + 1);
  
  let currentY = yMin;
  const binSize = tSpan / binCount;

  for (let i = 0; i < binCount; i++) {
    domain[i] = tStart + i * binSize;
    range[i] = currentY;
    
    const binHeight = (weights[i] / totalWeight) * totalHeight;
    currentY += binHeight;
  }
  
  domain[binCount] = tEnd;
  range[binCount] = yMax;

  return { domain, range };
}

/**
 * Computes the Y (vertical) positions for points based on adaptive temporal scaling.
 */
export function computeAdaptiveY(
  data: TimePoint[],
  timeRange: [Date | number, Date | number],
  yRange: [number, number],
  binCount: number = 100
): number[] {
  if (!data || data.length === 0) return [];

  const tStart = getTime(timeRange[0]);
  const tEnd = getTime(timeRange[1]);
  const tSpan = tEnd - tStart;

  // Use the shared config logic
  const { range: yStarts } = getAdaptiveScaleConfig(data, timeRange, yRange, binCount);
  
  return data.map(d => {
    const t = getTime(d.timestamp);
    const norm = (t - tStart) / tSpan;
    
    // Calculate fractional index
    const fractionalIdx = norm * binCount;
    const idx = Math.floor(fractionalIdx);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    
    let tInBin = fractionalIdx - idx;
    
    if (idx >= binCount) tInBin = 1;
    if (idx < 0) tInBin = 0;
    
    const binStart = yStarts[clampedIdx];
    const binEnd = yStarts[clampedIdx + 1];
    
    return binStart + tInBin * (binEnd - binStart);
  });
}

