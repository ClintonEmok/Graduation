/**
 * Date normalization utilities for mapping between real epoch seconds and normalized 0-100 values.
 * Used for real data integration (2001-2026 date range).
 */

/**
 * Normalize a real epoch timestamp to a 0-100 value based on the data range.
 * 
 * @param realTime - Epoch seconds
 * @param minTime - Minimum epoch seconds in data range
 * @param maxTime - Maximum epoch seconds in data range
 * @returns Normalized value 0-100
 */
export const normalizeToPercent = (
  realTime: number,
  minTime: number,
  maxTime: number
): number => {
  if (maxTime === minTime) return 50; // Avoid division by zero
  const percent = ((realTime - minTime) / (maxTime - minTime)) * 100;
  return Math.max(0, Math.min(100, percent));
};

/**
 * Convert a normalized 0-100 value to real epoch seconds.
 * 
 * @param percent - Normalized value 0-100
 * @param minTime - Minimum epoch seconds in data range
 * @param maxTime - Maximum epoch seconds in data range
 * @returns Epoch seconds
 */
export const denormalizeToEpoch = (
  percent: number,
  minTime: number,
  maxTime: number
): number => {
  return minTime + (percent / 100) * (maxTime - minTime);
};

/**
 * Convert a normalized time range [start, end] to epoch seconds.
 * 
 * @param normalizedRange - [start, end] in 0-100 scale
 * @param minTime - Minimum epoch seconds
 * @param maxTime - Maximum epoch seconds
 * @returns [startEpoch, endEpoch]
 */
export const normalizedRangeToEpoch = (
  normalizedRange: [number, number],
  minTime: number,
  maxTime: number
): [number, number] => {
  return [
    denormalizeToEpoch(normalizedRange[0], minTime, maxTime),
    denormalizeToEpoch(normalizedRange[1], minTime, maxTime),
  ];
};

/**
 * Convert an epoch seconds time range to normalized 0-100.
 * 
 * @param epochRange - [start, end] in epoch seconds
 * @param minTime - Minimum epoch seconds
 * @param maxTime - Maximum epoch seconds
 * @returns [startPercent, endPercent]
 */
export const epochRangeToNormalized = (
  epochRange: [number, number],
  minTime: number,
  maxTime: number
): [number, number] => {
  return [
    normalizeToPercent(epochRange[0], minTime, maxTime),
    normalizeToPercent(epochRange[1], minTime, maxTime),
  ];
};
