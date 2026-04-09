---
phase: 04-demo-stats-stkde
plan: 01
subsystem: ui
tags: [dashboard-demo, stats, stkde, nextjs, react, zustand, vitest]

# Dependency graph
requires:
  - phase: 03-demo-timeline-rewrite
    provides: demo shell, timeline wrapper, fixed right rail, and route-isolation baseline
  - phase: 02-dashboard-demo-ui-ux
    provides: map-first demo shell composition and nested workflow scaffold
provides:
  - demo-local analysis store for district/time/STKDE state
  - compact stats summary panel driven by demo-local crime aggregation
  - primary STKDE rail with hotspot selection and parameter wiring
  - regression coverage that protects stable /stats and /stkde route isolation
affects: [phase-05-workflow-isolation, dashboard-demo route, future workflow handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - demo-local analysis store shared across rail tabs
    - compact summary stats panel alongside a primary STKDE rail
    - hotspot selection mirrored into demo-local spatial and temporal filters
    - source-inspection route regression tests to protect stable route shells

key-files:
  created:
    - src/store/useDashboardDemoAnalysisStore.ts
    - src/components/dashboard-demo/lib/useDemoNeighborhoodStats.ts
    - src/components/dashboard-demo/lib/useDemoStkde.ts
    - src/components/dashboard-demo/DemoStatsPanel.tsx
    - src/components/dashboard-demo/DemoStkdePanel.tsx
  modified:
    - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
    - src/app/dashboard-demo/page.shell.test.tsx

key-decisions:
  - "Keep stats compact and summary-oriented inside the demo shell while STKDE remains the primary analysis rail."
  - "Use demo-local analysis state to drive both surfaces and keep the stable /stats and /stkde routes as untouched references."
  - "Mirror hotspot selection into demo-local spatial and temporal filters so analysis interactions stay within the demo boundary."

patterns-established:
  - "Pattern 1: one demo-local analysis store can coordinate stats, STKDE, and rail selection without touching stable route stores."
  - "Pattern 2: source-inspection regression tests can protect route isolation without cloning the full standalone routes."

requirements-completed: [DEMO-07, DEMO-08, DEMO-09, DEMO-10, DEMO-11]

# Metrics
duration: 1 min
completed: 2026-04-09
---

# Phase 4: Demo Stats + STKDE Wiring Summary

**Demo-local stats summary and primary STKDE rail wired into /dashboard-demo with isolated analysis state and route-protection tests**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-09T14:55:43Z
- **Completed:** 2026-04-09T14:56:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added a demo-only analysis store to coordinate district filters, time range, and STKDE controls.
- Wired a compact stats summary panel and a prominent STKDE rail into the demo shell.
- Expanded source-inspection coverage so the demo route stays isolated from the standalone `/stats` and `/stkde` routes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create demo-local analysis state and data hooks** - `3fd98a1` (feat)
2. **Task 2: Add demo analysis panels and wire the rail tabs** - `21515c9` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `src/store/useDashboardDemoAnalysisStore.ts` - Demo-local analysis state for stats and STKDE.
- `src/components/dashboard-demo/lib/useDemoNeighborhoodStats.ts` - Demo-local crime aggregation and stats summary hook.
- `src/components/dashboard-demo/lib/useDemoStkde.ts` - Demo-local STKDE query and hotspot view-model hook.
- `src/components/dashboard-demo/DemoStatsPanel.tsx` - Compact stats summary and district/time controls.
- `src/components/dashboard-demo/DemoStkdePanel.tsx` - Prominent STKDE rail with hotspot selection and params.
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` - Added stats tab beside STKDE and slices.
- `src/app/dashboard-demo/page.shell.test.tsx` - Extended route-isolation regression coverage.

## Decisions Made
- The demo should surface stats as a compact summary, not a cloned standalone stats page.
- STKDE should remain the primary analysis rail so hotspot exploration stays front and center.
- Demo-local selection/time interactions belong in one isolated store, not in the standalone route stores.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 is complete and the demo analysis rail now behaves as one isolated workspace.
- Phase 5 can build workflow isolation on top of the stabilized demo analysis surfaces.
- Stable `/stats` and `/stkde` routes remain intact as reference foundations.

---
*Phase: 04-demo-stats-stkde*
*Completed: 2026-04-09*
