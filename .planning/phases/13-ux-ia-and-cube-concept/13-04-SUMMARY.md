---
phase: 13-ux-ia-and-cube-concept
plan: 04
subsystem: cross-view-sync
tags: [selection-story, timeline, map, cube, linked-selection, react]

# Dependency graph
requires:
  - phase: 13-01
    provides: guided workflow shell and explain rail
  - phase: 13-02
    provides: compare-friendly timeline story and labels
  - phase: 13-03
    provides: relational cube shell and linked cues
provides:
  - shared selection story helper
  - demo map/cube sync around the same active window
  - timeline story authority for linked selection
affects: [timeline, map, cube, selection-state, linked-story]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared story helper, demo-only story overlays, timeline-authoritative selection]

key-files:
  created:
    - src/components/dashboard-demo/lib/buildDashboardDemoSelectionStory.ts
  modified:
    - src/components/dashboard-demo/DashboardDemoShell.tsx
    - src/components/dashboard-demo/DemoMapVisualization.tsx
    - src/components/dashboard-demo/DemoTimelinePanel.tsx
    - src/components/timeline/hooks/useDemoTimelineSummary.ts
    - src/components/viz/CubeVisualization.tsx

key-decisions:
  - "Centralized the active-window and linked-highlight story into one reusable helper"
  - "Kept the demo map and cube in sync without touching the stable dashboard route"
  - "Kept the timeline as the authoritative source for selection story labels"

patterns-established:
  - "One shared selection story now feeds timeline, map, and cube copy"
  - "Demo overlays can explain the same active window without separate state copies"

requirements-completed: [UX-03]

# Metrics
duration: unknown
completed: 2026-04-23
---

# Phase 13 Plan 04: Shared Selection Story Summary

**Built a single selection story so the timeline, map, and cube all describe the same active window and linked highlight**

## Performance

- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added a pure shared selection story helper plus demo hook
- Added demo map and cube story overlays that mirror the same active window text
- Kept the timeline as the source of truth for the shared selection story labels

## Task Commits

1. **Task 1: Derive a single shared selection story** — `0d4f0e5` (feat)
2. **Task 2: Wire the map and cube to the shared story** — `f9cd36b` (feat)
3. **Task 3: Keep the timeline authoritative for the shared story** — `43b29c9` (feat)

## Files Created/Modified
- `src/components/dashboard-demo/lib/buildDashboardDemoSelectionStory.ts` - shared selection story helper and hook
- `src/components/dashboard-demo/DashboardDemoShell.tsx` - passes the shared story to the demo cube
- `src/components/dashboard-demo/DemoMapVisualization.tsx` - map story overlay
- `src/components/dashboard-demo/DemoTimelinePanel.tsx` - shared story labels above the dual timeline
- `src/components/timeline/hooks/useDemoTimelineSummary.ts` - timeline summary derived from the shared story
- `src/components/viz/CubeVisualization.tsx` - cube story overlay

## Decisions Made
- Used the timeline’s current selection as the single story source for other views
- Kept the shared-story overlay additive and lightweight in the map and cube
- Left the stable dashboard route behavior unchanged

## Deviations from Plan

None - plan executed with additive story wiring only.

## Issues Encountered

None - source inspection and linting on the changed files passed.

## Next Phase Readiness
- The active window label now stays consistent across the timeline, map, and cube
- Ready to continue with Phase 13 plan 05

---
*Phase: 13-ux-ia-and-cube-concept*
*Completed: 2026-04-23*
