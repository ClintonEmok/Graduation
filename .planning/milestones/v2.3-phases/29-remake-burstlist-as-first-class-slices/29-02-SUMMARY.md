---
phase: 29-remake-burstlist-as-first-class-slices
plan: 02
subsystem: ui
tags: [timeslicing, burst, slice-list, accessibility, react]

# Dependency graph
requires:
  - phase: 29-01
    provides: Burst slice metadata and store-level ordering for manual/burst slices
provides:
  - Unified slice list treatment for manual and burst-derived slices with subtle burst-origin affordance
  - Manual and burst fallback naming parity (`Slice N` vs `Burst N`) with rename-aware chip behavior
  - Accessibility labels that announce burst origin and selection state in the list
affects: [29-03-burst-interaction-wiring, 30-multi-slice-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Keep burst-origin indicator visually minimal and only show while default burst naming remains
    - Apply defensive client-side timeline sorting in UI consumers of persisted slices for stable display

key-files:
  created: []
  modified:
    - src/app/timeline-test/components/SliceList.tsx
    - src/app/timeline-test/components/SliceToolbar.tsx

key-decisions:
  - "Burst chip appears only for burst-derived slices still using Burst naming, so renamed slices read as normal user-owned slices."
  - "Burst chip style tokens are defined in SliceToolbar and reused in SliceList to keep subtle badge treatment consistent."

patterns-established:
  - "Unified list parity: burst slices share the same card structure as manual slices with a lightweight origin chip."
  - "A11y-first list labels: list item labels include origin, time range, and selected state."

# Metrics
duration: 1 min
completed: 2026-02-19
---

# Phase 29 Plan 02: Unified Burst/Manual Slice List Summary

**SliceList now renders manual and burst-derived slices in one chronological list with subtle burst-origin chips, rename-aware fallback naming, and improved accessibility labels.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-19T14:56:07Z
- **Completed:** 2026-02-19T14:57:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added a subtle `Burst` chip on burst-derived slices while preserving visual parity with manual slice cards.
- Implemented display naming behavior that keeps manual fallback names as `Slice N` and burst fallback names as `Burst N`.
- Added explicit accessibility labels for slice origin and selection state, plus minor empty-state and truncation polish.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add burst chip to slice list items** - `c9b7501` (feat)
2. **Task 2: Verify sorting and empty states** - `196d66c` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/app/timeline-test/components/SliceList.tsx` - Added burst chip rendering, fallback naming, defensive sorting, and a11y label polish.
- `src/app/timeline-test/components/SliceToolbar.tsx` - Added shared burst chip style constants used by `SliceList`.

## Decisions Made
- Show the burst chip only when `isBurst` is true and the display name still starts with `Burst`, so renamed burst slices visually blend with manual slices.
- Keep a client-side defensive sort aligned with store rules (timeline start, manual-before-burst ties) to guarantee deterministic mixed-list display.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `29-03-PLAN.md` burst interaction wiring against the unified list presentation.
- No blockers identified.

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
