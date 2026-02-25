/**
 * Confidence Scoring Module
 * 
 * Calculates confidence scores (0-100) for suggestions based on data characteristics.
 * Composite scoring combines data clarity, coverage, and statistical measures.
 */

import { CrimeRecord } from '@/types/crime';

/**
 * Time range interface
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Confidence weights configuration
 */
export interface ConfidenceWeights {
  clarity: number;
  coverage: number;
  statistical: number;
}

/**
 * Default weights for composite scoring
 */
const DEFAULT_WEIGHTS: ConfidenceWeights = {
  clarity: 0.4,
  coverage: 0.3,
  statistical: 0.3,
};

/**
 * Calculate data clarity score based on crime density variance.
 * 
 * Higher variance (distinct peaks/valleys) = clearer signal = higher clarity.
 * Returns a score from 0-100.
 * 
 * @param crimes - Array of crime records
 * @param timeRange - The time range to analyze
 * @returns Clarity score (0-100)
 */
export function calculateDataClarity(
  crimes: CrimeRecord[],
  timeRange: TimeRange
): number {
  if (!crimes || crimes.length === 0) {
    return 0;
  }

  const range = timeRange.end - timeRange.start;
  if (range <= 0) {
    return 0;
  }

  // Bin crimes into time buckets
  const binCount = Math.min(Math.max(Math.floor(crimes.length / 100), 10), 100);
  const binSize = range / binCount;
  const bins: number[] = new Array(binCount).fill(0);

  // Count crimes per bin
  for (const crime of crimes) {
    const binIndex = Math.min(
      Math.floor((crime.timestamp - timeRange.start) / binSize),
      binCount - 1
    );
    if (binIndex >= 0 && binIndex < binCount) {
      bins[binIndex]++;
    }
  }

  // Calculate mean
  const mean = crimes.length / binCount;

  // Calculate variance
  const variance = bins.reduce((sum, count) => {
    return sum + Math.pow(count - mean, 2);
  }, 0) / binCount;

  // Calculate coefficient of variation (normalized variance)
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Map to 0-100 scale
  // Low variance (uniform) = low clarity (0-30)
  // Medium variance = moderate clarity (30-70)
  // High variance (peaks/valleys) = high clarity (70-100)
  const clarityScore = Math.min(100, Math.max(0, cv * 50));

  return Math.round(clarityScore);
}

/**
 * Calculate coverage score based on data distribution in time range.
 * 
 * More uniform coverage = higher score.
 * Factors in record count, temporal distribution, and gaps.
 * 
 * @param crimes - Array of crime records
 * @param timeRange - The time range to analyze
 * @returns Coverage score (0-100)
 */
export function calculateCoverage(
  crimes: CrimeRecord[],
  timeRange: TimeRange
): number {
  if (!crimes || crimes.length === 0) {
    return 0;
  }

  const range = timeRange.end - timeRange.start;
  if (range <= 0) {
    return 0;
  }

  // Check if crimes span the full range
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  for (const crime of crimes) {
    if (crime.timestamp < minTimestamp) minTimestamp = crime.timestamp;
    if (crime.timestamp > maxTimestamp) maxTimestamp = crime.timestamp;
  }

  // Coverage factor 1: Temporal span (how much of the range is covered)
  const temporalSpan = maxTimestamp - minTimestamp;
  const spanCoverage = range > 0 ? temporalSpan / range : 0;

  // Coverage factor 2: Data density
  // More crimes = better coverage, but with diminishing returns
  const densityScore = Math.min(100, Math.log10(crimes.length + 1) * 20);

  // Coverage factor 3: Distribution uniformity (Gini-like coefficient)
  const binCount = 20;
  const binSize = range / binCount;
  const bins: number[] = new Array(binCount).fill(0);

  for (const crime of crimes) {
    const binIndex = Math.min(
      Math.floor((crime.timestamp - timeRange.start) / binSize),
      binCount - 1
    );
    if (binIndex >= 0 && binIndex < binCount) {
      bins[binIndex]++;
    }
  }

  // Calculate Gini coefficient (0 = uniform, 1 = concentrated)
  const sortedBins = [...bins].sort((a, b) => a - b);
  const n = sortedBins.length;
  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sortedBins[i];
  }
  const gini = n > 0 ? giniSum / (n * sortedBins.reduce((a, b) => a + b, 0)) : 0;
  const uniformityScore = (1 - Math.abs(gini)) * 100;

  // Combine factors
  const coverageScore = (
    spanCoverage * 30 +
    densityScore * 35 +
    uniformityScore * 35
  );

  return Math.round(Math.min(100, Math.max(0, coverageScore)));
}

