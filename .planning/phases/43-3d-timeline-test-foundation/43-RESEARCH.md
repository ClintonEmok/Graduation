# Phase 43: 3D Timeline-Test Foundation - Research

**Researched:** 2026-03-05
**Domain:** 3D route foundation for timeline-test parity runtime
**Confidence:** HIGH

## Summary

Phase 43 should be planned as a parity foundation phase, not a refactor phase. The existing codebase already has all required primitives: a timeline runtime (`DualTimeline`, filter/time/adaptive/slice stores), a suggestion trigger runtime (`SuggestionToolbar` + `useSuggestionGenerator` + `useSuggestionStore`), and a 3D renderer stack (`@react-three/fiber` + `three` + existing scene components). The fastest path to CUBE-01/CUBE-02/CUBE-09 is composing these existing pieces into a dedicated 3D route with shared store context, while allowing 3D-specific logic copies.

Current risk is not missing capabilities; it is store/domain drift. The dashboard 3D path (`MainScene` + `SimpleCrimePoints`) currently uses viewport-driven fetching and its own indexing assumptions, while timeline-test/timeslicing flows use route-driven domain and explicit mirroring into `useDataStore` + `useAdaptiveStore`. If Phase 43 mixes these pipelines, timeline and 3D will desynchronize. Planning should enforce one domain source per render cycle.

Recommended implementation strategy: create a dedicated 3D test route that copies parity-critical route logic from `timeslicing/page.tsx` (data/domain wiring, authored warp map, generation trigger wiring), embeds a 3D scene surface, and keeps timeline panel + controls on the same stores. Do not consolidate shared abstractions in v2.0; copy where necessary and isolate by route.

**Primary recommendation:** Build `/timeline-test-3d` as a dedicated route that uses the same store-backed runtime context as timeline-test/timeslicing, with 3D-specific copied orchestration logic and a single shared data/domain pipeline.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Dedicated route creation (`app/.../page.tsx`) | Native project routing model; route colocation is first-class in App Router docs |
| React | 19.2.3 | UI composition across timeline + 3D surface | Existing runtime and component model in repo |
| Zustand | 5.0.10 | Shared route state (time/filter/adaptive/slices/suggestions) | Existing single-source stores; no provider required for bound stores |
| @react-three/fiber + three | 9.5.0 + 0.182.0 | 3D rendering surface for parity UI | Existing 3D stack already wired in `Scene`/`MainScene`; React 19 pairing is valid for R3F v9 |
| @tanstack/react-query | 5.90.21 | Crime data querying + caching | Existing `QueryProvider` + `useCrimeData` foundation already in app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-three/drei | 10.7.7 | Camera controls, scene helpers | For camera interaction and scene controls in 3D test surface |
| d3 (scale/brush/zoom/time) | 3.x/4.x | Timeline interactions and adaptive scale rendering | Keep `DualTimeline` behavior identical between 2D and 3D routes |
| sonner | 2.0.7 | Trigger/accept feedback | Reuse timeslicing feedback patterns where needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Route-specific copied orchestration logic | Immediate 2D/3D shared abstraction | Violates CUBE-09 parity-first constraint and increases phase risk |
| Reusing dashboard `MainScene` data flow as-is | New route-specific 3D scene/data adapter | Dashboard flow can drift from timeline-test domain and break sync |
| New custom control set | Reuse `SliceToolbar` + `SuggestionToolbar` + existing stores | New controls create avoidable parity drift and duplicate state semantics |

**Installation:**
```bash
npm install
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── timeline-test-3d/
│   │   ├── page.tsx                 # Dedicated 3D parity route
│   │   ├── components/              # 3D route-specific UI/scene copies
│   │   └── lib/                     # 3D route-specific copied helpers
│   └── timeslicing/                 # Source of parity baseline orchestration
├── components/
│   ├── timeline/                    # Shared DualTimeline/Timeline panel primitives
│   └── viz/                         # Shared Scene primitives and 3D base components
├── hooks/                           # useCrimeData/useSuggestionGenerator
└── store/                           # shared parity stores (adaptive/time/filter/suggestions/etc)
```

