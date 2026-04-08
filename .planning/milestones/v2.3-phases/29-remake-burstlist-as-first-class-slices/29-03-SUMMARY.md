---
phase: 29-remake-burstlist-as-first-class-slices
plan: 03
subsystem: ui
tags: [timeslicing, burst, slice-store, timeline, react]

# Dependency graph
requires:
  - phase: 29-01
    provides: Burst slice creation/reuse APIs (`addBurstSlice`, `findMatchingSlice`) and range matching tolerance helpers
provides:
  - Burst list interactions now create or reuse matching slices and select via the shared active-slice model
  - Timeline burst overlays now create or reuse matching slices and highlight based on active matching slice
  - Shared burst-driven timeline focus utility used by both burst entry points
affects: [29-04-polish, 30-multi-slice-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Burst interactions are modeled as slice operations (create/reuse + activate) instead of coordination-store toggle state
    - Shared timeline-focus helper centralizes burst range focus behavior across UI entry points

key-files:
  created: []
  modified:
    - src/components/viz/BurstList.tsx
    - src/components/timeline/DualTimeline.tsx
    - src/lib/slice-utils.ts

key-decisions:
  - "Burst selected styling in both BurstList and DualTimeline is derived from active matching slice ID, not selected burst windows."
  - "focusTimelineRange accepts setter callbacks so slice-utils remains testable and avoids store import coupling in unit tests."

patterns-established:
  - "Bidirectional burst-slice mapping: burst click always resolves to a concrete slice and activates it."
  - "Shared focus behavior: burst-driven focus is routed through a single utility to keep timeline range updates consistent."

# Metrics
duration: 5 min
completed: 2026-02-19
---

# Phase 29 Plan 03: Burst Interactions as First-Class Slice Operations Summary

**Burst clicks from both list and timeline now create-or-select matching slices, synchronize to the active slice model, and apply a shared timeline-focus path.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T14:54:51Z
- **Completed:** 2026-02-19T15:00:08Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Replaced BurstList burst-toggle behavior with slice creation/reuse (`addBurstSlice`) and explicit active-slice selection.
- Rewired DualTimeline burst overlays to create/reuse slices on click and highlight based on active matching slice.
- Extracted shared `focusTimelineRange` utility and applied it to both burst entry points for consistent range focusing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update BurstList to create/select slices** - `3364725` (feat)
2. **Task 2: Update DualTimeline burst overlay** - `77d9ff9` (feat)
3. **Task 3: Add timeline focus utility** - `2e06a3a` (refactor)

**Plan metadata:** pending

## Files Created/Modified
- `src/components/viz/BurstList.tsx` - Burst list clicks now create/reuse slices, select active slice, and derive selected state from matching active slice.
- `src/components/timeline/DualTimeline.tsx` - Burst overlay clicks now create/reuse + activate slices and selected overlay styling follows active matching slice.
- `src/lib/slice-utils.ts` - Added shared `focusTimelineRange` helper for consistent burst-driven timeline focus updates.

## Decisions Made
- Use slice-store matching (`findMatchingSlice`) plus `activeSliceId` to drive burst selected visuals in both BurstList and DualTimeline.
- Keep timeline focus logic in a utility that takes setter callbacks, avoiding direct store imports in `slice-utils` and preserving test portability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed store import coupling from `slice-utils` focus utility**
- **Found during:** Task 3 (Add timeline focus utility)
- **Issue:** Initial utility version imported Zustand stores directly; `vitest src/lib/slice-utils.test.ts` failed due import-chain alias resolution in test context.
- **Fix:** Refactored `focusTimelineRange` to accept setter callbacks (`setTimeRange`, `setRange`, `setBrushRange`, `setTime`) from callers.
- **Files modified:** `src/lib/slice-utils.ts`, `src/components/viz/BurstList.tsx`, `src/components/timeline/DualTimeline.tsx`
- **Verification:** `npm test -- src/lib/slice-utils.test.ts` passed (9/9 tests).
- **Committed in:** `2e06a3a` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was required to keep shared utility test-safe and unblock verification; no scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `29-04-PLAN.md` follow-up polish/verification on burst-slice interaction behavior.
- No blockers identified.

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
