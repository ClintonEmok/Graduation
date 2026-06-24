---
created: 2026-06-24T22:21:05.426Z
title: Replace arbitrary 0.7 burst threshold with data-driven cutoff
area: general
files:
  - src/components/dashboard-demo/lib/useDemoBurstWindows.ts
  - src/components/dashboard-demo/lib/demo-burst-generation.ts
  - src/components/viz/BurstList.tsx
---

## Problem

The `burstThreshold` value (default `0.7`) used by burst-window detection is a hardcoded magic number with no principled justification. It's a normalized density cutoff: a bin is classified as bursty when its density is ≥ 70% of the max. The number came from the original coordination-store default and was never derived from any data-driven criterion.

Two further issues make it worse:

1. **It's not for slices themselves** — only for which density bins get promoted into *draft* slices during burst generation. Slices themselves use the warp map and other signals, not this threshold.
2. **The previous UI control was double-dead** — the Configure panel slider wrote to `autoConfig.burstThreshold` on the timeslicing store, but actual burst detection reads `burstThreshold` from a different store. The slider was a no-op. (Slider has since been removed; the field has been hardcoded as `DEMO_BURST_CUTOFF = 0.7` in `useDemoBurstWindows.ts`.)

In a thesis defense, "we picked 0.7" is a weak answer. "The cutoff is calibrated to the data" is much stronger.

## Solution

Compute the cutoff from the data distribution instead of hardcoding. Recommended approach:

```ts
function autoBurstCutoff(densityMap: Float32Array): number {
  if (densityMap.length === 0) return 0.7; // fallback
  const sorted = [...densityMap].sort((a, b) => a - b);
  // 75th percentile: top 25% of bins by density are bursty
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[idx];
}
```

This means "the top 25% densest bins are bursty" — same intuition as 0.7 in the average case, but adapts to the actual data shape. A bimodal density distribution will get a different cutoff than a uniform one.

**Implementation surface:**
- `src/components/dashboard-demo/lib/useDemoBurstWindows.ts` — replace `const DEMO_BURST_CUTOFF = 0.7` with a call to `autoBurstCutoff(densityMap)`
- `src/components/dashboard-demo/lib/demo-burst-generation.ts` — `burstThreshold` parameter stays (it's the public API used by `demo-burst-generation.test.ts` with values like 0.85, 0.9)

**Cost:** ~20 lines (one new helper, one call site change). No UI changes, no breaking changes to function signatures.

**Tradeoff:** slightly less reproducible across runs if the density data changes — but the demo is already non-deterministic on density (depends on time range, filters, etc.), so this isn't new.

**Alternative if data-driven is rejected:** keep `0.7` but add a clear comment explaining it's a heuristic default chosen for "top 30% of density is bursty" and not derived from any empirical calibration.

## Acceptance Criteria

- [ ] `autoBurstCutoff(densityMap)` helper implemented (or alternative chosen and rationale documented)
- [ ] `useDemoBurstWindows` uses the data-driven value (or documented rationale for keeping 0.7)
- [ ] No regression in burst-window generation behavior under typical demo data
- [ ] Comment in code explains the choice for thesis defense