### Pattern 1: Single Domain Pipeline (Mandatory)
**What:** Fetch data once for effective domain/context, then mirror to `useDataStore` and compute adaptive maps from the same timestamps.
**When to use:** Every load/refresh cycle in the new 3D test route.
**Example:**
```typescript
// Source: src/app/timeslicing/page.tsx
useDataStore.setState({
  data: points,
  minTimestampSec: domainStartSec,
  maxTimestampSec: domainEndSec,
  // bounds ...
});

useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec]);
```

### Pattern 2: Timeline + 3D Share Stores, Not Transforms
**What:** Both timeline and 3D read from shared stores (`useDataStore`, `useAdaptiveStore`, `useTimeStore`, `useFilterStore`, `useCoordinationStore`) rather than each building independent fetch/transform pipelines.
**When to use:** Core rendering path and all interactions requiring sync.
**Example:**
```typescript
// Source: src/components/timeline/DualTimeline.tsx
const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
const warpMap = useAdaptiveStore((state) => state.warpMap);
const setSelectedIndex = useCoordinationStore((state) => state.setSelectedIndex);
```

### Pattern 3: Copy Parity-Critical Orchestration in Route Scope
**What:** Duplicate route orchestration helpers (for example, authored warp map build/mapping and event wiring) into 3D route scope instead of abstracting now.
**When to use:** Any logic needed for parity behavior in v2.0 where abstraction would increase risk.
**Example:**
```typescript
// Source baseline: src/app/timeslicing/page.tsx and src/app/timeline-test/page.tsx
const buildSliceAuthoredWarpMap = (...) => { /* copy for 3D route */ };
```

### Pattern 4: Event-Driven Generation/Acceptance Bridge
**What:** Keep the existing custom-event contract (`accept-time-scale`, `accept-interval-boundary`, `accept-full-auto-package`) for control parity.
**When to use:** Integrating suggestion generation triggers and acceptance controls in the new 3D route.
**Example:**
```typescript
// Source: src/app/timeslicing/page.tsx
window.addEventListener('accept-full-auto-package', handleFullAutoPackageEvent);
```

### Anti-Patterns to Avoid
- **Dual fetch pipelines:** letting 3D fetch one dataset while timeline renders another domain.
- **Early cross-surface abstraction:** extracting shared 2D/3D primitives in Phase 43 (defer to v2.1).
- **Store bypassing:** using local component state as source-of-truth for parity-critical controls.
- **Index remapping in 3D only:** emitting `selectedIndex` values not aligned with `useDataStore` ordering.

## Implementation Options and Tradeoffs

### Option A (Recommended): New dedicated 3D route with copied orchestration
**How:** Create a new route (for example `/timeline-test-3d`) that reuses shared stores/components but copies route-level orchestration from `timeslicing/page.tsx` and timeline-test.

**Pros:**
- Matches CUBE-01/CUBE-02/CUBE-09 directly.
- Fastest parity path with low architectural risk.
- Keeps future consolidation path open without blocking v2.0.

**Cons:**
- Duplicated route logic.
- Requires strict discipline to keep copied behavior aligned.

### Option B: Retrofit existing dashboard route into parity route
**How:** Extend `/dashboard` to host parity controls and generation flow.

**Pros:**
- Reuses current 3D shell.

**Cons:**
- Dashboard has map/cube/timeline concerns not aligned with timeline-test parity scope.
- Higher risk of unintended behavior coupling.

### Option C: Shared orchestration refactor first, then 3D route
**How:** Extract all shared logic before adding 3D route.

**Pros:**
- Cleaner architecture long-term.

**Cons:**
- Directly conflicts with parity-first and CUBE-09 constraints.
- High schedule and regression risk for v2.0.

## Recommendation

Use **Option A**.

Rationale:
- Meets parity milestone constraints exactly.
- Uses known-good route orchestration patterns already proven in `timeslicing/page.tsx`.
- Avoids destabilizing existing surfaces with premature consolidation.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeline sync math (adaptive warp + invert) | Custom scale/invert implementation in new route | `DualTimeline` adaptive scale path | Existing logic already handles warpFactor/mapDomain/brush interactions |
| Suggestion trigger lifecycle | New generation pipeline for 3D route | `useSuggestionGenerator` + `useSuggestionStore` | Already handles auto/manual run, status, full-auto sets |
| Warp slice state model | New warp interval state object | `useWarpSliceStore` | Existing accept/edit flows and active warp semantics are established |
| Query caching/invalidation | Ad hoc fetch state in route | `useCrimeData` + `QueryProvider` | Existing cache behavior and retry policy already configured |

