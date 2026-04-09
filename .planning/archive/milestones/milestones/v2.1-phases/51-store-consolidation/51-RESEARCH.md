# Phase 51: Store Consolidation - Research

**Researched:** 2026-03-09
**Domain:** Zustand store architecture consolidation and legacy data-store retirement
**Confidence:** HIGH

## Summary

Phase 51 should consolidate the current slice-related multi-store setup (`useSliceStore`, `useSliceCreationStore`, `useSliceSelectionStore`, `useSliceAdjustmentStore`) into one bounded domain store while preserving existing behavior and selectors. Repository analysis shows these stores are tightly coupled in the same workflows (timeline-test routes, slice toolbar/list, boundary adjustment hooks), and currently force components to subscribe to multiple stores for one user interaction.

For deprecated data paths, `useDataStore` is still imported in 36 files and is currently used as a compatibility bridge even on pages already fetching via React Query (`useCrimeData`). TanStack Query docs explicitly position async/server data as server state and recommend minimizing client-global async caching. The right plan is to complete migration to query-driven data access and a thin client-side metadata/derived-state surface, then remove `src/store/useDataStore.ts`.

Zustand official guidance favors a single store split into slices (slice pattern), with middleware applied only at the combined store layer. This directly matches the phase goal: consolidate by domain boundary, not by splitting into more independent stores.

**Primary recommendation:** Build `useSliceDomainStore` as one bounded Zustand store composed of internal slices, migrate call sites behind selector-level compatibility exports, then remove `useDataStore` only after import count is zero and parity checks pass.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | `^5.0.10` (repo), latest `v5.0.11` release | Client state for synchronous UI/domain state | Already dominant store library in repo; official docs define slice-composition and single-store patterns |
| `@tanstack/react-query` | `^5.90.21` | Server-state fetching/caching for crimes data | Already adopted (`useCrimeData`), officially recommended for async server state |
| TypeScript | `^5.9.3` | Typed store contracts/selectors during consolidation | Keeps API parity while refactoring internals |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand `persist` middleware | bundled with Zustand | Persistence for long-lived user preferences | Use only for stable persisted fields (e.g., authored slices), not transient selection/drag state |
| Vitest | `^4.0.18` | Store behavior regression tests | Use for parity tests before/after consolidation and removal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One bounded slice domain store | Keep 4 independent slice stores | Continues cross-store sync complexity and duplicate subscriptions in one workflow |
| React Query + thin client metadata state | Keep `useDataStore` as async fetch cache | Conflicts with server-state/client-state separation; duplicates data source of truth |
| Selector compatibility wrappers | Big-bang import rewrite | Higher blast radius and harder rollback |

**Installation:**
```bash
# No new packages required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
src/store/
├── slice-domain/
│   ├── types.ts                     # Slice domain contracts
│   ├── createSliceCoreSlice.ts      # persisted slices + active slice
│   ├── createSliceSelectionSlice.ts # selectedIds + selection actions
│   ├── createSliceCreationSlice.ts  # creation preview state/actions
│   ├── createSliceAdjustmentSlice.ts# drag/snap/tooltip state/actions
│   └── selectors.ts                 # stable selector helpers
├── useSliceDomainStore.ts           # bounded store (single entry)
└── compat/
    ├── useSliceStore.ts             # temporary re-export adapters
    ├── useSliceSelectionStore.ts    # temporary re-export adapters
    ├── useSliceCreationStore.ts     # temporary re-export adapters
    └── useSliceAdjustmentStore.ts   # temporary re-export adapters
```

### Dependency Audit (current state)
Tightly-coupled groups identified from `src/store/` and call-site audit:

| Group | Stores | Evidence of Coupling | Planning Implication |
|------|--------|----------------------|----------------------|
| Slice interaction domain | `useSliceStore`, `useSliceSelectionStore`, `useSliceCreationStore`, `useSliceAdjustmentStore` | Same components/hooks subscribe to multiple stores for one action flow (`src/app/timeline-test/page.tsx`, `src/app/timeline-test/components/SliceToolbar.tsx`, `src/app/timeline-test/hooks/useSliceCreation.ts`, `src/app/timeline-test/hooks/useSliceBoundaryAdjustment.ts`) | Consolidate into one bounded store with internal slices |
| Data + adaptive timeline domain | `useDataStore` + `useAdaptiveStore` + `useCrimeData` consumers | `src/app/timeslicing/page.tsx` mirrors React Query results into `useDataStore`; `DualTimeline` still reads `useDataStore` | Replace `useDataStore` read contracts with query/derived adapters before deletion |
| Suggestion domain (separate) | `useSuggestionStore`, `useWarpSliceStore`, `useFilterStore` | Cross-linked but not part of mandated consolidation | Keep out of scope unless needed for `useDataStore` migration |

