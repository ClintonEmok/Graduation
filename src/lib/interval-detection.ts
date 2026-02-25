/**
 * Interval Boundary Detection Module
 * 
 * Identifies natural breakpoints in crime density data using multiple methods.
 * Supports peak detection, change point detection, and rule-based approaches.
 */

import { CrimeRecord } from '@/types/crime';
import { calculateConfidence, TimeRange } from './confidence-scoring';

/**
 * Detection method types
 */
export type BoundaryMethod = 'peak' | 'change-point' | 'rule-based';

/**
 * Sensitivity levels
 */
export type Sensitivity = 'low' | 'medium' | 'high';

/**
 * Boundary detection options
 */
export interface BoundaryOptions {
  method: BoundaryMethod;
  sensitivity: Sensitivity;  // default: 'medium'
  snapToUnit?: 'hour' | 'day' | 'none';  // default: 'none'
  boundaryCount?: number;  // target number of boundaries, 3-12
}

/**
 * Boundary suggestion result
 */
export interface BoundarySuggestion {
  boundaries: number[];  // epoch seconds
  method: BoundaryMethod;
  confidence: number;
  metadata: {
    peaks?: number[];
    changePoints?: number[];
    ruleBasedBoundaries?: number[];
  };
}

/**
 * Detect peaks in density distribution.
 * 
 * Sensitivity controls threshold:
 * - high: Find all local maxima
 * - medium: Find peaks above mean + 0.5 std dev
 * - low: Find only major peaks above mean + 1 std dev
 * 
 * @param densityBins - Array of density values
 * @param sensitivity - Detection sensitivity
 * @returns Array of peak indices
 */
export function detectPeaks(densityBins: number[], sensitivity: Sensitivity): number[] {
  if (!densityBins || densityBins.length < 3) {
    return [];
  }

  const n = densityBins.length;
  
  // Calculate statistics
  const mean = densityBins.reduce((a, b) => a + b, 0) / n;
  const variance = densityBins.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Threshold based on sensitivity
  const thresholds: Record<Sensitivity, number> = {
    low: mean + stdDev,
    medium: mean + stdDev * 0.5,
    high: mean,
  };
  
  const threshold = thresholds[sensitivity];
  const peaks: number[] = [];

  for (let i = 1; i < n - 1; i++) {
    const isPeak = 
      densityBins[i] > densityBins[i - 1] &&
      densityBins[i] > densityBins[i + 1] &&
      densityBins[i] >= threshold;
    
    if (isPeak) {
      peaks.push(i);
    }
  }

  // Limit peaks based on sensitivity
  const maxPeaks: Record<Sensitivity, number> = {
    low: 3,
    medium: 6,
    high: 10,
  };

  return peaks.slice(0, maxPeaks[sensitivity]);
}

/**
 * Detect change points in density distribution.
 * 
 * Uses sliding window comparison to find where density significantly shifts.
 * Sensitivity controls minimum change threshold.
 * 
 * @param densityBins - Array of density values
 * @param sensitivity - Detection sensitivity
 * @returns Array of change point indices
 */
export function detectChangePoints(densityBins: number[], sensitivity: Sensitivity): number[] {
  if (!densityBins || densityBins.length < 5) {
    return [];
  }

  const n = densityBins.length;
  const windowSize = Math.max(2, Math.floor(n / 8));

  // Calculate mean and std dev for threshold
  const mean = densityBins.reduce((a, b) => a + b, 0) / n;
  const variance = densityBins.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Threshold based on sensitivity
  const multipliers: Record<Sensitivity, number> = {
    low: 2.0,
    medium: 1.5,
    high: 1.0,
  };

  const threshold = stdDev * multipliers[sensitivity];
  const changePoints: number[] = [];

  for (let i = windowSize; i < n - windowSize; i++) {
    const leftWindow = densityBins.slice(i - windowSize, i);
    const rightWindow = densityBins.slice(i, i + windowSize);
    
    const leftMean = leftWindow.reduce((a, b) => a + b, 0) / windowSize;
    const rightMean = rightWindow.reduce((a, b) => a + b, 0) / windowSize;
    
    const change = Math.abs(rightMean - leftMean);
    
    if (change > threshold) {
      // Avoid adding duplicate change points (too close)
      const tooClose = changePoints.some(cp => Math.abs(cp - i) < windowSize / 2);
      if (!tooClose) {
        changePoints.push(i);
      }
    }
  }

  // Limit change points based on sensitivity
  const maxPoints: Record<Sensitivity, number> = {
    low: 3,
    medium: 5,
    high: 8,
  };

  return changePoints.slice(0, maxPoints[sensitivity]);
}

/**
 * Apply rule-based boundary detection.
 * 
 * Creates boundaries based on equal-density intervals or equal-time intervals.
 * 
 * @param densityBins - Array of density values
 * @param boundaryCount - Target number of boundaries
 * @returns Array of boundary indices
 */
