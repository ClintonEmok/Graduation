/**
 * Math utility functions - clamp, rounding helpers
 */

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp a value to 0-1 range */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Round to specified decimal places */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Round to 2 decimal places */
export function round2(value: number): number {
  return round(value, 2);
}