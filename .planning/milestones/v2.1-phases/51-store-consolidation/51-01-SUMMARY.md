---
phase: 51-store-consolidation
plan: 01
subsystem: store
tags: [zustand, persist, selectors, slice-domain, store-audit]

# Dependency graph
requires:
  - phase: 50-query-layer-decomposition
    provides: decomposed query boundaries and parity-safe baseline for downstream store rewiring
provides:
  - Store-coupling audit with evidence-backed migration sequencing across slice and deprecated data paths
  - New bounded `useSliceDomainStore` composed from core/selection/creation/adjustment internal slices
  - Selector helper surface for fine-grained migration subscriptions without broad store selections
affects: [51-02, 51-03, timeline-test, timeline-test-3d]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bounded Zustand slice composition with one `persist` boundary on the combined domain store
    - Persist partialization constrained to authored `slices`, leaving interaction state transient
    - Explicit selector exports from a single store entrypoint for migration-safe consumer rewires

key-files:
  created:
    - .planning/phases/51-store-consolidation/51-store-dependency-audit.md
    - src/store/slice-domain/types.ts
    - src/store/slice-domain/createSliceCoreSlice.ts
    - src/store/slice-domain/createSliceSelectionSlice.ts
    - src/store/slice-domain/createSliceCreationSlice.ts
    - src/store/slice-domain/createSliceAdjustmentSlice.ts
    - src/store/slice-domain/selectors.ts
    - src/store/useSliceDomainStore.ts
  modified:
    - src/store/useSliceDomainStore.ts

key-decisions:
  - "Kept authored-slice lifecycle logic in a dedicated core slice and composed it with selection/creation/adjustment slices under one bounded store."
  - "Applied `persist` only at `useSliceDomainStore` and partialized persistence to `slices` to avoid hydrating transient interaction state."
  - "Exported explicit selector helpers from one entrypoint to preserve fine-grained subscription behavior during consumer migration."

patterns-established:
  - "Store consolidation pattern: compose domain slices in `src/store/useSliceDomainStore.ts` and keep middleware at the final store boundary only."
  - "Migration pattern: add parity-safe selectors before callsite rewires to avoid broad subscriptions and rerender regressions."

# Metrics
duration: 5 min
completed: 2026-03-10
---

# Phase 51 Plan 01: Store Consolidation Foundation Summary

**Delivered an evidence-backed store dependency audit plus a new bounded `useSliceDomainStore` with persisted authored slices and selector helpers for parity-safe migration.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T01:48:47+01:00
- **Completed:** 2026-03-10T01:53:15+01:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Produced `.planning/phases/51-store-consolidation/51-store-dependency-audit.md` documenting slice-domain coupling, deprecated `useDataStore` coupling, and migration order constraints.
- Added `src/store/slice-domain/*` modules and composed them in `src/store/useSliceDomainStore.ts` with one bounded `persist` configuration.
- Added focused selector helpers in `src/store/slice-domain/selectors.ts` and re-exported them from `src/store/useSliceDomainStore.ts` for migration-safe subscriptions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Produce the phase store-coupling audit artifact** - `7de7b6f` (docs)
2. **Task 2: Create bounded slice-domain store modules with explicit persisted/transient boundaries** - `bdfe4c4` (feat)
3. **Task 3: Add selector helpers for parity-safe consumer migration** - `4060cf4` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `.planning/phases/51-store-consolidation/51-store-dependency-audit.md` - Evidence-backed coupling inventory and migration sequencing constraints.
- `src/store/slice-domain/types.ts` - Shared bounded-domain contracts for core/selection/creation/adjustment state and actions.
- `src/store/slice-domain/createSliceCoreSlice.ts` - Authored slice lifecycle actions and overlap/merge/burst behavior.
- `src/store/slice-domain/createSliceSelectionSlice.ts` - Selection state/actions previously isolated in `useSliceSelectionStore`.
- `src/store/slice-domain/createSliceCreationSlice.ts` - Creation preview and commit flow now scoped to bounded-domain actions.
- `src/store/slice-domain/createSliceAdjustmentSlice.ts` - Drag/snap/tooltip adjustment state/actions.
- `src/store/slice-domain/selectors.ts` - Focused selector helpers for migration parity.
- `src/store/useSliceDomainStore.ts` - Single bounded store composition and selector/type exports.

## Decisions Made

- Kept parity by porting existing store action semantics into slice modules first, without changing user-visible behavior.
- Preserved persisted/transient boundary by partializing persistence to authored `slices` only.
- Chose explicit selector exports for migration surfaces (timeline/map/viz) instead of broad object selection patterns.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 51 now has a concrete bounded slice-domain store foundation and selector surface for compatibility adapters.
- Coupling evidence and migration order constraints are documented for the next plan.
- Ready for `51-02-PLAN.md`.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
