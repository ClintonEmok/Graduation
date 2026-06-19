---
phase: 09-burstiness-driven-slice-generation
plan: 03
subsystem: ui
tags: [burstiness, dashboard-demo, timeline, slices, zustand, vitest]

# Dependency graph
requires:
  - phase: 09-02
    provides: burst draft generation controls and pre-apply preview cues
provides:
  - Pending burst drafts are editable before apply in the dashboard-demo slice rail
  - Workflow shell copy now frames burst drafts as reviewable and mutable
  - Timeline preview labels pending burst bins as editable draft state
  - Source-inspection coverage for pending-draft edit wiring
affects: [phase-10, dashboard-demo, timeslicing-boundary]

# Tech tracking
tech-stack:
  added: []
  patterns: [pending-draft review before apply, editable burst draft cues, source-locked demo workflow regression]

key-files:
  created: []
  modified:
    - src/components/dashboard-demo/DemoSlicePanel.tsx
    - src/components/dashboard-demo/WorkflowSkeleton.tsx
    - src/components/timeline/DemoDualTimeline.tsx
    - src/app/dashboard-demo/page.shell.test.tsx

key-decisions:
  - "Keep draft editing scoped to pendingGeneratedBins so pre-apply burst drafts stay separate from applied slices."
  - "Use explicit review-before-apply copy in the workflow shell and rail instead of hiding the edit affordances inside the applied slice editor."
  - "Mirror the editable-draft language in the timeline so the whole demo reads the same way before apply."

patterns-established:
  - "Pattern 1: pending burst drafts get their own review surface with merge, split, and delete actions."
  - "Pattern 2: workflow, rail, and timeline all use the same editable pre-apply vocabulary."
  - "Pattern 3: source-inspection tests lock the pre-apply draft contract without touching the stable route."

requirements-completed: []

# Metrics
duration: 5 min
completed: 2026-04-13
---

# Phase 09 Plan 03: Editable Pending Burst Drafts Summary

**Pending burst drafts now have their own editable review surface, with matching workflow and timeline cues that keep the pre-apply state explicit.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-13T13:55:55Z
- **Completed:** 2026-04-13T14:00:43Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added a dedicated pending-burst draft review section with merge, split, and delete actions.
- Reworded the workflow skeleton so burst drafts read as editable before apply.
- Marked pending burst draft previews as editable in the dual timeline.
- Extended the dashboard-demo shell regression test to lock the edit wiring and copy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a pending-draft editor surface in the slice rail** - `8b70753` (feat)
2. **Task 2: Thread editable-draft cues through the shell and timeline** - `611e779` (feat)
3. **Task 3: Lock the pending-draft review contract** - `4ec9ec5` (test)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `src/components/dashboard-demo/DemoSlicePanel.tsx` - pending burst draft review surface and edit controls
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` - review-before-apply copy and editable draft language
- `src/components/timeline/DemoDualTimeline.tsx` - editable burst draft preview label
- `src/app/dashboard-demo/page.shell.test.tsx` - source-inspection coverage for the pending-draft contract

## Decisions Made
- Kept pending draft editing separate from the applied slice editor so the review-before-apply boundary stays obvious.
- Used the same editable burst draft language across the workflow shell, slice rail, and timeline.
- Locked the new draft-review wiring with source-inspection assertions instead of route behavior changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pending burst drafts are now reviewable and editable before apply.
- The demo workflow/timeline copy now matches the mutable draft state.
- Ready for the next Phase 09 gap-closure step.

---
*Phase: 09-burstiness-driven-slice-generation*
*Completed: 2026-04-13*
