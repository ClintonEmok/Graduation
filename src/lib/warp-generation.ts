/**
 * Warp Profile Generation Module
 * 
 * Analyzes crime density data to generate warp profile suggestions.
 * Uses hybrid approach combining density-weighting with event detection.
 */

import { CrimeRecord } from '@/types/crime';
import { calculateConfidence } from './confidence-scoring';

/**
 * Single density bin
 */
export interface DensityBin {
  epochStart: number;
  epochEnd: number;
  count: number;
  density: number; // normalized 0-1
}

/**
 * Density analysis result
 */
export interface DensityAnalysis {
  bins: DensityBin[];
  timeRange: { start: number; end: number };
  totalCrimes: number;
  peakEpochs: number[]; // epochs with highest density
  lowEpochs: number[];   // epochs with lowest density
}

/**
 * Warp profile emphasis type
 */
export type WarpEmphasis = 'aggressive' | 'balanced' | 'conservative';

/**
 * Warp profile suggestion
 */
export interface WarpProfile {
  name: string;
  intervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number; // 0.5-2.0 warp factor
  }>;
  confidence: number;
  emphasis: WarpEmphasis;
}

/**
 * Options for warp profile generation
 */
export interface GenerateWarpProfilesOptions {
  binCount?: number;
  profileCount?: number;
  intervalCount?: number;
}

/**
 * Analyze crime density over time range.
 * 
 * @param crimes - Array of crime records
 * @param binCount - Number of bins to divide time range into
 * @returns Density analysis result
 */
export function analyzeDensity(
  crimes: CrimeRecord[],
  binCount: number
): DensityAnalysis {
  if (!crimes || crimes.length === 0 || binCount <= 0) {
    return {
      bins: [],
      timeRange: { start: 0, end: 0 },
      totalCrimes: 0,
      peakEpochs: [],
      lowEpochs: [],
    };
  }

  // Find time range
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const crime of crimes) {
    if (crime.timestamp < minTime) minTime = crime.timestamp;
    if (crime.timestamp > maxTime) maxTime = crime.timestamp;
  }

  const range = maxTime - minTime;
  if (range <= 0) {
    return {
      bins: [],
      timeRange: { start: minTime, end: maxTime },
      totalCrimes: crimes.length,
      peakEpochs: [],
      lowEpochs: [],
    };
  }

  // Create bins
  const binSize = range / binCount;
  const bins: DensityBin[] = [];
  
  for (let i = 0; i < binCount; i++) {
    bins.push({
      epochStart: minTime + i * binSize,
      epochEnd: minTime + (i + 1) * binSize,
      count: 0,
      density: 0,
    });
  }

  // Count crimes per bin
  for (const crime of crimes) {
    const binIndex = Math.min(
      Math.floor((crime.timestamp - minTime) / binSize),
      binCount - 1
    );
    if (binIndex >= 0 && binIndex < binCount) {
      bins[binIndex].count++;
    }
  }

  // Normalize density (0-1)
  const maxCount = Math.max(...bins.map(b => b.count));
  for (const bin of bins) {
    bin.density = maxCount > 0 ? bin.count / maxCount : 0;
  }

  // Find peak and low epochs (top/bottom 10%)
  const threshold = Math.max(1, Math.floor(binCount * 0.1));
  const sortedByDensity = [...bins].sort((a, b) => b.density - a.density);
  
  const peakEpochs = sortedByDensity
    .slice(0, threshold)
    .map(b => (b.epochStart + b.epochEnd) / 2);
  
  const lowEpochs = sortedByDensity
    .slice(-threshold)
    .map(b => (b.epochStart + b.epochEnd) / 2);

  return {
    bins,
    timeRange: { start: minTime, end: maxTime },
    totalCrimes: crimes.length,
    peakEpochs,
    lowEpochs,
  };
}

/**
 * Detect significant density changes (events).
 * 
 * Uses change point detection - looks for significant density transitions
 * where density changes by more than 2 standard deviations.
 * 
 * @param densityBins - Array of density bins
 * @returns Array of epoch boundaries where events occur
 */
export function detectEvents(densityBins: DensityBin[]): number[] {
  if (!densityBins || densityBins.length < 3) {
    return [];
  }

  const densities = densityBins.map(b => b.density);
  const n = densities.length;

  // Calculate mean and std dev
  const mean = densities.reduce((a, b) => a + b, 0) / n;
  const variance = densities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // If stdDev is too small, no significant events
  if (stdDev < 0.05) {
    return [];
  }

  const threshold = 1.5 * stdDev; // Significant change threshold
  const events: number[] = [];

  // Find change points using sliding window comparison
  const windowSize = Math.max(2, Math.floor(n / 10));
  
  for (let i = windowSize; i < n - windowSize; i++) {
    const leftMean = densities.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize;
    const rightMean = densities.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;
    
    const change = Math.abs(rightMean - leftMean);
    
    if (change > threshold) {
      const eventEpoch = (densityBins[i].epochStart + densityBins[i].epochEnd) / 2;
      // Avoid adding duplicate events (within 5% of range)
      const range = densityBins[n - 1].epochEnd - densityBins[0].epochStart;
      const tooClose = events.some(e => Math.abs(e - eventEpoch) < range * 0.05);
      
      if (!tooClose) {
        events.push(eventEpoch);
      }
    }
  }

  return events;
}