**Key insight:** Phase 43 is integration assembly, not algorithm invention. Reuse existing store contracts and copied orchestration where needed.

## Common Pitfalls

### Pitfall 1: 3D and timeline use different time domains
**What goes wrong:** Timeline brush/selection and 3D data diverge, causing misleading parity behavior.
**Why it happens:** Reusing `SimpleCrimePoints` viewport fetch path without mirroring timeline domain.
**How to avoid:** Route-level single domain pipeline; 3D consumes mirrored `useDataStore` data.
**Warning signs:** Same selection range shows different counts or different visible events in timeline vs 3D.

### Pitfall 2: Selection index mismatch across surfaces
**What goes wrong:** Clicking a 3D point highlights wrong timeline point (or none).
**Why it happens:** 3D emits index from a filtered/reordered local array while timeline expects `useDataStore` index.
**How to avoid:** Emit only canonical indices aligned with `useDataStore` ordering.
**Warning signs:** `selectedIndex` changes but `resolvePointByIndex` returns unrelated timestamps.

### Pitfall 3: Time-range normalization drift
**What goes wrong:** Warp overlays and accepted intervals render at wrong positions.
**Why it happens:** Mixing percent-based slices (0-100) with epoch-based domain inconsistently.
**How to avoid:** Keep explicit conversion boundaries and reuse existing remap helpers from timeslicing baseline.
**Warning signs:** Accepted intervals collapse to edges or appear shifted after mode switch.

### Pitfall 4: Event listener duplication leaks
**What goes wrong:** Accept actions fire multiple times after route re-entry.
**Why it happens:** Registering global window events without cleanup.
**How to avoid:** Follow `useEffect` add/remove listener pattern used in `timeslicing/page.tsx`.
**Warning signs:** Single click creates duplicate warp slices or repeated toasts.

## Code Examples

Verified patterns from existing code:

### Route-level data mirroring for timeline parity
```typescript
// Source: src/app/timeslicing/page.tsx
useDataStore.setState({
  data: points,
  minTimestampSec: domainStartSec,
  maxTimestampSec: domainEndSec,
  dataCount: crimes.length,
});
useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec]);
```

### Adaptive warp override bridge into timeline
```typescript
// Source: src/app/timeslicing/page.tsx
<DualTimeline
  adaptiveWarpMapOverride={sliceAuthoredWarpMapMain}
  adaptiveWarpDomainOverride={[domainStartSec, domainEndSec]}
/>
```

### Suggestion acceptance event wiring
```typescript
// Source: src/app/timeslicing/page.tsx
window.addEventListener('accept-time-scale', handleWarpEvent);
window.addEventListener('accept-interval-boundary', handleIntervalEvent);
window.addEventListener('accept-full-auto-package', handleFullAutoPackageEvent);
```

### R3F React-version pairing constraint
```text
// Source: https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/readme.md
@react-three/fiber@9 pairs with react@19
```

## Concrete File Targets (Phase 43)

Minimum planned touch set:

- `src/app/timeline-test-3d/page.tsx` - new dedicated 3D parity route shell and orchestration.
- `src/app/timeline-test-3d/components/*` - 3D route-specific logic copies (controls bridge, scene adapter, parity wrappers).
- `src/components/viz/MainScene.tsx` or new `src/components/viz/*` adapter - only if needed to inject canonical data/index behavior.
- `src/components/viz/SimpleCrimePoints.tsx` (or route-local copy) - align with shared store/index contract for timeline sync.
- `src/app/page.tsx` - optional route entry link for QA discoverability.

Likely reused without modification (unless planning proves gaps):

