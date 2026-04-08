---
phase: 68-dashboard-v2-flow-consolidation
plan: 01
subsystem: ui
tags: [dashboard-v2, workflow, progressive-disclosure, stkde, vitest, zustand]

# Dependency graph
requires:
  - phase: 67-burst-taxonomy-and-metrics
    provides: deterministic burst labels and review metadata used by dashboard-v2 flow review/apply surfaces
provides:
  - guided dashboard-v2 workflow rail for generate -> review -> apply -> refine -> analyze
  - status-only dashboard header without route-hopping links
  - hidden-by-default advanced panels with STKDE gated to post-apply/refine workflow states
  - flow-contract regression tests for page and header behavior
affects: [69-advanced-manual-slice-editing, 70-validation-and-research-readiness, 71-full-range-generation-provenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - single-route workflow guidance in dashboard-v2
    - progressive disclosure for advanced analysis controls
    - string/state contract tests for UX workflow rules

key-files:
  created: []
  modified:
    - src/app/dashboard-v2/page.tsx
    - src/components/binning/BinningControls.tsx
    - src/components/dashboard/DashboardHeader.tsx
    - src/store/useLayoutStore.ts
    - src/app/dashboard-v2/page.flow-consolidation.test.tsx
    - src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx

key-decisions:
  - "Keep dashboard-v2 as the only investigation route and remove header route navigation entirely."
  - "Gate STKDE and advanced analysis to post-apply/refine workflow states while keeping defaults hidden."
  - "Lock phase 68 flow contracts with lightweight source-based regression tests."

patterns-established:
  - "Workflow rail first: dashboard-v2 exposes one primary step progression as the main guidance surface."
  - "Informational header only: workflow/sync/context badges are retained without actionable route links."

requirements-completed: [FLOW-CONS-01, FLOW-CONS-02, FLOW-CONS-03, FLOW-CONS-04]

# Metrics
duration: 2 min
completed: 2026-04-08
---

# Phase 68 Plan 01: Dashboard-v2 Flow Consolidation Summary

**Dashboard-v2 now guides users through a single generate→review→apply→refine→analyze flow with one dominant generation CTA, hidden-by-default advanced analysis, and regression tests that guard against route-hopping and control clutter.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-08T16:15:14Z
- **Completed:** 2026-04-08T16:17:19Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Rebuilt the dashboard-v2 shell around a top workflow rail and consolidated review/apply interaction into one surface.
- Removed header route navigation so the header is context-only and no longer competes with workflow guidance.
- Added/strengthened flow-contract tests to protect CTA wording, advanced-panel gating defaults, and header non-navigation constraints.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild dashboard-v2 around the single workflow rail** - `2f7abce` (feat)
2. **Task 2: Strip dashboard header navigation and keep it informational** - `ec891a5` (refactor)
3. **Task 3: Lock the phase 68 flow contract with regression tests** - `a12f861` (test)

## Files Created/Modified
- `src/app/dashboard-v2/page.tsx` - Unified workflow shell, rail, and STKDE progressive-disclosure gating.
- `src/components/binning/BinningControls.tsx` - Generate-step inputs and dominant `Generate Draft Slices` CTA.
- `src/store/useLayoutStore.ts` - Hidden-by-default advanced panel defaults.
- `src/components/dashboard/DashboardHeader.tsx` - Informational-only status header (no route links).
- `src/app/dashboard-v2/page.flow-consolidation.test.tsx` - Flow contract assertions for CTA, workflow steps, and STKDE gate behavior.
- `src/components/dashboard/DashboardHeader.flow-consolidation.test.tsx` - Header non-navigation and context-only contract assertions.

## Decisions Made
- Kept one primary guidance surface (workflow rail) and removed competing route affordances from header.
- Preserved existing review/apply behavior in `SuggestionToolbar` instead of introducing duplicate page-level controls.
- Used low-maintenance source-contract tests to keep flow constraints explicit and stable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial strengthened regex for canonical flow text was too strict for current source layout; replaced with explicit step-key assertions and re-ran tests successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 68 flow consolidation contract is in place and test-protected.
- Ready for downstream manual-editing and validation phases to build on the single-route dashboard-v2 workflow.

---
*Phase: 68-dashboard-v2-flow-consolidation*
*Completed: 2026-04-08*