/**
 * Generate warp profile suggestions from crime data.
 * 
 * Creates 2-3 profiles with different emphasis:
 * - Aggressive: Larger strength variations, more intervals
 * - Balanced: Moderate variations, standard intervals
 * - Conservative: Smaller variations, fewer intervals
 * 
 * @param crimes - Array of crime records
 * @param timeRange - The time range to analyze
 * @param options - Optional configuration
 * @returns Array of warp profiles
 */
export function generateWarpProfiles(
  crimes: CrimeRecord[],
  timeRange: { start: number; end: number },
  options?: GenerateWarpProfilesOptions
): WarpProfile[] {
  const binCount = options?.binCount ?? 50;
  const profileCount = options?.profileCount ?? 3;
  const intervalCount = options?.intervalCount ?? 5;

  if (!crimes || crimes.length === 0 || timeRange.end <= timeRange.start) {
    return [];
  }

  // Analyze density
  const analysis = analyzeDensity(crimes, binCount);
  
  if (analysis.bins.length === 0) {
    return [];
  }

  // Detect events for boundary hints
  const events = detectEvents(analysis.bins);

  // Generate density array for confidence scoring
  const densityArray = analysis.bins.map(b => b.density);

  // Calculate overall confidence
  const confidence = calculateConfidence({
    crimes,
    timeRange,
    densityBins: densityArray,
  });

  // Build profiles based on emphasis
  const profiles: WarpProfile[] = [];

  // Determine number of intervals per profile based on emphasis
  const intervalsByEmphasis: Record<WarpEmphasis, number> = {
    aggressive: Math.min(intervalCount + 2, 12),
    balanced: intervalCount,
    conservative: Math.max(intervalCount - 2, 3),
  };

  // Determine strength variation based on emphasis
  const strengthRangeByEmphasis: Record<WarpEmphasis, [number, number]> = {
    aggressive: [0.5, 2.0],
    balanced: [0.7, 1.5],
    conservative: [0.8, 1.3],
  };

  const emphases: WarpEmphasis[] = ['aggressive', 'balanced', 'conservative'];
  const names: Record<WarpEmphasis, string> = {
    aggressive: 'High Density Focus',
    balanced: 'Uniform Balance',
    conservative: 'Gentle Compression',
  };

  for (let i = 0; i < Math.min(profileCount, 3); i++) {
    const emphasis = emphases[i];
    const numIntervals = intervalsByEmphasis[emphasis];
    const [minStrength, maxStrength] = strengthRangeByEmphasis[emphasis];

    // Generate intervals based on density
    const intervals = generateIntervals(
      analysis.bins,
      numIntervals,
      minStrength,
      maxStrength,
      emphasis
    );

    // Adjust confidence based on emphasis (conservative = higher confidence)
    const emphasisConfidence = Math.round(
      confidence * (emphasis === 'conservative' ? 1.1 : emphasis === 'aggressive' ? 0.9 : 1.0)
    );

    profiles.push({
      name: names[emphasis],
      intervals,
      confidence: Math.min(100, emphasisConfidence),
      emphasis,
    });
  }

  return profiles;
}

/**
 * Generate intervals for a warp profile based on density analysis.
 */
function generateIntervals(
  bins: DensityBin[],
  intervalCount: number,
  minStrength: number,
  maxStrength: number,
  emphasis: WarpEmphasis
): Array<{ startPercent: number; endPercent: number; strength: number }> {
  const n = bins.length;
  if (n === 0 || intervalCount <= 0) {
    return [];
  }

  const intervals: Array<{ startPercent: number; endPercent: number; strength: number }> = [];
  
  // Calculate equal-sized interval boundaries
  const boundaryStep = n / intervalCount;
  
  for (let i = 0; i < intervalCount; i++) {
    const startIdx = Math.floor(i * boundaryStep);
    const endIdx = Math.floor((i + 1) * boundaryStep);
    
    // Calculate average density in this interval
    let sumDensity = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx && j < n; j++) {
      sumDensity += bins[j].density;
      count++;
    }
    const avgDensity = count > 0 ? sumDensity / count : 0;
    
    // Strength is inverse of density (sparse = high warp, dense = low warp)
    // Higher density = lower strength (less warping needed)
    const strength = minStrength + (1 - avgDensity) * (maxStrength - minStrength);
    
    intervals.push({
      startPercent: (startIdx / n) * 100,
      endPercent: Math.min(endIdx / n, 1) * 100,
      strength: Math.round(strength * 100) / 100,
    });
  }

  return intervals;
}
