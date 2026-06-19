---
phase: 03-demo-timeline-rewrite
plan: 01
subsystem: ui
tags: [nextjs, react, timeline, zustand, vitest]

requires:
  - phase: 02-dashboard-demo-ui-ux
    provides: demo shell, shared viewport, fixed STKDE rail, nested workflow scaffold, route-isolation baseline
provides:
  - demo-only timeline wrapper that leaves the shared DualTimeline baseline untouched
  - collapsible slice companion section above the demo timeline
  - route-specific dashboard-demo shell wiring for the new timeline panel
  - source-inspection regression coverage for demo shell isolation
affects: [phase 4 workflow isolation, dashboard-demo route, future timeline rewrites]

tech-stack:
  added: []
  patterns:
    - demo-specific component wrapper over shared timeline primitives
    - collapsible companion section above the timeline surface
    - source-inspection regression tests for route isolation
    - passive reuse of shared stores instead of a new demo-specific boundary

key-files:
  created:
    - src/components/timeline/DemoDualTimeline.tsx
    - src/components/dashboard-demo/DemoTimelinePanel.tsx
  modified:
    - src/components/dashboard-demo/DashboardDemoShell.tsx
    - src/app/dashboard-demo/page.shell.test.tsx

key-decisions:
  - "Keep the production DualTimeline and TimelinePanel untouched and build the demo timeline as a separate wrapper/composition layer."
  - "Use the existing slice, time, and timeslicing stores as shared inputs; no demo-specific store boundary was added."
  - "Place slice manipulation in a collapsible companion section above the timeline to reduce demo clutter while keeping controls visible."
  - "Protect the route pivot with source-inspection tests so the demo shell does not leak into stable dashboard routes."

patterns-established:
  - "Pattern 1: route-specific demo panel layers a compact companion UI over shared visualization primitives."
  - "Pattern 2: a wrapper component can shift demo defaults without mutating the shared baseline component."
  - "Pattern 3: source-level route regression tests can guard shell composition without full rendering overhead."

requirements-completed: [DTL-01, DTL-02, DTL-03, DTL-04, DTL-05]

# Metrics
duration: 24m
completed: 2026-04-09
---

# Phase 3: Demo Timeline Rewrite Summary

**Demo-specific timeline wrapper with a collapsible slice companion and route-isolation regression guard**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-09T11:08:23Z
- **Completed:** 2026-04-09T11:32:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `DemoDualTimeline` as a thin demo-only wrapper over the shared timeline baseline.
- Added `DemoTimelinePanel` with a collapsible companion section above the timeline and compact slice controls.
- Rewired `/dashboard-demo` to use the new demo panel and extended route-isolation regression coverage.

## Task Commits

1. **Task 1: Build the demo-only timeline wrapper and companion section** - `a832ee5` (feat)
2. **Task 2: Rewire the demo shell and lock route-isolation regression tests** - `4154a0e` (test)

## Files Created/Modified
- `src/components/timeline/DemoDualTimeline.tsx` - Demo-only wrapper around the shared timeline baseline.
- `src/components/dashboard-demo/DemoTimelinePanel.tsx` - Route-specific timeline panel with collapsible slice companion and visible controls.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` - Switched the demo shell from `TimelinePanel` to `DemoTimelinePanel`.
- `src/app/dashboard-demo/page.shell.test.tsx` - Added source-inspection coverage for demo/stable route isolation.

## Decisions Made
- The demo timeline should be a composition layer, not a rewrite of the shared production timeline.
- The slice companion belongs above the timeline and should collapse away when users want a cleaner view.
- Shared stores are sufficient for this phase; a demo-specific store boundary would add unnecessary complexity.
- Route isolation is best protected with source-inspection tests that compare demo and stable shell composition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed lint-only shell noise**
- **Found during:** Task 2 (route isolation wiring)
- **Issue:** The demo shell had an unused `Layers3` import and the new panel had an unnecessary hook dependency warning.
- **Fix:** Removed the unused import and simplified the callback dependency list.
- **Files modified:** `src/components/dashboard-demo/DashboardDemoShell.tsx`, `src/components/dashboard-demo/DemoTimelinePanel.tsx`
- **Verification:** `pnpm exec eslint src/components/dashboard-demo/DemoTimelinePanel.tsx src/components/timeline/DemoDualTimeline.tsx src/components/dashboard-demo/DashboardDemoShell.tsx src/app/dashboard-demo/page.shell.test.tsx`
- **Committed in:** `4154a0e`

**2. [Rule 3 - Blocking] Tightened a brittle negative test assertion**
- **Found during:** Task 2 (route isolation wiring)
- **Issue:** The initial negative regex matched `DemoTimelinePanel` because it contained the shared `TimelinePanel` substring.
- **Fix:** Switched the assertion to a word-boundary match so it only blocks the shared shell name.
- **Files modified:** `src/app/dashboard-demo/page.shell.test.tsx`
- **Verification:** `pnpm exec vitest run src/app/dashboard-demo/page.shell.test.tsx --reporter=dot`
- **Committed in:** `4154a0e`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to keep the new demo panel lint-clean and the route regression test precise.

## Issues Encountered
- The first pass of the route regression test failed because the negative assertion was too broad; tightening it resolved the issue immediately.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 is complete and the demo timeline now has a clean route-specific composition.
- Phase 4 can build on the isolated demo surface without mutating the production timeline baseline.
- Existing repo-wide unrelated typecheck concerns remain outside this phase.

---
*Phase: 03-demo-timeline-rewrite*
*Completed: 2026-04-09*
