# Phase 49: DualTimeline Decomposition - Research

**Researched:** 2026-03-09
**Domain:** React timeline decomposition (hooks + D3 interaction wiring + Zustand store sync)
**Confidence:** HIGH

## Summary

`DualTimeline.tsx` is still a 1,452-line monolith combining four separable domains: adaptive scale transforms, brush/zoom synchronization, point hover/selection logic, and density-strip derivation. The code already has one critical prerequisite extracted and tested (`interaction-guards.ts`), which should be treated as the stable interaction math contract and reused directly.

The lowest-risk implementation is a decomposition that keeps all existing stores, D3 behaviors, and event contracts unchanged, while moving domain logic into focused hooks under `src/components/timeline/hooks/`. The component should remain the orchestration layer (state selection + rendering composition), with hooks returning typed values/handlers only.

Testing should follow existing repository patterns: deterministic unit tests for pure helpers and focused hook-level tests for behavior contracts. Given current Vitest default `node` environment, extraction should maximize pure functions so most tests avoid DOM dependency; only brush/zoom effect wiring needs limited DOM simulation.

**Primary recommendation:** Extract four hooks with strict boundaries and wire them in dependency order: transforms -> density derivation -> brush/zoom sync -> point selection, while preserving `interaction-guards` as the invariant layer.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | Hook composition and event handlers | Existing timeline is React-first; decomposition is a hook refactor, not architecture change |
| Zustand | 5.0.10 | Timeline shared state (time/filter/coordination/adaptive/slice/viewport) | Current interaction contracts are store-driven and must remain stable |
| d3-scale/d3-brush/d3-zoom/d3-selection | 4.0.2 / 3.0.0 / 3.0.0 / 3.0.0 | Scale transforms and brush/zoom behavior binding | Already used in `DualTimeline.tsx`; behavior parity depends on these APIs |
| Vitest | 4.0.18 | Regression tests for extracted logic | Existing test runner and current guard tests already in Vitest |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| d3-array | 3.2.4 | Binning (`bin`, `max`) for overview/detail histogram and density prep | Use inside density-derivation hook for deterministic binning |
| d3-time | 3.1.0 | Tick interval generation by time resolution | Keep in orchestration/tick hook logic for axis parity |
| react-test-renderer | 19.2.0 | Existing hook test harness pattern in repo | Use only where already aligned; prefer pure-function testing for most extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing D3 brush/zoom wiring | visx brush abstractions | Higher rewrite risk; would violate strict behavior-parity requirement |
| Zustand store contracts | local reducer/context in timeline | Breaks cross-view sync contract and increases migration risk |
| Pure helper extraction + thin hooks | large stateful mega-hooks | Reduced readability/testability and repeats current monolith problem |

**Installation:**
```bash
# No new dependencies required for Phase 49.
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/timeline/
├── DualTimeline.tsx                    # Orchestrates store selection + hook composition + JSX
├── hooks/
│   ├── useScaleTransforms.ts           # adaptive/linear mapping + interaction scales
│   ├── useDensityStripDerivation.ts    # detail points/bins/density map derivation
│   ├── useBrushZoomSync.ts             # d3 brush+zoom effect and range-store sync
│   └── usePointSelection.ts            # scrub/hover/select pointer handlers
└── lib/
    ├── interaction-guards.ts           # keep as deterministic invariant helpers
    └── interaction-guards.test.ts
```

### Pattern 1: Transform Hook as Domain Boundary
**What:** Centralize adaptive + linear scale logic (`sampleWarpSeconds`, `toDisplaySeconds`, `toLinearSeconds`, `applyAdaptiveWarping`) in one hook.
**When to use:** Any time timeline needs overview/detail scale creation or invert behavior.
**Example:**
```typescript
// Source: src/components/timeline/DualTimeline.tsx
const overviewInteractionScale = scaleUtc()
  .domain([new Date(domainStart * 1000), new Date(domainEnd * 1000)])
  .range([0, overviewInnerWidth]);

const overviewScale = applyAdaptiveWarping(
  overviewInteractionScale.copy(),
  warpFactor,
  effectiveWarpMap,
  overviewInnerWidth,
  effectiveWarpDomain
);
```

### Pattern 2: Brush/Zoom Hook Owns D3 Side Effects Only
**What:** Keep all D3 behavior registration/cleanup in one `useEffect` hook, but reuse guard helpers for mapping math.
**When to use:** Binding brush and zoom interactions to refs and synchronizing store ranges.
**Example:**
```typescript
// Source: src/components/timeline/DualTimeline.tsx + src/components/timeline/lib/interaction-guards.ts
const { startSec, endSec } = brushSelectionToEpochRange([x0, x1], (v) => overviewInteractionScale.invert(v));
applyRangeToStores(startSec, endSec);

const { scale, translateX } = buildZoomTransformFromBrush(x0, x1, overviewInnerWidth);
```

