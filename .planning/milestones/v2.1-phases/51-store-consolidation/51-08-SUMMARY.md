---
phase: 51-store-consolidation
plan: 08
subsystem: ui
tags: [zustand, threejs, timeline-store, selectors, visualization]

# Dependency graph
requires:
  - phase: 51-store-consolidation
    provides: canonical timeline data ownership and compatibility shim from 51-03
provides:
  - Core visualization scene/render surfaces rewired to `useTimelineDataStore`
  - Main loop/grid/slice wiring detached from deprecated `@/store/useDataStore` imports
  - Canonical `DataPoint` type import path used in `DataPoints`
affects: [51-09, 51-10, 51-11, 51-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Migrate high-impact render surfaces first, then enforce import-gate verification
    - Prefer canonical `src/lib/data/*` and `useTimelineDataStore` imports in viz components

key-files:
  created: []
  modified:
    - src/components/viz/CubeVisualization.tsx
    - src/components/viz/MainScene.tsx
    - src/components/viz/DataPoints.tsx
    - src/components/viz/TimeGrid.tsx
    - src/components/viz/TimeLoop.tsx
    - src/components/viz/TimeSlices.tsx

key-decisions:
  - "Moved the core scene/render batch to `useTimelineDataStore` first to reduce highest-risk deprecated store dependencies with minimal behavior change."
  - "Kept runtime rendering parity and only changed data source wiring/import ownership in this plan."

patterns-established:
  - "Core viz migration pattern: rewire imports, run file-scoped lint, then run explicit deprecated-import gate."

# Metrics
duration: 1 min
completed: 2026-03-10
---

# Phase 51 Plan 08: Core Viz Store Rewire Summary

**Migrated the core 3D visualization scene/render batch to `useTimelineDataStore` and verified zero deprecated `useDataStore` imports across the targeted files.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-10T02:08:16+01:00
- **Completed:** 2026-03-10T02:08:55+01:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Rewired `CubeVisualization`, `MainScene`, `DataPoints`, `TimeGrid`, `TimeLoop`, and `TimeSlices` to canonical timeline store imports.
- Switched `DataPoints` to shared `DataPoint` type ownership from `src/lib/data/types`.
- Enforced the explicit import gate for this batch and confirmed zero `@/store/useDataStore` imports remain in all six target files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire core viz scene/render files to canonical data imports** - `da81c83` (feat)
2. **Task 2: Verify zero deprecated imports in core viz batch** - `c5e6164` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/components/viz/CubeVisualization.tsx` - switched scene bootstrap data loading to `useTimelineDataStore`.
- `src/components/viz/MainScene.tsx` - switched global adaptive fallback data reads to `useTimelineDataStore`.
- `src/components/viz/DataPoints.tsx` - switched store/type imports and converted texture setup to lint-safe memoized textures.
- `src/components/viz/TimeGrid.tsx` - switched timestamp domain reads to `useTimelineDataStore`.
- `src/components/viz/TimeLoop.tsx` - switched loop step-domain reads to `useTimelineDataStore`.
- `src/components/viz/TimeSlices.tsx` - switched slice-scale data reads to `useTimelineDataStore` and removed unused `useRef` import.

## Decisions Made

- Prioritized parity-safe import rewiring for high-impact render surfaces before deeper supporting-overlay migration.
- Kept this plan scoped to canonical store/type ownership changes and import-gate enforcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved lint blocker in DataPoints texture updates**
- **Found during:** Task 1 (core viz scene/render rewiring)
- **Issue:** File-scoped lint failed on `react-hooks/immutability` violations for direct `DataTexture` mutation in `DataPoints.tsx`.
- **Fix:** Reworked texture creation/update path to use memoized texture instances with cleanup disposal, avoiding direct mutation of hook-managed values.
- **Files modified:** `src/components/viz/DataPoints.tsx`
- **Verification:** `npm run lint -- src/components/viz/CubeVisualization.tsx src/components/viz/MainScene.tsx src/components/viz/DataPoints.tsx src/components/viz/TimeGrid.tsx src/components/viz/TimeLoop.tsx src/components/viz/TimeSlices.tsx` reports no errors.
- **Committed in:** `da81c83`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking fix was required to satisfy the task verification gate; scope remained within targeted core viz files.

## Issues Encountered

- Lint produced warnings in `DataPoints.tsx` for pre-existing unused locals (`burstThreshold`, raycast debug refs/state), but no errors after the blocker fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Core visualization scene/render surfaces are now detached from deprecated store imports.
- Remaining migration scope is narrowed to supporting/inspector overlay components still on compatibility imports.
- Ready for the next store-consolidation plan to continue deprecated import elimination toward `useDataStore` removal.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
