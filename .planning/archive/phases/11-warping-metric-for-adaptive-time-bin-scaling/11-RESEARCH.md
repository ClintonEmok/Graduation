# Phase 11: Warping metric for adaptive time bin scaling - Research

**Researched:** 2026-04-20  
**Domain:** same-granularity bin scoring for adaptive width warping  
**Confidence:** HIGH

## Summary

The current repo already has three warp-related paths, but they are not yet governed by a single comparable-bin scoring contract:

- `src/workers/adaptiveTime.worker.ts` builds density, burstiness, and warp maps from timestamp distributions.
- `src/components/dashboard-demo/lib/demo-warp-map.ts` turns slice-authored `warpWeight` values into a visual warp map.
- `src/app/demo/non-uniform-time-slicing/showcase.tsx` renders the phase-10 selection-first bins and uses `warpWeight` directly for width display.

That means the code can already warp, but it does not yet explain how to score one bin against its same-granularity peers, keep the original order, and guarantee a non-collapsing minimum width. Phase 11 should introduce a pure helper in `src/lib/binning/warp-scaling.ts` that accepts comparable bins and returns stable relative scores/warp weights plus a monotonic warp map. Adapters in the showcase route and authored warp-map preview can then consume the same helper.

## Standard Stack

| Module | Purpose | Why it matters here |
|---|---|---|
| `src/lib/binning/types.ts` | `TimeBin` / `TimeSlice` metadata | Already carries `warpWeight` and `isNeutralPartition` |
| `src/lib/binning/burst-taxonomy.ts` | Burst scoring patterns | Good reference for pure scoring + deterministic tie-breaking |
| `src/workers/adaptiveTime.worker.ts` | Warp map math | Existing monotonic-weight pattern to mirror carefully |
| `src/components/dashboard-demo/lib/demo-warp-map.ts` | Slice-authored warp preview | Primary consumer of authored warp weights |
| `src/app/demo/non-uniform-time-slicing/showcase.tsx` | Visual proof route | Best place to demonstrate the new scoring contract |
| `src/store/slice-domain/createSliceCoreSlice.ts` | Applied slice contract | Confirms `warpWeight` is already part of slice semantics |

## Architecture Patterns

### Pattern 1: Score only comparable bins
**What:** Compare bins only against peers of the same granularity.
**Why:** Mixing hourly, daily, weekly, or monthly bins would make the score meaningless.

### Pattern 2: Preserve order, warp width only
**What:** The helper may change width factors, but not sequence.
**Why:** Reordering bins would break the brushed selection contract.

### Pattern 3: Clamp minimum width above zero
**What:** Even low-scoring bins must retain a visible width floor.
**Why:** The phase goal explicitly forbids collapse.

### Pattern 4: Neutral fallback stays explicit
**What:** Flat, invalid, or empty inputs should produce a neutral result instead of disappearing.
**Why:** This keeps the UI honest when the score engine has nothing to distinguish.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Same-granularity bin ranking | Per-component ad hoc math | A shared pure helper in `src/lib/binning/warp-scaling.ts` | Prevents score drift across demo surfaces |
| Warp-map monotonicity | Manual width reshaping in UI code | A helper that emits ordered width factors | Keeps later consumers from reordering bins |
| Neutral fallback | Silent zero-width/empty state | Explicit neutral output | Makes flat selections visible and debuggable |

## Common Pitfalls

### Pitfall 1: Mixing units
`TimeBin` uses epoch milliseconds, while some demo helpers already normalize to percent or seconds. The new helper should accept one canonical unit and keep conversions at the edge.

### Pitfall 2: Hidden reorder during normalization
If the helper sorts by score, the brushed selection loses its sequence. The score can rank, but output order must remain input order.

### Pitfall 3: Zero-width collapse
Simple normalization can accidentally drive low bins to 0. The helper needs a floor so every bin remains visible.

### Pitfall 4: Duplicate scoring logic
If showcase, dashboard preview, and worker math each invent their own scaling formula, the phase will drift. One helper should own the comparable-bin contract.

## Code References

### Current authored-warp preview
`src/components/dashboard-demo/lib/demo-warp-map.ts`

### Current showcase route
`src/app/demo/non-uniform-time-slicing/showcase.tsx`

### Existing slice warp contract
`src/store/slice-domain/createSliceCoreSlice.ts`

### Existing worker warp math
`src/workers/adaptiveTime.worker.ts`

## Recommendation

Create `src/lib/binning/warp-scaling.ts` as the single source of truth for comparable-bin scoring, then adapt the showcase route and authored warp preview to call it. Keep the worker-based density map as a separate analysis path; Phase 11 should be about comparable-bin width scoring, not a wholesale replacement of the worker.

---

*Phase: 11-warping-metric-for-adaptive-time-bin-scaling*  
*Researched: 2026-04-20*
