---
phase: 09-burstiness-driven-slice-generation
plan: 04
subsystem: state-management
tags: [zustand, vitest, slices, burst-drafts, nextjs, typescript]

# Dependency graph
requires:
  - phase: 09-burstiness-driven-slice-generation
    provides: burst draft generation and pending burst metadata
provides:
  - demo apply path that replaces the active slice set from pending burst drafts
  - regression coverage for replace-on-apply behavior
affects: [phase 10 workflow isolation, dashboard-demo timeslicing flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [store-to-store apply handoff, regression test for slice replacement]

key-files:
  created:
    - src/store/useDashboardDemoTimeslicingModeStore.test.ts
  modified:
    - src/store/useDashboardDemoTimeslicingModeStore.ts

key-decisions:
  - "Apply burst drafts through useSliceDomainStore.replaceSlicesFromBins before clearing pending state."
  - "Keep the no-pending apply path as a safe no-op."

patterns-established:
  - "Store apply actions should forward draft data into the slice domain, then clear draft state only after the replacement succeeds."
  - "Demo burst workflow regressions should assert both slice replacement and pending-queue cleanup."

requirements-completed: []

# Metrics
duration: 3 min
completed: 2026-04-13
---

# Phase 09 Plan 04: Burstiness-driven Slice Generation Summary

**Burst drafts now replace the active slice set in the demo workflow, with regression coverage locking the apply handoff.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-13T13:56:45Z
- **Completed:** 2026-04-13T13:59:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wired demo apply to `replaceSlicesFromBins` so pending burst drafts become the active slice set.
- Kept empty-queue apply behavior as a no-op.
- Added a focused regression test covering replacement and queue clearing.

## Task Commits

1. **Task 1: Wire demo apply through the slice domain** - `0cd13a6` (fix)
2. **Task 2: Add a replace-on-apply regression test for the demo store** - `43caecd` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/store/useDashboardDemoTimeslicingModeStore.ts` - forwards burst drafts into the slice domain on apply
- `src/store/useDashboardDemoTimeslicingModeStore.test.ts` - regression test for replace-on-apply behavior

## Decisions Made
- Use the existing slice-domain replacement API rather than inventing a parallel apply mechanism.
- Clear pending drafts only after the slice domain has been replaced.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Zustand persist middleware emitted storage-unavailable warnings under Vitest/jsdom, but the targeted regression test still passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Burst draft application is now wired end to end at the store layer.
- Phase 10 can build on the established store handoff without changing burst generation semantics.

---
*Phase: 09-burstiness-driven-slice-generation*
*Completed: 2026-04-13*