- `src/components/timeline/DualTimeline.tsx`
- `src/app/timeline-test/components/SliceToolbar.tsx`
- `src/app/timeline-test/components/WarpSliceEditor.tsx`
- `src/app/timeslicing/components/SuggestionToolbar.tsx`
- `src/store/useAdaptiveStore.ts`, `src/store/useTimeStore.ts`, `src/store/useSuggestionStore.ts`, `src/store/useWarpSliceStore.ts`

## Explicit Verification Checklist (for planning)

### Route + runtime foundation
- [ ] Dedicated route exists and mounts cleanly (no reuse of `/timeline-test` URL).
- [ ] Route uses shared timeline domain/store model (`useDataStore`, `useAdaptiveStore`, `useFilterStore`, `useTimeStore`).

### Core controls parity (CUBE-02)
- [ ] Time scale mode toggle updates timeline and 3D view consistently.
- [ ] Warp source/mode controls (density vs slice-authored + factor) are wired to shared adaptive store.
- [ ] Generation trigger controls run and populate suggestion state in the 3D route.

### Sync guarantees (CUBE-01 + sync criterion)
- [ ] 3D visualization and timeline panel reflect same selected range/domain after brush/zoom.
- [ ] Selecting a point in 3D updates timeline selection using canonical index mapping.
- [ ] Accepting generated artifacts updates both timeline overlays and 3D behavior from same stores.

### Parity-first policy (CUBE-09)
- [ ] 3D-specific route logic copies are allowed and documented.
- [ ] No required cross-surface consolidation task is introduced in phase plan.
- [ ] Any optional cleanup tasks are explicitly marked deferred (v2.1+).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dashboard 3D surface with independent viewport-driven fetch assumptions | Route-level parity orchestration should drive both timeline and 3D from one domain | v2.0 planning (Phase 43) | Prevents silent desync between surfaces |
| Early abstraction pressure for shared 2D/3D logic | Deliberate logic copies for parity-critical flows | v2.0 scope decision (2026-03-05) | Faster delivery, lower parity risk |

**Deprecated/outdated:**
- Treating `/dashboard` as parity test harness for timeline-test behavior.
- Requiring cross-surface refactor before enabling 3D parity.

## Open Questions

1. **Canonical route path naming**
   - What we know: Phase requires a dedicated 3D test route; none exists yet.
   - What's unclear: final URL naming convention (`/timeline-test-3d` vs `/timeline-3d-test`).
   - Recommendation: use `/timeline-test-3d` for immediate clarity and grepability.

2. **Scene adapter strategy**
   - What we know: existing `MainScene` calls `useSelectionSync` and uses viewport-centric flow.
   - What's unclear: whether to patch `MainScene` or add route-local adapter for parity route.
   - Recommendation: prefer route-local adapter/copy first to avoid destabilizing dashboard behavior.

## Sources

### Primary (HIGH confidence)
- `src/app/timeline-test/page.tsx` - current timeline-test runtime controls and adaptive overrides
- `src/app/timeslicing/page.tsx` - parity baseline orchestration, domain mirroring, event wiring
- `src/components/timeline/DualTimeline.tsx` - timeline sync/adaptive behavior contract
- `src/components/viz/MainScene.tsx` - current 3D scene integration path
- `src/components/viz/SimpleCrimePoints.tsx` - current 3D point/data/index behavior
- `src/lib/selection.ts` - canonical index-based selection contract
- `src/store/useAdaptiveStore.ts`, `src/store/useTimeStore.ts`, `src/store/useWarpSliceStore.ts`, `src/store/useSuggestionStore.ts`
- `https://nextjs.org/docs/app/getting-started/project-structure` (v16.1.6, last updated 2026-02-27)
- `https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/readme.md`
- `https://raw.githubusercontent.com/pmndrs/zustand/main/README.md`
- `https://tanstack.com/query/latest/docs/framework/react/quick-start`

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` - phase scope + success criteria
- `.planning/REQUIREMENTS.md` - CUBE-01/CUBE-02/CUBE-09 constraints
- `.planning/STATE.md` - v2.0 parity-first scope decision context

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - validated against package versions and official docs/readmes.
- Architecture: HIGH - based on direct code-path tracing in current routes/components.
- Pitfalls: HIGH - derived from observed data/index/domain coupling points in current implementation.

**Research date:** 2026-03-05
**Valid until:** 2026-04-04
