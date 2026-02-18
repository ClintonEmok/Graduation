---
phase: 27-manual-slice-creation
plan: 05
subsystem: ui
tags: [timeline, mock-data, dates, d3, zustand]

# Dependency graph
requires:
  - phase: 27-03
    provides: Manual slice creation flow and timeline-test slice interactions
provides:
  - Mock timeline constants for a fixed Jan-Dec 2024 UTC domain
  - Mock data generation using real epoch timestamps with bounded store time domain
  - Timeline-test date-based domain wiring for density + DualTimeline rendering
affects: [28-slice-boundary-adjustment, 29-multi-slice-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fixed UTC mock date-window constants with ms/sec variants
    - Timeline-test mock domain alignment with epoch-second store boundaries

key-files:
  created: []
  modified:
    - src/lib/constants.ts
    - src/store/useDataStore.ts
    - src/app/timeline-test/page.tsx

key-decisions:
  - "Use a fixed 2024 UTC mock window to produce deterministic, readable timeline labels and tooltips."
  - "Store min/max timeline bounds in epoch seconds while generating mock timestamps from epoch-based date constants."

patterns-established:
  - "Mock Time Domain: define date bounds once in constants and reuse across store and timeline test harness."

# Metrics
duration: 3 min
completed: 2026-02-18
---

# Phase 27 Plan 05: Mock Date Domain Gap Closure Summary

**Timeline mock data now uses a fixed 2024 epoch-backed domain so timeline axes and hover labels render readable calendar dates instead of normalized placeholders.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T18:19:26Z
- **Completed:** 2026-02-18T18:22:32Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added exported mock date constants (`MOCK_START_DATE`/`MOCK_END_DATE`) plus ms/sec derivatives in `src/lib/constants.ts`.
- Updated `generateMockData` in `src/store/useDataStore.ts` to generate epoch-range timestamps and set mock min/max timestamp bounds.
- Updated `src/app/timeline-test/page.tsx` to run mock density and timeline domain over the 2024 second-based range and seed store bounds for DualTimeline.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mock date range constants** - `ab94c5d` (feat)
2. **Task 2: Update generateMockData to create real timestamps** - `fa69c65` (fix)
3. **Task 3: Update timeline-test page scale domain** - `e6c567d` (fix)

**Plan metadata:** pending docs commit in this execution

## Files Created/Modified
- `src/lib/constants.ts` - Added 2024 UTC mock start/end constants in both milliseconds and seconds.
- `src/store/useDataStore.ts` - Switched mock timestamp generation to epoch-based range and set store time bounds.
- `src/app/timeline-test/page.tsx` - Replaced 0-100 mock domain assumptions with 2024 epoch-second domain wiring.

## Decisions Made
- Use a fixed Jan-Dec 2024 UTC domain for all mock timeline constants so labels/tooltips are stable and human-readable.
- Keep `TIME_MIN`/`TIME_MAX` unchanged for compatibility while introducing dedicated `MOCK_*` time constants for date-aware flows.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm run -s lint -- src/lib/constants.ts src/store/useDataStore.ts src/app/timeline-test/page.tsx` reports pre-existing `no-explicit-any` errors and unused-variable warnings in `src/store/useDataStore.ts`; no new lint violations were introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Timeline-test mock timeline now uses real date-domain boundaries and is ready for follow-on slice UX refinements.
- No blockers identified for Phase 28 work.

---
*Phase: 27-manual-slice-creation*
*Completed: 2026-02-18*
