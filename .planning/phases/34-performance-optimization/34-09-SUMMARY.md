---
phase: 34-performance-optimization
plan: 09
subsystem: data
tags: [zustand, datastore, duckdb, api]

# Dependency graph
requires:
  - phase: 34-performance-optimization
    plan: 07
    provides: "SimpleCrimePoints uses useCrimeData"
  - phase: 34-performance-optimization
    plan: 08
    provides: "MapVisualization uses useCrimeData"
provides:
  - DataStore marked deprecated for data fetching
  - API endpoint has no mock fallback
affects:
  - Legacy components still using DataStore
  - Future migration work

# Tech tracking
tech-stack:
  added: []
  patterns: ["Deprecation notices for legacy stores"]

key-files:
  created: []
  modified:
    - src/store/useDataStore.ts

key-decisions:
  - "DataStore kept for backward compatibility with legacy components"
  - "API endpoint /api/crimes/range already has no mock fallback"
  - "Added deprecation notice directing to useCrimeData hook"

patterns-established:
  - "New code should use useCrimeData, not DataStore"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 34 Plan 09: Clean up DataStore Summary

**DataStore marked deprecated for data fetching; API endpoint already clean**

## Performance

- **Duration:** 3 min
- **Tasks:** 1/1 complete (partial cleanup)
- **Files modified:** 1

## Accomplishments
- Added deprecation notice to useDataStore
- Documented that new code should use useCrimeData hook
- API endpoint /api/crimes/range confirmed to have no mock fallback

## Task Commits

1. **Task 1: Add deprecation notice to DataStore** - `6548019` (feat)

## Files Modified
- `src/store/useDataStore.ts` - Added JSDoc deprecation notice

## Decisions Made
- Kept DataStore for backward compatibility (many components still use it for metadata)
- API endpoint already properly returns errors instead of mock data

## Deviations from Plan

**1. [Partial Completion] DataStore data/columns not removed**
- **Reason:** 30+ components still use DataStore for data/columns
- **Impact:** Full cleanup requires migrating all components to useCrimeData
- **Mitigation:** Added deprecation notice; DataStore kept functional for legacy components

## Issues Encountered
- Full DataStore cleanup blocked by extensive usage across codebase
- Many components (DualTimeline, MapEventLayer, ClusterManager, etc.) still depend on DataStore for data/columns
- Migration of all components beyond scope of this plan

## Next Phase Readiness
- Visualization components (34-07, 34-08) updated to use useCrimeData
- DataStore deprecated but still functional
- Further cleanup requires coordinated migration of remaining components

---

*Phase: 34-performance-optimization*
*Completed: 2026-02-22*
