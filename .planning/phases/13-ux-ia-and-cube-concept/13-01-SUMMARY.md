---
phase: 13-ux-ia-and-cube-concept
plan: 01
subsystem: ui
tags: [dashboard-demo, workflow, explanation-rail, timeline, ux, react]

# Dependency graph
requires:
  - phase: 12
    provides: shared timeline surface and demo shell context
provides:
  - story-led dashboard-demo shell with Phase 13 workflow framing
  - dedicated Explain rail panel for rationale and next actions
  - manual Orient → Apply workflow drawer
affects: [dashboard-demo, workflow-rail, timeline-story, explain-surface]

# Tech tracking
tech-stack:
  added: []
  patterns: [guided workflow shell, fixed explain rail, manual stepper drawer]

key-files:
  created:
    - src/components/dashboard-demo/DemoExplainPanel.tsx
  modified:
    - src/components/dashboard-demo/DashboardDemoShell.tsx
    - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
    - src/components/dashboard-demo/WorkflowSkeleton.tsx

key-decisions:
  - "Kept the map/cube viewport toggle intact while adding explicit workflow framing"
  - "Added a dedicated Explain surface instead of folding rationale into Stats or STKDE"
  - "Turned the workflow drawer into a manual stepper with Orient → Apply stages"

patterns-established:
  - "Dashboard-demo now presents a guided analysis story at shell level"
  - "Rationale content lives in its own rail tab so the analysis surfaces stay focused"

requirements-completed: [UX-01]

# Metrics
duration: unknown
completed: 2026-04-23
---

# Phase 13 Plan 01: Guided Workflow Shell Summary

**Reframed the dashboard-demo shell around a manual workflow path and added a dedicated explanation rail**

## Performance

- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added a Phase 13 header that frames the demo as a guided analysis workflow
- Added `DemoExplainPanel` and wired it into the fixed right rail
- Reworked the workflow drawer copy into a manual Orient → Apply stepper

## Task Commits

1. **Task 1: Recompose the shell around the guided workflow** — `9d5b681` (feat)
2. **Task 2: Add a dedicated Explain rail panel** — `4ba19f4` (feat)
3. **Task 3: Rewrite the workflow drawer as a manual stepper** — `27a8db3` (feat)

## Files Created/Modified
- `src/components/dashboard-demo/DashboardDemoShell.tsx` - Phase 13 workflow header and shell framing
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` - right rail Explain tab wiring
- `src/components/dashboard-demo/DemoExplainPanel.tsx` - rationale / next-action surface
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` - manual stepper copy and stage recaps

## Decisions Made
- Kept the existing shared viewport and viewport toggle behavior intact
- Introduced explanation as a dedicated rail surface instead of overloading other panels
- Preserved the drawer’s visibility while changing it from a 3-step helper to a 6-step manual workflow

## Deviations from Plan

None - plan executed with additive UI changes only.

## Issues Encountered

None - source inspection and linting on the changed files passed.

## Next Phase Readiness
- The shell now communicates the Phase 13 workflow path clearly
- The right rail has an explicit explanation surface for downstream linked-view copy
- Ready to continue with Phase 13 plan 02

---
*Phase: 13-ux-ia-and-cube-concept*
*Completed: 2026-04-23*
