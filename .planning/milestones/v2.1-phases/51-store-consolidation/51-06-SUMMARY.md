---
phase: 51-store-consolidation
plan: 06
subsystem: ui
tags: [zustand, timeline, map, store-migration]

# Dependency graph
requires:
  - phase: 51-store-consolidation
    provides: canonical timeline data store and shared data selector/type modules from 51-03
provides:
  - Core timeline/map/layout components rewired to `useTimelineDataStore`
  - Map trajectory rendering linked to shared `selectFilteredData` contract
  - Deprecated `@/store/useDataStore` imports removed from high-traffic component batch
affects: [51-07, 51-08, 51-09, 51-10, 51-11, 51-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Migrate component consumers to canonical store path while preserving selector-level subscriptions
    - Prefer shared `src/lib/data/*` contracts/selectors in component data paths

key-files:
  created: []
  modified:
    - src/components/layout/TopBar.tsx
    - src/components/map/MapEventLayer.tsx
    - src/components/map/MapTrajectoryLayer.tsx
    - src/components/timeline/DensityHistogram.tsx
    - src/components/timeline/TimelinePanel.tsx
    - src/components/ui/TimeControls.tsx

key-decisions:
  - "Migrated high-traffic timeline/map components directly to `useTimelineDataStore` to reduce deprecated-store dependency without behavior changes."
  - "Used shared `selectFilteredData` inside map trajectory layer for canonical filtered-data ownership instead of legacy store-local access paths."

patterns-established:
  - "Consumer migration pattern: keep behavior parity while swapping deprecated store imports to canonical store/selector modules."

# Metrics
duration: 2 min
completed: 2026-03-10
---

# Phase 51 Plan 06: Core Component Consumer Migration Summary

**Rewired top-bar, timeline, time-controls, and map rendering consumers to canonical timeline data contracts while preserving interaction parity and removing deprecated store imports from the core component batch.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T01:04:47Z
- **Completed:** 2026-03-10T01:07:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Migrated all six targeted core components from `@/store/useDataStore` to `@/store/useTimelineDataStore`.
- Shifted histogram typing to shared `src/lib/data/types.ts` contracts.
- Wired map trajectory rendering through shared `selectFilteredData` from `src/lib/data/selectors.ts` for canonical filtered-data access.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire core components to canonical data-store contracts** - `78450f9` (feat)
2. **Task 2: Run import gate for migrated component batch** - `9f03cc9` (chore)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/components/layout/TopBar.tsx` - Replaced deprecated store import with canonical timeline data store hook.
- `src/components/map/MapEventLayer.tsx` - Migrated timeline data subscriptions to canonical store selectors.
- `src/components/map/MapTrajectoryLayer.tsx` - Migrated store import and routed columnar filtered-data path through shared selector.
- `src/components/timeline/DensityHistogram.tsx` - Switched to canonical store hook and shared `DataPoint` type import.
- `src/components/timeline/TimelinePanel.tsx` - Migrated timeline bounds subscriptions to canonical store.
- `src/components/ui/TimeControls.tsx` - Migrated timeline bounds subscriptions to canonical store.

## Decisions Made

- Kept migration scope strictly to the six plan-targeted components to minimize parity risk in this batch.
- Preserved component-level selector granularity while replacing deprecated import paths.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Core top-bar/timeline/map/time-control consumers now use canonical timeline store contracts.
- Deprecated store import surface is reduced further ahead of full `useDataStore` retirement in later plans.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
