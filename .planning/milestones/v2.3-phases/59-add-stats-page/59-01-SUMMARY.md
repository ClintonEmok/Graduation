---
phase: 59-add-stats-page
plan: 1
subsystem: ui
tags: [react, zustand, nextjs, crime-data]

# Dependency graph
requires:
  - null
provides:
  - /stats route with standalone layout
  - Route-local state management (useStatsStore)
  - Pure aggregation helpers for crime data
  - NeighborhoodSelector component (districts 1-25)
  - useNeighborhoodStats data fetching hook
affects: [59-02, 59-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Route isolation pattern (no shared state with dashboard)
    - Zustand for route-local state management
    - Pure function aggregation utilities

key-files:
  created:
    - src/app/stats/page.tsx - Route entry point
    - src/app/stats/lib/StatsRouteShell.tsx - Main layout shell
    - src/store/useStatsStore.ts - Route-local state
    - src/lib/stats/aggregation.ts - Aggregation helpers
    - src/app/stats/lib/components/NeighborhoodSelector.tsx - District multi-select
    - src/app/stats/hooks/useNeighborhoodStats.ts - Data fetching hook
  modified: []

key-decisions:
  - "Route-local state via Zustand instead of URL params for filter isolation"
  - "Pure aggregation functions in src/lib/stats/ for reusability"
  - "NeighborhoodSelector shows crime count badges per district"

patterns-established:
  - "Route isolation: stats page has no imports from suggestion/full-auto workflows"
  - "Time range selector is independent of main dashboard time controls"

---
# Phase 59 Plan 1: Stats Route Foundation Summary

**Stats route foundation with neighborhood selection, data aggregation layer, and base layout**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Created standalone /stats route with no dashboard coupling
- Implemented route-local state management via useStatsStore
- Built pure aggregation helpers for crime data analysis
- Created NeighborhoodSelector with crime count badges

## Files Created/Modified
- `src/app/stats/page.tsx` - Route entry point rendering StatsRouteShell
- `src/app/stats/lib/StatsRouteShell.tsx` - Main layout shell with time range selector
- `src/store/useStatsStore.ts` - Route-local Zustand store for districts and time range
- `src/lib/stats/aggregation.ts` - Pure aggregation functions (byDistrict, byType, byHour, byDayOfWeek, byMonth)
- `src/app/stats/lib/components/NeighborhoodSelector.tsx` - District multi-select (1-25) with crime count badges
- `src/app/stats/hooks/useNeighborhoodStats.ts` - Data fetching hook using useCrimeData

## Decisions Made
- Route-local state via Zustand instead of URL params for filter isolation
- Pure aggregation functions in src/lib/stats/ for reusability across other parts of app

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Route shell ready for visualization components
- Aggregation helpers ready for use in Plan 59-02
- NeighborhoodSelector ready for integration

---
*Phase: 59-add-stats-page*
*Completed: 2025-03-23*