### Pattern 3: Selection Hook Returns UI-Ready Handlers
**What:** Encapsulate scrub/hover/select pointer logic and thresholds, return `onPointerDown/Move/Up/Leave` + derived hover state.
**When to use:** Detail strip pointer interaction and timeline-to-selection store updates.
**Example:**
```typescript
// Source: src/components/timeline/DualTimeline.tsx
const nearest = findNearestIndexByTime(epochSeconds);
const maxDistance = Math.max(rangeSpan * 0.01, 60);
if (nearest && nearest.distance <= maxDistance) {
  setSelectedIndex(nearest.index, 'timeline');
} else {
  clearSelection();
}
```

### Anti-Patterns to Avoid
- **Hook with implicit store reads inside utility helpers:** pass required values into hooks/helpers explicitly; avoid hidden `getState()` calls except where existing selection library requires it.
- **Combining D3 setup with JSX derivations in same hook:** keep `useBrushZoomSync` effect-only; keep derived render data in pure memo hooks.
- **Changing event threshold semantics during extraction:** preserve `max(rangeSpan * 0.01, 60)` and existing clamp behavior exactly.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brush pixel -> epoch mapping and clamping | New custom conversion utility set | `interaction-guards.ts` (`brushSelectionToEpochRange`, `computeRangeUpdate`, `clampToRange`) | Already tested deterministic invariants; avoids drift during decomposition |
| Selection x fallback + visibility guard | New bespoke x-position checks in each hook | `resolveSelectionX` from `interaction-guards.ts` | Prevents NaN/out-of-bounds regressions already addressed in prior phase |
| Time normalization math | ad-hoc `%`/span math in each hook | `epochSecondsToNormalized` and `normalizedToEpochSeconds` | Shared contract across timeline + stores; prevents mismatch |
| Density smoothing kernel implementation variants | New density algorithm for this refactor | Existing `computeDensityMap` behavior and constants (`ADAPTIVE_BIN_COUNT`, `ADAPTIVE_KERNEL_WIDTH`) | Phase requires parity, not algorithm change |

**Key insight:** Phase 49 is structural decomposition only; all math/interaction contracts should be reused, not redesigned.

## Common Pitfalls

### Pitfall 1: D3 Sync Feedback Loops
**What goes wrong:** Brush and zoom handlers recursively trigger each other and jitter state.
**Why it happens:** `brush.move` and `zoom.transform` both emit events.
**How to avoid:** Preserve `isSyncingRef` guard semantics exactly around cross-calls.
**Warning signs:** rapid repeated range updates, flickering brush, excessive rerenders.

### Pitfall 2: Effect Dependency Expansion Changes Behavior
**What goes wrong:** Extracted hooks re-run D3 registration or range effects too often.
**Why it happens:** unstable callback identities or widened dependency arrays during extraction.
**How to avoid:** keep callback boundaries stable (`useCallback`) and retain current dependency intent from `DualTimeline.tsx`.
**Warning signs:** brush resets on unrelated state changes; pointer handlers lag or lose capture.

### Pitfall 3: Node Test Environment vs DOM-Heavy Hooks
**What goes wrong:** Hook tests fail because default Vitest environment is `node`.
**Why it happens:** brush/zoom hooks require SVG/DOM APIs.
**How to avoid:** maximize pure-function tests; isolate minimal DOM-dependent logic and annotate jsdom tests explicitly when needed.
**Warning signs:** `document is not defined` or missing pointer/SVG APIs in test runs.

### Pitfall 4: Hidden Contract Drift with Viewport Sync
**What goes wrong:** timeline no longer updates viewport-backed fetching range correctly.
**Why it happens:** extraction drops `setViewport(safeStart, safeEnd)` from range update flow.
**How to avoid:** keep `applyRangeToStores` contract centralized and unchanged.
**Warning signs:** timeline brush moves but fetched viewport data does not track.

## Code Examples

Verified patterns from repository sources:

### Range Update Contract (single write path)
```typescript
// Source: src/components/timeline/DualTimeline.tsx
const { safeStartSec, safeEndSec, normalizedRange } = computeRangeUpdate(startSec, endSec, domainStart, domainEnd);
setTimeRange([safeStartSec, safeEndSec]);
setRange(normalizedRange);
setBrushRange(normalizedRange);
setViewport(safeStartSec, safeEndSec);
```

