export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function power2InOut(t: number): number {
  const t2 = t * t;
  return t < 0.5 ? 2 * t2 : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function clamp(t: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, t));
}

export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const span = inMax - inMin;
  if (span <= 0) return outMin;
  return outMin + ((value - inMin) / span) * (outMax - outMin);
}

export interface KdeCellFlat {
  x: number;
  z: number;
  intensity: number;
  colorIndex: number;
}

export function interpolateKdeCells(
  from: Float32Array,
  to: Float32Array,
  t: number,
): Float32Array {
  if (from.length !== to.length) return to;

  const result = new Float32Array(from.length);
  for (let i = 0; i < from.length; i++) {
    result[i] = lerp(from[i], to[i], t);
  }
  return result;
}
