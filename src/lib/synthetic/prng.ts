/**
 * Seeded pseudo-random number generator (Lehmer / Park-Miller LCG).
 *
 * Returns a function that produces deterministic values in [0, 1) given
 * an initial 32-bit seed. Used to make synthetic data generation
 * reproducible across runs.
 *
 * Extracted from `src/lib/queries.ts` for shared use.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Pick an element from `items` weighted by `weights` using the supplied rng.
 * `weights` need not be normalized; only relative magnitudes matter.
 */
export function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return items[Math.floor(rng() * items.length)] ?? items[0]!;
  }
  let cursor = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i] ?? 0;
    if (cursor <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/**
 * Approximate Gaussian sample in [-3, 3] from 6 uniform samples (CLT).
 */
export function gaussianish(rng: () => number): number {
  return rng() + rng() + rng() + rng() + rng() + rng() - 3;
}

/**
 * Sample a uniform value in [min, max).
 */
export function uniformRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