/**
 * Calculate statistical confidence based on density patterns.
 * 
 * Stronger, more distinct patterns = higher confidence.
 * Uses signal-to-noise ratio, peak prominence, and distribution characteristics.
 * 
 * @param densityBins - Array of density values
 * @returns Statistical confidence score (0-100)
 */
export function calculateStatisticalConfidence(densityBins: number[]): number {
  if (!densityBins || densityBins.length < 2) {
    return 0;
  }

  const n = densityBins.length;

  // Calculate mean and standard deviation
  const mean = densityBins.reduce((a, b) => a + b, 0) / n;
  const variance = densityBins.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Factor 1: Signal-to-noise ratio
  // Higher SNR = more distinct patterns
  const snr = mean > 0 ? stdDev / mean : 0;
  const snrScore = Math.min(100, snr * 100);

  // Factor 2: Peak prominence (max value relative to mean)
  const maxVal = Math.max(...densityBins);
  const prominence = maxVal > 0 ? (maxVal - mean) / maxVal : 0;
  const prominenceScore = prominence * 100;

  // Factor 3: Distribution characteristics (entropy-like)
  // More "interesting" distributions (not uniform, not all same) score higher
  const normalized = densityBins.map(v => v / (maxVal || 1));
  const entropy = normalized.reduce((sum, v) => {
    return sum + (v > 0 ? v * Math.log2(v) : 0);
  }, 0);
  const normalizedEntropy = Math.abs(entropy) / Math.log2(n);
  const entropyScore = normalizedEntropy * 100;

  // Combine factors
  const statisticalScore = (
    snrScore * 0.4 +
    prominenceScore * 0.35 +
    entropyScore * 0.25
  );

  return Math.round(Math.min(100, Math.max(0, statisticalScore)));
}

/**
 * Calculate composite confidence score.
 * 
 * Combines data clarity, coverage, and statistical measures with configurable weights.
 * 
 * @param options - Configuration object
 * @returns Final confidence score (0-100, rounded to nearest integer)
 */
export function calculateConfidence(options: {
  crimes: CrimeRecord[];
  timeRange: TimeRange;
  densityBins?: number[];
  weights?: Partial<ConfidenceWeights>;
}): number {
  const { crimes, timeRange, densityBins, weights } = options;

  // Merge weights with defaults
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Calculate component scores
  const clarityScore = calculateDataClarity(crimes, timeRange);
  const coverageScore = calculateCoverage(crimes, timeRange);
  
  // Calculate density bins if not provided
  let statisticalScore = 0;
  if (densityBins && densityBins.length > 0) {
    statisticalScore = calculateStatisticalConfidence(densityBins);
  } else if (crimes && crimes.length > 0) {
    // Generate density bins from crimes
    const range = timeRange.end - timeRange.start;
    if (range > 0) {
      const binCount = Math.min(Math.max(Math.floor(crimes.length / 100), 10), 100);
      const bins: number[] = new Array(binCount).fill(0);
      const binSize = range / binCount;
      
      for (const crime of crimes) {
        const binIndex = Math.min(
          Math.floor((crime.timestamp - timeRange.start) / binSize),
          binCount - 1
        );
        if (binIndex >= 0 && binIndex < binCount) {
          bins[binIndex]++;
        }
      }
      
      statisticalScore = calculateStatisticalConfidence(bins);
    }
  }

  // Composite scoring
  const finalScore = (
    clarityScore * w.clarity +
    coverageScore * w.coverage +
    statisticalScore * w.statistical
  );

  return Math.round(Math.min(100, Math.max(0, finalScore)));
}
