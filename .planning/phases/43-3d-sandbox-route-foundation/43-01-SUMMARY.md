---
phase: 43-3d-sandbox-route-foundation
plan: 01
subsystem: ui
tags: [nextjs, app-router, cube, sandbox, navigation]

# Dependency graph
requires:
  - phase: 34-performance-optimization
    provides: "Current cube visualization and dashboard foundation"
provides:
  - Dedicated `/cube-sandbox` route with cube-first shell
  - Route-local right rail reserved for sandbox context/debug tools
  - Home page CTA to access cube sandbox experimentation flow
affects:
  - 43-02 sandbox context panel behavior
  - v2.0 cube-first experimentation phases 44-50

# Tech tracking
tech-stack:
  added: []
  patterns: ["Route-local sandbox shell isolated from dashboard layout"]

key-files:
  created: []
  modified:
    - src/app/cube-sandbox/page.tsx
    - src/app/cube-sandbox/components/SandboxShell.tsx
    - src/app/page.tsx

key-decisions:
  - "Use `/cube-sandbox` as direct cube-first entry with no intermediate landing step"
  - "Keep sandbox shell independent from `DashboardLayout` and `TopBar`"
  - "Mark home CTA copy as experimental/prototype to avoid production implication"

patterns-established:
  - "Cube experimentation routes should own their shell UI and avoid production chrome coupling"

# Metrics
duration: 7min
completed: 2026-03-05
---

# Phase 43 Plan 01: Cube Sandbox Route Scaffold Summary

**An isolated `/cube-sandbox` route now opens directly into cube visualization with a dedicated right-side experimentation rail and explicit home-page access.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-05T10:28:00Z
- **Completed:** 2026-03-05T10:35:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added route metadata and direct cube-first page composition for `/cube-sandbox`
- Implemented route-local `SandboxShell` with `CubeVisualization` and reserved context/debug rail slots
- Refined home entry CTA copy for sandbox experimentation while preserving timeline-test access

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold isolated `/cube-sandbox` route with cube-first shell** - `bee4a20` (feat)
2. **Task 2: Add explicit app entry access to the sandbox route** - `82df9bd` (feat)

## Files Created/Modified
- `src/app/cube-sandbox/page.tsx` - route entry and metadata for cube sandbox
- `src/app/cube-sandbox/components/SandboxShell.tsx` - isolated sandbox shell with cube viewport and utility rail placeholders
- `src/app/page.tsx` - explicit home CTA copy for cube sandbox experiment

## Decisions Made
- Used a direct route entry into cube experimentation to satisfy cube-first startup behavior.
- Kept all sandbox framing inside route-local components to avoid dashboard/timeline coupling.
- Updated wording to emphasize v2.0 experimentation/prototype status from the app entry page.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- `npm run dev` could not start a second instance due to existing `.next/dev/lock`; verification used the already-running project dev server and confirmed `/cube-sandbox` returned HTTP 200.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sandbox route foundation is in place for context rail behavior and reset instrumentation work.
- No blockers identified for 43-02.

---
*Phase: 43-3d-sandbox-route-foundation*
*Completed: 2026-03-05*
