# Phase 52: Uniform-Events Binning for Timeslicing - Research

**Researched:** 2026-03-11
**Domain:** Adaptive temporal binning strategy (uniform-time vs uniform-events) across worker/store/timeslicing contracts
**Confidence:** HIGH

## Summary

Phase 52 should introduce a selectable binning strategy in adaptive map generation: keep current uniform-time bins as the default, and add uniform-events bins (equal-event-target bins) that timeslicing can explicitly request. Repository analysis shows the critical seam is `useAdaptiveStore.computeMaps(...)` -> `adaptiveTime.worker.ts` output -> timeline/map consumers. This is the lowest-risk integration point because all active routes (`/timeslicing`, `/timeline-test`, `/timeline-test-3d`, `MainScene`) already converge there.

The safe migration pattern is to add a mode flag to the worker input config (`uniform-time` | `uniform-events`) with default `uniform-time`, keep output field names stable (`densityMap`, `countMap`, `burstinessMap`, `warpMap`), and compute mode-specific internals inside worker/query code only. Timeslicing can opt into uniform-events mode without forcing other routes to change behavior.

A major technical nuance: equal-event bins make raw counts near-flat by design. Therefore density for visualization/warp weighting should be derived from **event count per bin duration** (events/sec, then normalized), not raw count alone. Without duration normalization, uniform-events mode collapses adaptive contrast and degrades warp usefulness.

**Primary recommendation:** Add `binningMode` as an explicit adaptive contract with default `uniform-time`, implement event-target bin boundary construction in the worker, derive density from count/duration for uniform-events mode, and gate timeslicing adoption behind an explicit route-level request while preserving all existing call sites unchanged.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `^5.9.3` | Typed worker/store contracts for new mode | Existing codebase contract language; safest way to evolve message schema |
| Web Workers API | browser standard | Off-main-thread adaptive map computation | Already used in `src/store/useAdaptiveStore.ts` and `src/workers/adaptiveTime.worker.ts` |
| `zustand` | `^5.0.10` | Global adaptive state + request orchestration | Existing single source of adaptive timeline state |
| `d3-array` | `^3.2.4` | Quantile/bisect utilities for event-boundary logic | Already installed and used in timeline components; official quantile semantics documented |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `d3-scale` | `^4.0.2` | Quantile scale semantics and threshold inversion references | Use when converting thresholds or validating quantile boundary behavior |
| Next.js Route Handlers | `16.1.6` | Extend `/api/adaptive/global` response parity if global mode needs event bins | Use only if global precompute must support mode parity |
| Vitest | `^4.0.18` | Contract and regression tests for mode defaults | Use for worker/store compatibility and no-regression checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `d3-array` quantile/bisect helpers | Hand-rolled percentile index math | Reinvents edge-case handling (ties, sparse data, sorted assumptions) |
| Store-level branching by route | Route-local ad hoc transforms | Duplicates logic and increases drift risk across timeslicing/timeline routes |
| New output schema per mode | Stable output fields + mode-aware internals | New schema increases blast radius across map/timeline/burst consumers |

**Installation:**
```bash
# No new packages required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── workers/
│   └── adaptiveTime.worker.ts          # Mode-aware bin construction + maps
├── store/
│   └── useAdaptiveStore.ts             # binningMode state + computeMaps request contract
├── app/timeslicing/
│   └── page.tsx                        # Explicit uniform-events request point
├── lib/queries/
│   ├── types.ts                        # Optional countMap/global contract parity
│   └── aggregations.ts                 # Optional shared bin helpers for global precompute
└── app/api/adaptive/global/route.ts    # Optional mode query param + response parity
```

### Pattern 1: Backward-Compatible Mode Flag in Worker Config
**What:** Add `binningMode` to worker config with default `uniform-time`.
**When to use:** Any new adaptive mode added to existing worker pipeline.
**Example:**
```typescript
// Source: repository contracts
// src/store/useAdaptiveStore.ts + src/workers/adaptiveTime.worker.ts
type BinningMode = 'uniform-time' | 'uniform-events';

interface WorkerConfig {
  binCount: number;
  kernelWidth?: number;
  binningMode?: BinningMode; // default uniform-time
}
```

### Pattern 2: Equal-Event Boundaries, Then Duration-Normalized Density
**What:** Build monotonic bin boundaries from sorted timestamps by event targets, then compute density as `count / duration`.
**When to use:** Uniform-events mode where equal counts would otherwise flatten density.
**Example:**
```typescript
// Source: D3 quantile semantics and repo worker style
// https://d3js.org/d3-array/summarize#quantileSorted
const target = sorted.length / binCount;
for (let i = 0; i <= binCount; i += 1) {
  const idx = Math.min(sorted.length - 1, Math.floor(i * target));
  edges[i] = sorted[idx];
}
// enforce monotonic edges + epsilon for zero-width bins
// density[i] = count[i] / max(epsilon, edges[i + 1] - edges[i])
```

