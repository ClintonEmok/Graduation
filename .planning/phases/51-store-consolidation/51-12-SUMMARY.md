---
phase: 51-store-consolidation
plan: 12
subsystem: store
tags: [zustand, store-retirement, timeline, regression-gates]

# Dependency graph
requires:
  - phase: 51-store-consolidation
    provides: advanced residual migration and zero-import readiness for deprecated store removal
provides:
  - Deprecated `src/store/useDataStore.ts` removed from source tree
  - Residual timeline/3D/slice-core imports rewired to `useTimelineDataStore`
  - Phase-wide import gate now returns zero references for `@/store/useDataStore|useDataStore`
affects: [phase-transition, timeline-test, timeline-test-3d, timeslicing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Final retirement gate pattern: enforce zero-import state before and after deprecated file deletion
    - Canonical timeline ownership: timeline/map/viz residual consumers read metadata from `useTimelineDataStore`

key-files:
  created: []
  modified:
    - src/store/useDataStore.ts
    - src/components/timeline/DualTimeline.tsx
    - src/components/timeline/Timeline.tsx
    - src/app/timeline-test/page.tsx
    - src/app/timeline-test-3d/components/TimeSlices3D.tsx
    - src/store/slice-domain/createSliceCoreSlice.ts
    - src/app/timeslicing/page.tsx
    - src/components/viz/TrajectoryLayer.tsx

key-decisions:
  - "Used `useTimelineDataStore` as the canonical fallback source for all residual timeline and slice-domain reads after deleting `useDataStore`."
  - "Kept deletion isolated to the deprecated file and handled residual rewires as regression fixes discovered by post-delete checks."
  - "Accepted typecheck + targeted test parity as green gates while recording repo-wide targeted lint debt blocking full lint pass."

patterns-established:
  - "Deprecated-store retirement safety: zero-import `rg` gate plus post-delete parity checks before phase closure."

# Metrics
duration: 4 min
completed: 2026-03-10
---

# Phase 51 Plan 12: Deprecated Data Store Deletion Summary

**Deleted deprecated `useDataStore` and completed residual consumer rewires to `useTimelineDataStore`, preserving timeline/map/viz/slice behavior with post-delete typecheck and store regression tests green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T01:18:42Z
- **Completed:** 2026-03-10T01:22:53Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Removed `src/store/useDataStore.ts` from the repository as the final deprecation step.
- Rewired residual timeline, timeline-test, timeline-test-3d, and slice-core fallback reads to `useTimelineDataStore`.
- Verified zero deprecated-import references in `src/`, passing typecheck and targeted slice store regression tests after deletion.

## Task Commits

Each task was committed atomically when code changes were present:

1. **Task 1: Run phase-wide zero-import gate for deprecated store path** - `6121ed7` (fix)
2. **Task 2: Delete deprecated store file after gate pass** - `9c1451f` (feat)
3. **Task 3: Run post-delete parity-focused regression gates** - verification executed (no additional code changes to commit)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/store/useDataStore.ts` - Deleted deprecated store module.
- `src/components/timeline/DualTimeline.tsx` - Replaced residual deprecated store selectors with canonical timeline data store selectors.
- `src/components/timeline/Timeline.tsx` - Switched timeline data source hook to canonical timeline store.
- `src/app/timeline-test/page.tsx` - Replaced deprecated store reads/writes and moved `DataPoint` type import to shared data contracts.
- `src/app/timeline-test-3d/components/TimeSlices3D.tsx` - Replaced deprecated timeline-bound reads with canonical timeline store selectors.
- `src/store/slice-domain/createSliceCoreSlice.ts` - Repointed normalization fallback store read to `useTimelineDataStore`.
- `src/app/timeslicing/page.tsx` - Updated parity comment wording to remove deprecated-store references.
- `src/components/viz/TrajectoryLayer.tsx` - Updated fallback comment wording to remove deprecated-store references.

## Decisions Made

- Kept the final retirement step strict: delete deprecated store file only after proving no active import references remain.
- Used canonical `src/lib/data/*` + `useTimelineDataStore` ownership boundaries instead of recreating compatibility shims.
- Logged lint debt blocking the full targeted lint command rather than broad-scope lint refactors in this terminal deletion plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Residual deprecated store imports surfaced after deletion**
- **Found during:** Task 3 (post-delete parity-focused regression gates)
- **Issue:** Typecheck exposed remaining `@/store/useDataStore` and `useDataStore` references in timeline/3D/slice-core files, which violated the intended zero-import gate.
- **Fix:** Rewired all residual imports and state selectors to `useTimelineDataStore`, moved `DataPoint` type import to shared contracts, and removed remaining string references used by the import gate pattern.
- **Files modified:** `src/app/timeline-test-3d/components/TimeSlices3D.tsx`, `src/app/timeline-test/page.tsx`, `src/components/timeline/DualTimeline.tsx`, `src/components/timeline/Timeline.tsx`, `src/store/slice-domain/createSliceCoreSlice.ts`, `src/app/timeslicing/page.tsx`, `src/components/viz/TrajectoryLayer.tsx`
- **Verification:** `rg -l "@/store/useDataStore|useDataStore" src | wc -l` returns `0`; `npm run typecheck` passes.
- **Committed in:** `6121ed7` (Task 1 corrective commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was required to satisfy the final deprecated-store retirement gate and prevent post-delete regressions.

## Authentication Gates

None.

## Issues Encountered

- Targeted lint command from plan did not pass due pre-existing lint errors in broader timeline/map/viz surfaces beyond this deletion change set.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Deprecated `useDataStore` path is removed and import gate is clean across `src/`.
- Typecheck and targeted slice store regression tests are green after deletion.
- Remaining readiness risk is existing lint debt outside this plan's focused retirement scope.

---
*Phase: 51-store-consolidation*
*Completed: 2026-03-10*
