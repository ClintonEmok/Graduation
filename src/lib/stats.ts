/**
 * Statistical utility functions - mean, stddev, burstiness
 */

/** Calculate mean of an array of numbers */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Calculate standard deviation of an array */
export function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Calculate coefficient of variation (CV) */
export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return stddev(values) / avg;
}

/** Calculate burstiness: stddev / mean (with safety for zero mean) */
export function burstiness(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return stddev(values) / avg;
}