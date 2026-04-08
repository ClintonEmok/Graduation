---
phase: 34-performance-optimization
plan: 01
subsystem: ui
tags: [zustand, tanstack-query, react, caching, state-management]

# Dependency graph
requires:
  - phase: 33-data-integration
    provides: Real crime data from DuckDB, date range 2001-2026
provides:
  - Zustand viewport store with fine-grained selectors
  - TanStack Query provider wrapping app
  - useViewportCrimeData hook for viewport-based fetching
affects: [34-02, 34-03, 34-04, 34-05]

# Tech tracking
tech-stack:
  added: [@tanstack/react-query@^5]
  patterns: [fine-grained selectors, viewport-based loading, buffered data fetching]

key-files:
  created:
    - src/lib/stores/viewportStore.ts - Zustand store with fine-grained selectors
    - src/providers/QueryProvider.tsx - TanStack Query wrapper
    - src/hooks/useViewportCrimeData.ts - Viewport-based data fetching hook
  modified:
    - src/app/layout.tsx - Integrated QueryProvider

key-decisions:
  - "Used fine-grained Zustand selectors to prevent cascade re-renders"
  - "TanStack Query with 5-min staleTime for efficient caching"
  - "30-day default buffer around viewport for smooth scrolling"

patterns-established:
  - "Pattern: Fine-grained selectors - components subscribe to specific state slices"
  - "Pattern: Viewport-based loading - fetch only visible range + buffer"

# Metrics
duration: 5 min
completed: 2026-02-22
---

# Phase 34 Plan 1: Viewport Store & Query Foundation Summary

**Zustand viewport store with fine-grained selectors, TanStack Query provider, and viewport-based crime data hook**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T12:03:37Z
- **Completed:** 2026-02-22T12:09:00Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Created Zustand viewport store with fine-grained selectors (useViewportBounds, useViewportZoom, useCrimeFilters, etc.)
- Set up TanStack Query v5 provider with 5-min staleTime, 10-min gcTime
- Integrated QueryProvider into root layout
- Created useViewportCrimeData hook with 30-day buffer logic
- Hook subscribes to viewport state from store, not props - reactive updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zustand viewport store** - `e174e70` (feat)
2. **Task 2: Set up TanStack Query provider** - `b1f8500` (feat)
3. **Task 3: Create useViewportCrimeData hook** - `cbec827` (feat)
4. **Task 4: Integrate QueryProvider into layout** - `7a2e34d` (feat)

**Plan metadata:** (docs commit - see final commit)

## Files Created/Modified
- `src/lib/stores/viewportStore.ts` - Zustand store with fine-grained selectors
- `src/providers/QueryProvider.tsx` - TanStack Query wrapper with caching config
- `src/hooks/useViewportCrimeData.ts` - Viewport-based data fetching hook
- `src/app/layout.tsx` - Added QueryProvider wrapper

## Decisions Made
- Used fine-grained Zustand selectors to prevent full-app re-renders when unrelated state changes
- TanStack Query staleTime: 5 minutes (matches research recommendation)
- Buffer default: 30 days - balances smooth scrolling vs data volume
- Hook subscribes to store (not props) for reactive viewport updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness
- Viewport store ready for use in timeline components
- QueryProvider active - all useQuery hooks will benefit from caching
- useViewportCrimeData ready for API integration (plan 34-03)
- Buffer logic in place - will prevent loading full 8.4M dataset

---
*Phase: 34-01*
*Completed: 2026-02-22*
