import { max } from 'd3-array';

export interface TimePoint {
  timestamp: Date;
  [key: string]: any;
}

/**
 * Computes the Y (vertical) positions for points based on adaptive temporal scaling.
 * High-density time periods are expanded (given more Y space), while maintaining
 * a monotonic time axis.
 * 
 * @param data Array of objects with a timestamp
 * @param timeRange [start, end] of the visualization
 * @param yRange [min, max] of the vertical space (e.g. [0, 100])
 * @param binCount Resolution of the density calculation (default 100)
 * @returns Array of Y numbers corresponding to the input data order
 */
export function computeAdaptiveY(
  data: TimePoint[],
  timeRange: [Date, Date],
  yRange: [number, number],
  binCount: number = 100
): number[] {
  if (!data || data.length === 0) return [];

  const [tMin, tMax] = timeRange;
  const [yMin, yMax] = yRange;
  const totalHeight = yMax - yMin;
  const tStart = tMin.getTime();
  const tEnd = tMax.getTime();
  const tSpan = tEnd - tStart;
  
  // Edge case: zero time span
  if (tSpan <= 0) return data.map(() => yMin);

  // 1. Binning (Manual uniform binning for precise inversion)
  // We use a manual loop instead of d3.bin to ensure strict correspondence 
  // between the density bin index and the interpolation lookup index.
  const counts = new Float64Array(binCount);
  
  for (const d of data) {
    const t = d.timestamp.getTime();
    // Normalize t to 0..1 relative to range
    const norm = (t - tStart) / tSpan;
    // Find bin index
    const idx = Math.floor(norm * binCount);
    // Clamp to valid bins (handles inclusive end or slight outliers)
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    counts[clampedIdx]++;
  }
  
  // 2. Weights
  // Calculate density factor for each bin
  const maxDensity = max(counts) || 1;
  const weights = new Float64Array(binCount);
  
  for (let i = 0; i < binCount; i++) {
    const density = counts[i];
    // Scale Logic:
    // Base weight = 1 (Linear baseline)
    // Adaptive bonus = (density / maxDensity) * Strength
    // Strength = 5 (Configurable? Hardcoded for now per research)
    weights[i] = 1 + (density / maxDensity) * 5;
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  // 3. Build Cumulative Map (Y Starts)
  // yStarts[i] is the Y coordinate where Bin i begins
  const yStarts = new Float64Array(binCount + 1);
  yStarts[0] = yMin;
  let currentY = yMin;
  
  for (let i = 0; i < binCount; i++) {
    const binHeight = (weights[i] / totalWeight) * totalHeight;
    currentY += binHeight;
    yStarts[i+1] = currentY;
  }
  
  // Ensure the last Y is exactly yMax (fix floating point drift)
  yStarts[binCount] = yMax;
  
  // 4. Map Points to Y
  return data.map(d => {
    const t = d.timestamp.getTime();
    const norm = (t - tStart) / tSpan;
    
    // Calculate fractional index
    const fractionalIdx = norm * binCount;
    const idx = Math.floor(fractionalIdx);
    const clampedIdx = Math.max(0, Math.min(idx, binCount - 1));
    
    // Interpolation within the bin
    // Local t (0..1) within the bin
    // If norm is 0.55 and binCount is 10, fractionalIdx is 5.5. idx is 5.
    // tInBin is 0.5.
    let tInBin = fractionalIdx - idx;
    
    // Edge case handling for t=tMax (norm=1 -> idx=binCount, clamped=binCount-1)
    if (idx >= binCount) tInBin = 1;
    if (idx < 0) tInBin = 0;
    
    const binStart = yStarts[clampedIdx];
    const binEnd = yStarts[clampedIdx + 1];
    
    return binStart + tInBin * (binEnd - binStart);
  });
}
