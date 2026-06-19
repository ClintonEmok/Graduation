---
phase: 13-ux-ia-and-cube-concept
plan: 02
subsystem: timeline
tags: [timeline, compare-mode, adaptive-scale, workflow, react, ux]

# Dependency graph
requires:
  - phase: 13-01
    provides: guided workflow shell and explain rail context
provides:
  - shared demo timeline summary hook
  - compare-friendly dual timeline copy
  - timeline panel labels for scale and burst status
affects: [timeline-panel, dual-timeline, compare-copy, selection-story]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared summary hook, compare framing, timeline-driver narration]

key-files:
  created:
    - src/components/timeline/hooks/useDemoTimelineSummary.ts
  modified:
    - src/components/timeline/DemoDualTimeline.tsx
    - src/components/dashboard-demo/DemoTimelinePanel.tsx

key-decisions:
  - "Centralized the timeline story text in a reusable hook rather than duplicating labels"
  - "Kept the focused track and raw baseline comparison cue visible above the dual timeline"
  - "Used the dual timeline’s top label as the primary analysis driver copy"

patterns-established:
  - "Timeline narration now comes from a shared summary object"
  - "Compare-mode text is shown at the panel level instead of hidden in controls"

requirements-completed: [UX-02]

# Metrics
duration: unknown
completed: 2026-04-23
---

# Phase 13 Plan 02: Timeline Compare Summary

**Centralized the timeline story labels and made the dual timeline read as the primary analysis driver**

## Performance

- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added `useDemoTimelineSummary` to derive compare, scale, burst, and selection labels from existing stores
- Reframed `DemoDualTimeline` with driver-focused brush text
- Added compare labels above the dual timeline in `DemoTimelinePanel`

## Task Commits

1. **Task 1: Create a timeline story view-model** — `c563fbe` (feat)
2. **Task 2: Make the dual timeline read as the main analysis driver** — `4e47275` (feat)
3. **Task 3: Tighten the timeline panel controls and labels** — `e7651b6` (feat)

## Files Created/Modified
- `src/components/timeline/hooks/useDemoTimelineSummary.ts` - shared summary hook for compare and selection labels
- `src/components/timeline/DemoDualTimeline.tsx` - driver-oriented brush label and compare framing
- `src/components/dashboard-demo/DemoTimelinePanel.tsx` - compare summary strip above the dual timeline

## Decisions Made
- Kept the existing scale toggle and warp-source controls rather than replacing them with new controls
- Used a reusable summary hook so timeline text can stay in sync across the panel and the dual timeline
- Preserved the raw-baseline comparison cue to make the focused track’s role obvious

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - source inspection and linting on the changed files passed.

## Next Phase Readiness
- The timeline is now the primary narrative surface for the demo
- Compare and selection copy are centralized and ready for cube-linking work
- Ready to continue with Phase 13 plan 03

---
*Phase: 13-ux-ia-and-cube-concept*
*Completed: 2026-04-23*
