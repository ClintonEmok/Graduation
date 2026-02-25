---
phase: 34-performance-optimization
plan: 06
subsystem: data
tags: [typescript, types, hooks, zustand, react-query]

# Dependency graph
requires:
  - phase: 34-01
    provides: Zustand viewport store and TanStack Query setup
  - phase: 34-03
    provides: Viewport API endpoint /api/crimes/range
provides:
  - Canonical CrimeRecord type in src/types/crime.ts
  - Unified useCrimeData hook in src/hooks/useCrimeData.ts
  - Updated useViewportCrimeData using canonical types
affects: [visualization components, data layer]

# Tech tracking
tech-stack:
  added: []
  patterns: [canonical type pattern, unified hook pattern]

key-files:
  created: [src/types/crime.ts, src/hooks/useCrimeData.ts]
  modified: [src/hooks/useViewportCrimeData.ts, src/components/timeline/TimelinePoints.tsx]

key-decisions:
  - "Created single canonical CrimeRecord type to eliminate schema mismatches"
  - "useCrimeData accepts explicit parameters (not from store) for flexibility"
  - "useViewportCrimeData wraps useCrimeData for backward compatibility"

patterns-established:
  - "Canonical type pattern: single source of truth for data interfaces"
  - "Unified hook pattern: single entry point for data fetching"

# Metrics
duration: 3 min
completed: 2026-02-22
---

# Phase 34 Plan 06: Canonical CrimeRecord Type and Unified Hook Summary

**Canonical CrimeRecord type and unified useCrimeData hook established as single source of truth for crime data**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T17:30:32Z
- **Completed:** 2026-02-22T17:33:09Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Created canonical CrimeRecord interface in src/types/crime.ts
- Created unified useCrimeData hook for all crime data fetching
- Updated useViewportCrimeData to use canonical types
- Fixed TimelinePoints component for new return type

## Task Commits

Each task was committed atomically:

1. **Task 1: Create canonical CrimeRecord type** - `598a007` (feat)
2. **Task 2: Create unified useCrimeData hook** - `6999c03` (feat)
3. **Task 3: Update useViewportCrimeData to use useCrimeData** - `cd6bf23` (feat)

## Files Created/Modified
- `src/types/crime.ts` - Canonical CrimeRecord interface and related types
- `src/hooks/useCrimeData.ts` - Unified hook for crime data fetching
- `src/hooks/useViewportCrimeData.ts` - Refactored to use canonical types
- `src/components/timeline/TimelinePoints.tsx` - Fixed loading state check

## Decisions Made
- Used canonical type pattern: single CrimeRecord interface exported from src/types/crime.ts
- useCrimeData accepts explicit parameters (startEpoch, endEpoch) instead of reading from store - gives callers flexibility
- useViewportCrimeData wraps useCrimeData for backward compatibility with existing consumers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Phase 34 plans 01-04 completed
- Ready for plan 34-05 (Integration & performance verification)
- Data architecture now has single source of truth for crime data types

---
*Phase: 34-performance-optimization*
*Completed: 2026-02-22*
