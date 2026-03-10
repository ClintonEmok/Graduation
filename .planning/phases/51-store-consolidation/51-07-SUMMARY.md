---
phase: 51-store-consolidation
plan: 07
subsystem: store
tags: [zustand, timeline-data-store, selectors, hooks, migration]

# Dependency graph
requires:
  - phase: 51-store-consolidation
    provides: shared data contracts/selectors and canonical timeline data store from 51-03
provides:
  - Hook/lib consumers migrated off deprecated `useDataStore` imports to canonical store/selector paths
  - Import-gate verification evidence for the 51-07 hook/lib migration batch
affects: [51-08, 51-09, 51-10, 51-11, 51-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Rewire parity-sensitive hook/lib consumers to `useTimelineDataStore` and shared selector contracts before deprecated store deletion

key-files:
  created: []
  modified:
    - src/hooks/useAdaptiveScale.ts
    - src/hooks/useDebouncedDensity.ts
    - src/hooks/useSelectionSync.ts
    - src/hooks/useSliceStats.ts
    - src/lib/selection.ts

key-decisions:
  - "Migrated only import ownership and selector access paths in this plan to preserve parity-sensitive runtime behavior."
  - "Used `selectFilteredData` in `useSelectionSync` fallback selection-time derivation so hook rewires consume canonical shared selector contracts."

patterns-established:
  - "Consumer migration pattern: replace deprecated store imports in focused batches, then lock the batch with explicit zero-import gate evidence."

# Metrics
duration: 1 min
completed: 2026-03-10
---

# Phase 51 Plan 07: Hook/Lib Consumer Migration Summary

**Migrated adaptive-scale, density, selection-sync, slice-stats, and selection utilities to canonical timeline store/selector imports while preserving parity-sensitive interaction behavior.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-10T01:07:27Z
- **Completed:** 2026-03-10T01:08:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced deprecated `@/store/useDataStore` imports in the 51-07 hook/lib batch with canonical `useTimelineDataStore` and shared selector usage.
- Kept adaptive scaling, debounced density recompute triggers, selection synchronization, and slice-stat derivation behavior unchanged while migrating ownership paths.
- Verified a strict zero-import gate for deprecated store usage across the migrated batch.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire hook/lib data consumers to canonical store and selectors** - `51c78f4` (feat)
2. **Task 2: Enforce import gate for migrated hook/lib batch** - `e0e64eb` (chore)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/hooks/useAdaptiveScale.ts` - Reads timeline data via canonical `useTimelineDataStore`.
- `src/hooks/useDebouncedDensity.ts` - Reads columnar timeline data via canonical store path.
- `src/hooks/useSelectionSync.ts` - Uses canonical store and selector contract for fallback point-time derivation.
- `src/hooks/useSliceStats.ts` - Uses selector-based canonical store reads for columns/loading state.
- `src/lib/selection.ts` - Resolves selection queries from canonical timeline store state.

## Decisions Made

- Preserved runtime parity by restricting this plan to ownership/import rewires rather than changing hook selection/statistics semantics.
- Aligned selection sync fallback logic to shared selector contracts so post-migration data access stays on canonical modules.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hook/lib migration batch no longer depends on deprecated `useDataStore` import paths.
- Import-gate evidence is recorded for this parity-sensitive batch.
- Ready for remaining consumer migration plans and final deprecated store deletion gate.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
