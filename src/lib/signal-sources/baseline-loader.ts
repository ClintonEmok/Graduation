/**
 * Client-side loader for the 168-cell contextual baseline (Phase 84, Plan 84-02).
 *
 * Two paths to load the baseline:
 *  1. Static file at `/baselines/baseline_168.json` — pre-built by
 *     `scripts/export_baseline_168.py` and committed to the repo.
 *     Faster (single fetch, no server round-trip).
 *  2. API route at `/api/adaptive/contextual-baseline` — rebuilds
 *     the same JSON from DuckDB on demand. Used as a fallback when
 *     the static fetch fails (e.g. file is missing or the deployment
 *     is mid-update).
 *
 * The module-level `baselineCache` is the single source of truth for
 * `getBaseline168Sync()`. If the baseline hasn't been loaded yet, the
 * sync accessor returns `null` and the density mapper falls back to
 * `1.0` (neutral). `loadBaseline168()` is idempotent and de-duplicates
 * concurrent calls via a shared `loadingPromise`.
 *
 * The winsorized baseline (`getBaseline168WinsorizedSync`) is a stub
 * returning `null` until Plan 84-03 wires it up.
 */

import type { Baseline168, Baseline168Winsorized } from './contract';

let baselineCache: Baseline168 | null = null;
const baselineWinsorizedCache: Baseline168Winsorized | null = null;
let loadingPromise: Promise<Baseline168> | null = null;

const STATIC_URL = '/baselines/baseline_168.json';
const API_URL = '/api/adaptive/contextual-baseline';

/**
 * Load the 168-cell baseline, trying the static file first and the
 * DuckDB API route as fallback. Idempotent: subsequent calls return
 * the cached value. Concurrent calls share the same in-flight promise.
 */
export async function loadBaseline168(): Promise<Baseline168> {
  if (baselineCache) return baselineCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const response = await fetch(STATIC_URL, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`Static baseline fetch failed: ${response.status}`);
      }
      const baseline = (await response.json()) as Baseline168;
      baselineCache = baseline;
      return baseline;
    } catch (staticError) {
      // Fall back to the API route (which may itself 404 if DuckDB is
      // missing — but then the static file IS the canonical source and
      // we propagate the error to the caller).
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(
          `Both static and API baseline fetches failed; static: ${String(
            staticError,
          )}; API: ${response.status}`,
        );
      }
      const baseline = (await response.json()) as Baseline168;
      baselineCache = baseline;
      return baseline;
    }
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/**
 * Synchronous accessor for the dispatch hot path. Returns `null` if
 * the baseline hasn't been loaded yet — the density mapper falls back
 * to `1.0` (neutral warpWeight) in that case. The expected lifecycle:
 *  - On dashboard mount, the parent calls `loadBaseline168()` once.
 *  - `createSliceCoreSlice.addSliceFromBin` reads via this accessor.
 */
export function getBaseline168Sync(): Baseline168 | null {
  return baselineCache;
}

/**
 * Stub for 84-03: returns `null` until the winsorized baseline is
 * computed. The contextual mapper currently short-circuits to `1.0`
 * on `null`, matching the 84-01 stub behaviour.
 */
export function getBaseline168WinsorizedSync(): Baseline168Winsorized | null {
  return baselineWinsorizedCache;
}