### Pattern 1: Bounded Store via Slice Composition
**What:** Compose multiple store slices into one domain store and expose selector-driven hooks.
**When to use:** When one UX flow spans multiple stores (creation, selection, boundary drag, merge/delete).
**Example:**
```typescript
// Source: Zustand Slices Pattern
// https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/slices-pattern.md
import { create } from 'zustand';

export const useSliceDomainStore = create((...a) => ({
  ...createSliceCoreSlice(...a),
  ...createSliceSelectionSlice(...a),
  ...createSliceCreationSlice(...a),
  ...createSliceAdjustmentSlice(...a),
}));
```

### Pattern 2: Middleware Only at Combined Store Boundary
**What:** Apply `persist` at the final combined store, not inside individual slices.
**When to use:** Persisting authored slice data while keeping transient UI states ephemeral.
**Example:**
```typescript
// Source: Zustand Slices Pattern guidance
// https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/slices-pattern.md
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSliceDomainStore = create(
  persist(
    (...a) => ({
      ...createSliceCoreSlice(...a),
      ...createSliceSelectionSlice(...a),
      ...createSliceCreationSlice(...a),
      ...createSliceAdjustmentSlice(...a),
    }),
    { name: 'slice-domain-v1', partialize: (s) => ({ slices: s.slices }) }
  )
);
```

### Pattern 3: Server State in Query, Client State in Store
**What:** Keep crimes fetch/cache in React Query and keep only local UI/domain state in Zustand.
**When to use:** Migration away from deprecated `useDataStore` async cache paths.
**Example:**
```typescript
// Source: TanStack Query "Does this replace client state managers?"
// https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state
const { data: crimes, meta } = useCrimeData({ startEpoch, endEpoch, bufferDays: 30 });

// Keep only synchronous local view state in Zustand
const setViewport = useViewportStore((s) => s.setViewport);
```

### Anti-Patterns to Avoid
- **Cross-store action chaining:** creation actions mutating another store (`useSliceCreationStore` -> `useSliceStore`) hides dependencies and complicates tests.
- **Dual source of truth for crimes data:** query result + `useDataStore` mirrored payloads can diverge.
- **Persisting transient drag/hover/selection:** creates stale UI hydration artifacts and SSR mismatch risk.
- **Big-bang deletion of `useDataStore.ts`:** breaks many importers before adapters land.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Store modularization | Custom event bus for inter-store sync | Zustand slice pattern in one bounded store | Official, simpler, and already idiomatic in current stack |
| Async crimes cache in Zustand | Manual fetch + cache invalidation store logic | TanStack Query `useQuery`/`useCrimeData` | Avoids duplicated async cache and boilerplate |
| Store persistence migration | Ad hoc localStorage serialization code | Zustand `persist` (`partialize`, `version`, `migrate`) | Handles schema/version/hydration concerns safely |
| Cross-component state subscriptions | Manual pub/sub utilities | Zustand selectors (`useStore(selector)`) | Built-in subscription model and React integration |

**Key insight:** The risk here is not algorithmic complexity; it is state ownership ambiguity. Use official patterns to enforce one owner per state concern.

## Common Pitfalls

### Pitfall 1: Persist Middleware Applied in Inner Slices
**What goes wrong:** Hydration order and state shape become inconsistent.
**Why it happens:** Persist wrapped around individual slices instead of combined store.
**How to avoid:** Apply middleware once at bounded store creation.
**Warning signs:** Duplicate storage keys, unexpected overwrite on hydration, partial state loss.

### Pitfall 2: Deleting `useDataStore` Before Consumer Zero
**What goes wrong:** Compile failures and runtime path breaks in timeline/map/viz modules.
**Why it happens:** Store removed before replacing all imports/selectors.
**How to avoid:** Enforce import-count gate (`rg -l "useDataStore" src | wc -l` must be 0 before deletion commit).
**Warning signs:** Type errors in `DualTimeline`, `ClusterManager`, `TrajectoryLayer`, `selection.ts`.

### Pitfall 3: Losing Behavior Parity During Consolidation
**What goes wrong:** Active-slice timing, merge behavior, or snap flags change silently.
**Why it happens:** Action semantics rewritten during move instead of copied and wrapped.
**How to avoid:** Keep action contracts unchanged first; refactor internals second.
**Warning signs:** Existing tests around `useSliceStore`/`useSliceAdjustmentStore` fail or need assertion rewrites.

