---
phase: 13-ux-ia-and-cube-concept
plan: 05
subsystem: testing
tags: [nextjs, vitest, source-inspection, dashboard-demo, timeline, cube]

# Dependency graph
requires:
  - phase: 13-04
    provides: shared selection story wiring across timeline, map, and cube
  - phase: 12
    provides: refactored demo/timeline/cube component boundaries
provides:
  - source-inspection regression coverage for the dashboard-demo shell
  - timeline compare-copy regression coverage
  - cube relational-copy regression coverage
  - stable dashboard isolation guard for demo-only IA wording
affects: [phase 13 refactors, dashboard-demo, timeline, cube, future UX/IA cleanup]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [source-inspection regression tests, story-language locking, route isolation guards]

key-files:
  created: [src/components/timeline/DemoTimelinePanel.phase13.test.ts, src/components/viz/CubeVisualization.phase13.test.ts]
  modified: [src/app/dashboard-demo/page.shell.test.tsx, src/app/dashboard/page.shell.test.tsx]

key-decisions:
  - "Lock the Phase 13 story language with source-inspection tests instead of browser assertions."
  - "Keep stable dashboard exclusion checks broad enough to catch demo-only IA leakage."

patterns-established:
  - "Pattern 1: Source-inspection regression tests guard narrative copy and shell composition."
  - "Pattern 2: Demo shell language can evolve internally while stable routes remain explicitly excluded."

# Metrics
duration: 1h 13m
completed: 2026-04-23
---

# Phase 13: UX/IA redesign + cube concept Summary

**Source-inspection tests now lock the guided workflow shell, timeline compare language, and relational cube copy against future drift.**

## Performance

- **Duration:** 1h 13m
- **Started:** 2026-04-23T15:33:20Z
- **Completed:** 2026-04-23T16:46:35Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Locked `/dashboard-demo` shell copy, explain rail, and workflow stage wording.
- Locked timeline compare framing and shared selection-story labels with source-inspection tests.
- Locked cube relational-mode language, linked-selection cues, and slice-summary wording.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the route-shell regression coverage** - `9f82078` (test)
2. **Task 2: Add a timeline compare-copy regression test** - `17e1c90` (test)
3. **Task 3: Add a cube relational-copy regression test** - `90caacf` (test)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `src/app/dashboard-demo/page.shell.test.tsx` - locks guided workflow IA and explain-rail copy.
- `src/app/dashboard/page.shell.test.tsx` - keeps stable dashboard wording isolated from demo chrome.
- `src/components/timeline/DemoTimelinePanel.phase13.test.ts` - locks compare framing and summary labels.
- `src/components/viz/CubeVisualization.phase13.test.ts` - locks relational cube language and linked-selection copy.

## Decisions Made
- Use source-inspection regression tests to protect the new Phase 13 story language.
- Keep stable route assertions negative so demo-only wording cannot leak back into `/dashboard`.
- Focus coverage on copy contracts rather than browser behavior because the phase goal is drift prevention.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 is complete and ready to hand off to Phase 14.
- Existing unrelated repo warnings remain outside this plan's scope.

---
*Phase: 13-ux-ia-and-cube-concept*
*Completed: 2026-04-23*