### Pattern 3: Store Contract Parity with Optional Overrides
**What:** Keep `computeMaps(timestamps, domain)` call valid; add optional third arg for mode.
**When to use:** Introducing new behavior without breaking existing call sites.
**Example:**
```typescript
// Source: repository contract extension pattern
computeMaps(
  timestamps,
  domain,
  { binningMode: 'uniform-events' } // optional
);
```

### Anti-Patterns to Avoid
- **Mode-specific output shapes:** returning different fields per mode breaks all consumers.
- **Changing default mode:** default must remain uniform-time to satisfy backward compatibility.
- **Using raw count as density in uniform-events mode:** removes adaptive contrast.
- **Ignoring duplicate timestamps in quantile boundaries:** causes zero-duration bins and divide-by-zero artifacts.
- **Updating only worker but not global precompute route:** creates viewport/global inconsistency when `densityScope` changes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quantile threshold semantics | Custom percentile interpolation with ad hoc tie handling | `d3-array` quantile/quantileSorted guidance | Officially documented quantile definition, fewer off-by-one/tie bugs |
| Boundary-to-bin lookup | Manual nested scans for edge selection | Bisect-style threshold lookup (`d3-array` bisect semantics) | Reduces O(n*bins) mistakes and edge-index bugs |
| Worker payload transfer optimization | Custom cloning pipeline | Standard `postMessage(..., transfer)` transferable buffers | Browser-native ownership transfer; already used in store |
| Adaptive cache keying | Ad hoc string variants in route handlers | Deterministic mode-inclusive cache key pattern (`global:${binCount}:${kernelWidth}:${mode}`) | Prevents cache collisions across modes |

**Key insight:** The complexity in this phase is boundary correctness and contract stability, not raw arithmetic. Reuse existing D3/statistics and worker-transfer primitives rather than inventing custom variants.

## Common Pitfalls

### Pitfall 1: Flat Density in Uniform-Events Mode
**What goes wrong:** Density map becomes nearly uniform; adaptive warp has weak/no effect.
**Why it happens:** Using equal-event counts directly as density.
**How to avoid:** Compute density from count divided by bin duration before normalization.
**Warning signs:** `densityMap` min/max collapse toward one value; warp visually resembles linear scale.

### Pitfall 2: Zero-Width Event Bins
**What goes wrong:** Division by zero and NaN/Infinity values in density/warp.
**Why it happens:** Many identical timestamps produce repeated quantile boundaries.
**How to avoid:** Enforce strictly monotonic boundaries with epsilon widening and finite guards.
**Warning signs:** NaNs in worker output or jittery timeline rendering.

### Pitfall 3: Breaking Existing Routes by Signature Drift
**What goes wrong:** `timeline-test`, `timeline-test-3d`, or `MainScene` behavior changes unexpectedly.
**Why it happens:** `computeMaps` contract changed without optional defaults.
**How to avoid:** Keep old signature valid and default to `uniform-time` internally.
**Warning signs:** Visual changes in non-timeslicing routes with no code changes there.

### Pitfall 4: Inconsistent Viewport vs Global Adaptive Results
**What goes wrong:** `densityScope` toggle changes not only scope but also implicit binning mode semantics.
**Why it happens:** Worker supports new mode but `/api/adaptive/global` payload/cache remains old contract.
**How to avoid:** Either keep global mode explicitly uniform-time for this phase, or extend API/cache with mode parity in same phase.
**Warning signs:** Different burst windows when toggling density scope with same dataset/time range.

### Pitfall 5: Misleading Count Aggregation in Burst Windows
**What goes wrong:** Burst list crime counts become inflated/deflated.
**Why it happens:** Summing smoothed densities as counts or mixing count semantics across modes.
**How to avoid:** Define and test `countMap` semantics explicitly (raw per-bin events recommended) and keep `densityMap` separate.
**Warning signs:** Burst counts no longer roughly match events in selected window.

## Code Examples

Verified patterns from official sources and repository contracts:

### Quantile computation reference
```typescript
// Source: https://d3js.org/d3-array/summarize#quantile
import { quantile } from 'd3-array';

const q1 = quantile(values, 0.25);
const q2 = quantile(values, 0.50);
const q3 = quantile(values, 0.75);
```