### Pitfall 4: Oversubscribing Components After Consolidation
**What goes wrong:** More rerenders after moving to one store.
**Why it happens:** Components select large objects from the new bounded store.
**How to avoid:** Preserve fine-grained selectors and add selector helpers in `selectors.ts`.
**Warning signs:** Interactions (drag/brush) feel less responsive; React profiler shows extra renders.

## Code Examples

Verified patterns from official sources and repository contracts:

### Consolidated bounded store with composable slices
```typescript
// Source: Zustand docs - Slices Pattern
// https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/slices-pattern.md
import { create } from 'zustand';

export const useBoundStore = create((...a) => ({
  ...createSliceA(...a),
  ...createSliceB(...a),
}));
```

### Flat immutable updates with shallow merge
```typescript
// Source: Zustand docs - Updating state
// https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/updating-state.md
const useStore = create((set) => ({
  firstName: '',
  updateFirstName: (firstName: string) => set(() => ({ firstName })),
}));
```

### Preserve current range-application behavior as contract during migration
```typescript
// Source: repository contract function
// src/components/timeline/DualTimeline.tsx
applyRangeToStoresContract({
  interactive,
  startSec,
  endSec,
  domainStart,
  domainEnd,
  currentTime,
  setTimeRange,
  setRange,
  setBrushRange,
  setViewport,
  setTime,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple independent slice stores for one workflow | One bounded domain store composed from internal slices | Established Zustand best practice (current docs) | Lower coupling at call sites, clearer ownership |
| Client-global async fetch cache in Zustand | Server-state in TanStack Query, tiny remaining client-global state | Current TanStack Query guidance | Less boilerplate, fewer duplicated sources of truth |
| Legacy transitional data mirror (`useDataStore.setState` from query result) | Query-driven components plus thin derived adapters | In-progress in this repo (post-Phase 50) | Enables safe deletion of deprecated store file |

**Deprecated/outdated:**
- `src/store/useDataStore.ts` is marked deprecated in-file and should be retired once all imports are migrated.
- Cross-store writes for slice domain (`useSliceCreationStore` directly mutating `useSliceStore`) should be replaced by bounded-store internal actions.

## Open Questions

1. **Scope for legacy demo/test routes (`/timeline-test`, `/timeline-test-3d`) during `useDataStore` retirement**
   - What we know: These routes still actively write/read `useDataStore` and are part of slice workflows.
   - What's unclear: Whether they are required parity surfaces for this phase or can be explicitly exempted.
   - Recommendation: Treat them as in-scope unless product owner marks them deprecated; otherwise deletion gate will fail.

2. **Final home for `FilteredPoint` and `selectFilteredData` after store deletion**
   - What we know: `TrajectoryLayer` and `ClusterManager` import both from `useDataStore` today.
   - What's unclear: Whether to move to `src/lib/data/` or a new domain module.
   - Recommendation: Extract to `src/lib/data/selectors.ts` with unchanged signatures first, then switch imports.

## Sources

### Primary (HIGH confidence)
- Repository analysis:
  - `src/store/useSliceStore.ts`
  - `src/store/useSliceCreationStore.ts`
  - `src/store/useSliceSelectionStore.ts`
  - `src/store/useSliceAdjustmentStore.ts`
  - `src/store/useDataStore.ts`
  - `src/app/timeline-test/page.tsx`
  - `src/app/timeslicing/page.tsx`
  - `src/components/timeline/DualTimeline.tsx`
  - `src/components/viz/ClusterManager.tsx`
  - `src/components/viz/TrajectoryLayer.tsx`
- Zustand docs (official):
  - Slices Pattern: https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/slices-pattern.md
  - Flux inspired practice: https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/flux-inspired-practice.md
  - Updating state: https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/updating-state.md
  - Immutable merge semantics: https://raw.githubusercontent.com/pmndrs/zustand/main/docs/learn/guides/immutable-state-and-merging.md
  - Persist middleware: https://raw.githubusercontent.com/pmndrs/zustand/main/docs/reference/integrations/persisting-store-data.md
- TanStack Query docs (official):
  - Does this replace client state managers?: https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state

### Secondary (MEDIUM confidence)
- Zustand GitHub repository overview/release metadata (for latest release visibility): https://github.com/pmndrs/zustand

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Grounded in current repo dependencies and official docs
- Architecture: HIGH - Directly aligned with locked phase scope and validated coupling map
- Pitfalls: HIGH - Derived from current call-site patterns plus official middleware/slicing guidance

**Research date:** 2026-03-09
**Valid until:** 30 days (stable state-management patterns; re-check sooner if major Zustand/TanStack upgrades land)
