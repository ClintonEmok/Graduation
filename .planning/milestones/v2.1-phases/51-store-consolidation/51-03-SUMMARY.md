---
phase: 51-store-consolidation
plan: 03
subsystem: store
tags: [zustand, selectors, data-contracts, compatibility-shim]

# Dependency graph
requires:
  - phase: 51-store-consolidation
    provides: bounded slice-domain foundation and selector migration pattern from 51-01
provides:
  - Shared data contracts (`DataPoint`, `ColumnarData`, `FilteredPoint`) in `src/lib/data/types.ts`
  - Shared filtered selector ownership in `src/lib/data/selectors.ts`
  - Canonical `useTimelineDataStore` implementation and deprecated `useDataStore` compatibility shim
affects: [51-04, 51-06, 51-07, 51-08, 51-09, 51-10, 51-11, 51-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Extract reusable selectors/types into `src/lib/data/*` before consumer migration
    - Keep deprecated store path as re-export-only shim while moving canonical logic to non-deprecated file

key-files:
  created:
    - src/lib/data/types.ts
    - src/lib/data/selectors.ts
    - src/store/useTimelineDataStore.ts
  modified:
    - src/lib/trajectories.ts
    - src/components/viz/ClusterManager.tsx
    - src/components/viz/TrajectoryLayer.tsx
    - src/store/useDataStore.ts

key-decisions:
  - "Kept `selectFilteredData` behavior unchanged while moving ownership to `src/lib/data/selectors.ts` to prevent clustering/trajectory regressions."
  - "Made `useTimelineDataStore` the canonical implementation and reduced `useDataStore` to a temporary compatibility shim for staged migration."
  - "Rewired immediate trajectory/clustering consumers to shared selector/type modules to remove direct dependency on deprecated store ownership."

patterns-established:
  - "Data ownership migration pattern: extract contracts/selectors first, then switch consumers, then collapse legacy file to re-exports."

# Metrics
duration: 2 min
completed: 2026-03-10
---

# Phase 51 Plan 03: Timeline Data Store Extraction Summary

**Extracted timeline data contracts/selectors into shared `src/lib/data/*` modules and introduced `useTimelineDataStore` while converting `useDataStore` into a compatibility-only shim.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T01:57:06+01:00
- **Completed:** 2026-03-10T00:59:02Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added shared data contracts/types and selector ownership under `src/lib/data/*` with parity-preserving signatures and behavior.
- Created `src/store/useTimelineDataStore.ts` as the non-deprecated canonical timeline metadata/loading surface.
- Replaced legacy `src/store/useDataStore.ts` inline logic with compatibility re-exports to stage safe deletion in later plans.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared data contracts and filtered-data selector from deprecated store file** - `b410e11` (feat)
2. **Task 2: Introduce non-deprecated timeline data store path** - `01c178b` (feat)
3. **Task 3: Convert useDataStore.ts into a compatibility shim for staged migration** - `e8d433a` (refactor)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/lib/data/types.ts` - Shared `DataPoint`, `ColumnarData`, and `FilteredPoint` contracts.
- `src/lib/data/selectors.ts` - Shared `selectFilteredData` selector and filter-state interfaces.
- `src/store/useTimelineDataStore.ts` - Canonical timeline data store implementation for metadata/load helpers.
- `src/store/useDataStore.ts` - Deprecated compatibility shim re-exporting canonical store and shared contracts/selectors.
- `src/components/viz/ClusterManager.tsx` - Uses shared selector/type imports from `src/lib/data/*`.
- `src/components/viz/TrajectoryLayer.tsx` - Uses shared selector import from `src/lib/data/selectors`.
- `src/lib/trajectories.ts` - Uses shared `FilteredPoint` type import from `src/lib/data/types`.

## Decisions Made

- Preserved selector/type parity by moving contracts without changing filtering semantics.
- Kept migration low-risk by retaining `useDataStore` import compatibility through re-exports.
- Scoped immediate consumer rewires to trajectory/clustering modules called out in the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shared contracts and selectors are no longer anchored to the deprecated store file.
- Canonical timeline store ownership now exists in a non-deprecated path.
- Ready for downstream consumer migration plans that reduce `useDataStore` imports to zero before deletion.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