export function applyRuleBased(densityBins: number[], boundaryCount: number): number[] {
  if (!densityBins || densityBins.length < 2 || boundaryCount < 2) {
    return [];
  }

  const n = densityBins.length;
  
  // Use equal-time intervals (simpler and more predictable)
  const step = n / boundaryCount;
  const boundaries: number[] = [];

  for (let i = 1; i < boundaryCount; i++) {
    const idx = Math.floor(i * step);
    if (idx > 0 && idx < n) {
      boundaries.push(idx);
    }
  }

  return boundaries;
}

/**
 * Snap epoch to nearest hour or day boundary.
 * 
 * @param epoch - Unix epoch in seconds
 * @param unit - Unit to snap to ('hour' or 'day')
 * @returns Snapped epoch
 */
export function snapToBoundary(epoch: number, unit: 'hour' | 'day'): number {
  const date = new Date(epoch * 1000);
  
  if (unit === 'hour') {
    date.setMinutes(date.getMinutes() + 30); // Round to nearest hour
    date.setMinutes(0, 0, 0);
  } else if (unit === 'day') {
    date.setHours(12, 0, 0, 0); // Midday
  }
  
  return Math.floor(date.getTime() / 1000);
}

/**
 * Detect interval boundaries in crime data.
 * 
 * Main export function that:
 * 1. Bins crimes into density histogram
 * 2. Calls appropriate detection method
 * 3. Applies sensitivity and snapping options
 * 
 * @param crimes - Array of crime records
 * @param timeRange - The time range to analyze
 * @param options - Detection options
 * @returns Boundary suggestion
 */
export function detectBoundaries(
  crimes: CrimeRecord[],
  timeRange: TimeRange,
  options: BoundaryOptions
): BoundarySuggestion {
  const {
    method,
    sensitivity = 'medium',
    snapToUnit = 'none',
    boundaryCount = 5,
  } = options;

  if (!crimes || crimes.length === 0 || timeRange.end <= timeRange.start) {
    return {
      boundaries: [],
      method,
      confidence: 0,
      metadata: {},
    };
  }

  const range = timeRange.end - timeRange.start;
  const binCount = Math.min(Math.max(Math.floor(crimes.length / 50), 20), 100);
  const binSize = range / binCount;

  // Create density bins
  const bins: number[] = new Array(binCount).fill(0);
  
  for (const crime of crimes) {
    const binIndex = Math.min(
      Math.floor((crime.timestamp - timeRange.start) / binSize),
      binCount - 1
    );
    if (binIndex >= 0) {
      bins[binIndex]++;
    }
  }

  // Normalize bins
  const maxCount = Math.max(...bins, 1);
  const normalizedBins = bins.map(c => c / maxCount);

  // Detect boundaries based on method
  let indices: number[] = [];
  const metadata: BoundarySuggestion['metadata'] = {};

  switch (method) {
    case 'peak':
      indices = detectPeaks(normalizedBins, sensitivity);
      metadata.peaks = indices.map(i => timeRange.start + (i + 0.5) * binSize);
      break;
      
    case 'change-point':
      indices = detectChangePoints(normalizedBins, sensitivity);
      metadata.changePoints = indices.map(i => timeRange.start + (i + 0.5) * binSize);
      break;
      
    case 'rule-based':
      indices = applyRuleBased(normalizedBins, boundaryCount);
      metadata.ruleBasedBoundaries = indices.map(i => timeRange.start + (i + 0.5) * binSize);
      break;
  }

  // Convert indices to epoch seconds
  let boundaries = indices.map(i => timeRange.start + (i + 0.5) * binSize);

  // Apply snapping if requested
  if (snapToUnit !== 'none' && boundaries.length > 0) {
    boundaries = boundaries.map(epoch => snapToBoundary(epoch, snapToUnit));
  }

  // If we have too few boundaries, add rule-based ones
  if (boundaries.length < 2 && method !== 'rule-based') {
    const fallbackIndices = applyRuleBased(normalizedBins, Math.max(3, boundaryCount));
    const fallbackBoundaries = fallbackIndices.map(i => timeRange.start + (i + 0.5) * binSize);
    
    // Merge and deduplicate
    const allBoundaries = [...boundaries, ...fallbackBoundaries].sort((a, b) => a - b);
    const uniqueBoundaries: number[] = [];
    const minGap = range * 0.05; // 5% of range minimum gap
    
    for (const b of allBoundaries) {
      if (uniqueBoundaries.length === 0 || b - uniqueBoundaries[uniqueBoundaries.length - 1] >= minGap) {
        uniqueBoundaries.push(b);
      }
    }
    
    boundaries = uniqueBoundaries;
  }

  // Calculate confidence
  const densityArray = normalizedBins;
  const confidence = calculateConfidence({
    crimes,
    timeRange,
    densityBins: densityArray,
  });

  return {
    boundaries,
    method,
    confidence,
    metadata,
  };
}