### Histogram threshold behavior reference
```typescript
// Source: https://d3js.org/d3-array/bin#bin_thresholds
import { bin } from 'd3-array';

const binner = bin<number, number>()
  .domain([start, end])
  .thresholds([t1, t2, t3]);
```

### Transferable worker message pattern
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
const copy = timestamps.slice();
worker.postMessage({ timestamps: copy, config }, [copy.buffer]);
```

### Existing repository seam to extend
```typescript
// Source: src/store/useAdaptiveStore.ts
worker.postMessage({
  requestId,
  timestamps: timestampsCopy,
  domain,
  config: {
    binCount: ADAPTIVE_BIN_COUNT,
    kernelWidth: ADAPTIVE_KERNEL_WIDTH,
    // add binningMode here with default fallback
  }
}, [timestampsCopy.buffer]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single adaptive mode (uniform-time only) | Dual-mode target (uniform-time + uniform-events) | Phase 52 roadmap target | Enables event-balanced slicing exploration without replacing legacy behavior |
| Worker outputs density/burst/warp only | Worker now includes `countMap` plumbing | Recent pre-Phase-52 commit (repo hint) | Enables parity requirement for count and density outputs |
| Implicit one-size histogram for all routes | Explicit caller-requested mode with default fallback | Planned in Phase 52 | Reduces regressions and supports controlled rollout |

**Deprecated/outdated:**
- Assuming one temporal binning strategy fits all timeslicing workflows is now outdated for v2.2 goals.

## Open Questions

1. **Should `countMap` represent raw counts or smoothed counts?**
   - What we know: Current worker returns `countMap: smoothedDensity`.
   - What's unclear: Requirement language suggests true count output parity.
   - Recommendation: Lock contract to raw counts and keep smoothing only in `densityMap`; add regression tests for burst-window count plausibility.

2. **Do we need global precompute mode parity in this phase?**
   - What we know: `/api/adaptive/global` and query cache currently return density/burst/warp only, no mode/count fields.
   - What's unclear: Whether timeslicing uniform-events usage relies on global scope immediately.
   - Recommendation: At minimum, define explicit behavior (`global` stays uniform-time) and document it; preferred is mode-inclusive global cache key + payload parity.

3. **Should visualization consume explicit bin edges for uniform-events mode?**
   - What we know: `DensityHeatStrip` assumes equal-width index segments.
   - What's unclear: Whether non-uniform bin width rendering is required now or can be deferred.
   - Recommendation: Defer edge-aware rendering unless acceptance criteria require visual fidelity of bin width; keep this as follow-up technical debt item.

## Suggested Plan Slices

1. **Contract slice:** Add `binningMode` type/default in worker/store contracts; keep all existing compute call sites valid.
2. **Worker algorithm slice:** Implement uniform-events bin boundary + count/density derivation + finite-value guards.
3. **Timeslicing wiring slice:** Update `src/app/timeslicing/page.tsx` to explicitly request uniform-events mode; leave other routes default.
4. **Parity slice:** Align `countMap` semantics and update consumers/tests (BurstList, map layers) to rely on stable meaning.
5. **Scope consistency slice (optional but recommended):** Add global adaptive route/cache mode parity or explicitly lock global to uniform-time.
6. **Verification slice:** Add worker/store regression tests for mode defaults, output lengths, monotonic warp map, and no-regression in uniform-time.

## Sources

### Primary (HIGH confidence)
- Repository analysis:
  - `src/workers/adaptiveTime.worker.ts`
  - `src/store/useAdaptiveStore.ts`
  - `src/app/timeslicing/page.tsx`
  - `src/components/timeline/DualTimeline.tsx`
  - `src/components/timeline/hooks/useScaleTransforms.ts`
  - `src/components/timeline/hooks/useDensityStripDerivation.ts`
  - `src/components/viz/BurstList.tsx`
  - `src/components/viz/MainScene.tsx`
  - `src/app/api/adaptive/global/route.ts`
  - `src/lib/queries.ts`
  - `src/lib/queries/aggregations.ts`
  - `src/lib/queries/types.ts`
- D3 official docs:
  - Quantile/statistics: https://d3js.org/d3-array/summarize
  - Binning thresholds: https://d3js.org/d3-array/bin
  - Quantile scales: https://d3js.org/d3-scale/quantile
- MDN Worker postMessage docs:
  - https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly grounded in repo dependencies and official API docs
- Architecture: HIGH - Derived from concrete current seams/call-sites in worker/store/routes
- Pitfalls: HIGH - Observed from current contracts plus official quantile/worker behavior

**Research date:** 2026-03-11
**Valid until:** 30 days (stable APIs; revalidate sooner if adaptive contract changes land)
