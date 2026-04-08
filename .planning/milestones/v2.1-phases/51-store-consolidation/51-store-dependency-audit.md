# Phase 51 Store Dependency Audit

Date: 2026-03-10
Scope: `src/store/` ownership boundaries and high-coupling workflow imports used by Phase 51 migration planning.

## Evidence Method

- Command used:
  - `rg -n "useSlice(Store|SelectionStore|CreationStore|AdjustmentStore)|useDataStore" src --glob "*.{ts,tsx}"`
- Audit intent:
  - Identify tightly coupled store groups used in the same workflow surfaces.
  - Record direct cross-store writes and compatibility paths that constrain migration order.
  - Isolate stores that remain out of scope for 51-01 foundation work.

## Coupled Group A: Slice Domain (primary consolidation target)

Stores:

- `useSliceStore`
- `useSliceSelectionStore`
- `useSliceCreationStore`
- `useSliceAdjustmentStore`

### Coupling Evidence

1. Same UI surfaces subscribe to multiple slice stores in one interaction flow:
   - `src/app/timeline-test/components/SliceToolbar.tsx:6-9` imports all four stores.
   - `src/app/timeline-test/components/SliceToolbar.tsx:28-43` reads/updates creation, adjustment, authored slice, and selection state in one component.
   - `src/app/timeline-test/components/CommittedSliceLayer.tsx:3-5` imports authored slice + adjustment + selection stores.
   - `src/app/timeline-test/components/SliceList.tsx:6-7` imports authored slice + selection stores.
2. Boundary adjustment logic spans authored slice and drag-state stores:
   - `src/app/timeline-test/hooks/useSliceBoundaryAdjustment.ts:12-13`
   - `src/app/timeline-test/hooks/useSliceBoundaryAdjustment.ts:95-114`
3. Creation flow currently performs cross-store writes:
   - `src/store/useSliceCreationStore.ts:2` imports `useSliceStore`.
   - `src/store/useSliceCreationStore.ts:111` reads authored slice count from `useSliceStore.getState()`.
   - `src/store/useSliceCreationStore.ts:135` commits via `useSliceStore.getState().addSlice(createdSlice)`.

### Phase 51 Implication

- These stores must move behind one bounded domain store first, then consumers can be rewired without dual-store drift.
- Cross-store writes in `useSliceCreationStore` are the strongest signal that this is one logical state domain.

## Coupled Group B: Deprecated Data Path (`useDataStore`) (secondary phase target)

### Import/Usage Map Evidence

- Timeline and route surfaces:
  - `src/app/timeslicing/page.tsx:7,102-103,200,260-261`
  - `src/app/timeline-test/page.tsx:18,189-190,229`
  - `src/app/timeline-test-3d/page.tsx:14,39-40,103`
  - `src/components/timeline/DualTimeline.tsx:7,149-152`
- Viz and map surfaces:
  - `src/components/viz/ClusterManager.tsx:2,16-19`
  - `src/components/viz/TrajectoryLayer.tsx:2,14-17`
  - `src/components/viz/DataPoints.tsx:17,52-56`
  - `src/components/map/MapEventLayer.tsx:5,33-36`
- Utility/hook dependencies:
  - `src/lib/selection.ts:1,47,73,119`
  - `src/hooks/useSelectionSync.ts:5,27,41,73`
  - `src/hooks/useAdaptiveScale.ts:3,8`
- Direct coupling from slice domain into deprecated store:
  - `src/store/useSliceStore.ts:6,63` (`toNormalizedStoreRange` pulls timestamp bounds from `useDataStore`).

### Phase 51 Implication

- `useDataStore` deletion must be gated by import-count convergence to zero in later plans.
- Slice-domain consolidation must avoid introducing new `useDataStore` coupling and should make range normalization dependencies explicit for later extraction.

## Out-of-Scope Stores for 51-01 (leave unchanged)

These remain intentionally untouched in this foundation plan:

- `src/store/useAdaptiveStore.ts`
- `src/store/useSuggestionStore.ts`
- `src/store/useWarpSliceStore.ts`
- `src/store/useFilterStore.ts`
- `src/store/useTimeStore.ts`
- `src/store/useCoordinationStore.ts`

Rationale:

- They are not required to establish the bounded slice-domain store foundation.
- Their coupling can be revisited only where later 51-0X plans explicitly migrate `useDataStore` consumers or route-level dependencies.

## Migration Order Constraints (actionable for Phase 51)

1. Establish bounded slice-domain store and selectors (`51-01`) before any consumer rewires.
2. Add compatibility adapters for legacy slice store imports (`51-02`) to reduce blast radius.
3. Migrate `useDataStore` consumers in bounded batches (`51-03` onward), prioritizing shared timeline/viz hotspots.
4. Enforce zero-import gate for `useDataStore` before file deletion (`51-12`).

## Definition of Done Mapping for 51-01

- Coupled groups identified with concrete source evidence: complete.
- Cross-store writes and import hotspots documented for sequencing: complete.
- Out-of-scope stores explicitly listed to avoid speculative architecture drift: complete.