### Brush-to-Zoom Synchronization Guard
```typescript
// Source: src/components/timeline/DualTimeline.tsx
if (isSyncingRef.current) return;
isSyncingRef.current = true;
select(zoomNode).call(zoomBehavior.transform, zoomIdentity.scale(scale).translate(translateX, 0));
isSyncingRef.current = false;
```

### Selection Threshold Parity
```typescript
// Source: src/components/timeline/DualTimeline.tsx
const rangeSpan = Math.abs(detailRangeSec[1] - detailRangeSec[0]) || 1;
const maxDistance = Math.max(rangeSpan * 0.01, 60);
```

### Density Derivation Fallback Rule
```typescript
// Source: src/components/timeline/DualTimeline.tsx
if (detailPoints.length > 0 && detailSpanDays <= DETAIL_DENSITY_RECOMPUTE_MAX_DAYS) {
  return computeDensityMap(detailPoints, detailRangeSec, binCount, ADAPTIVE_KERNEL_WIDTH);
}
return densityMap?.subarray(startIndex, Math.min(densityMap.length, endIndex + 1));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Interaction math embedded in `DualTimeline` | Shared guard helpers in `src/components/timeline/lib/interaction-guards.ts` + tests | 2026-03-06 (Phase 46) | Decomposition can now reuse tested invariants instead of re-deriving math |
| Mixed buffering ownership (hook + API) | Server-owned buffering contract from Phase 48 | 2026-03-09 (Phase 48) | Timeline refactor must preserve viewport/range write path but not reintroduce buffering logic |
| Duplicate normalization ownership | Shared adapter in `src/lib/coordinate-normalization.ts` | 2026-03-09 (Phase 48) | Timeline consumers can assume stable coordinate contract while refactoring internals |

**Deprecated/outdated:**
- `useViewportCrimeData` is marked deprecated but remains active in `DualTimeline`; keep behavior for parity in this phase, defer migration.

## Open Questions

1. **How much DOM-level interaction testing should Phase 49 include vs pure-hook tests?**
   - What we know: Current repo has no `DualTimeline` component interaction tests; guard helpers already have deterministic unit tests.
   - What's unclear: Whether planner wants jsdom-based hook tests for D3 effect registration now, or staged in later verification plans.
   - Recommendation: Require deterministic unit tests for all extracted pure logic in Phase 49, and add at least one focused jsdom test for brush/zoom hook wiring.

2. **Should `computeDensityMap` be moved to `lib/` for direct unit testing before hook extraction?**
   - What we know: It is currently file-local in `DualTimeline.tsx`, making isolated testing awkward.
   - What's unclear: If planner prefers direct utility extraction first or keeps it private to `useDensityStripDerivation`.
   - Recommendation: Move it into the density hook module with exported pure helper and test that helper directly.

## Sources

### Primary (HIGH confidence)
- `src/components/timeline/DualTimeline.tsx` - current architecture, extraction seams, behavior contracts
- `src/components/timeline/lib/interaction-guards.ts` - deterministic interaction helpers to preserve
- `src/components/timeline/lib/interaction-guards.test.ts` - existing parity tests for brush/zoom/selection math
- `src/lib/selection.ts` - nearest-point and selection resolution semantics
- `src/lib/time-domain.ts` - normalization conversion contracts
- `src/store/useCoordinationStore.ts` - selection/brush store contract
- `src/store/useTimeStore.ts` - time/range contract
- `src/lib/stores/viewportStore.ts` - viewport synchronization target
- `src/hooks/useViewportCrimeData.ts` - current timeline data hook behavior and deprecation note
- `.planning/ROADMAP.md` - Phase 49 success criteria and dependencies
- `.planning/phases/49-dualtimeline-decomposition/49-CONTEXT.md` - locked scope for this phase
- `.planning/phases/46-guardrails-and-baselines/46-03-SUMMARY.md` - prior extraction baseline context
- `.planning/phases/48-api-stabilization/48-03-SUMMARY.md` - post-Phase-48 contract assumptions
- `vitest.config.mts` - test environment defaults and include patterns

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` - risk framing and known fragile paths (internal analysis doc)
- `.planning/codebase/TESTING.md` - testing pattern guidance (internal analysis doc)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly verified in `package.json` and active imports/usages
- Architecture: HIGH - derived from current `DualTimeline.tsx` implementation and existing helper extraction
- Pitfalls: HIGH - corroborated by existing guard patterns, store contracts, and test config constraints

**Research date:** 2026-03-09
**Valid until:** 2026-04-08
