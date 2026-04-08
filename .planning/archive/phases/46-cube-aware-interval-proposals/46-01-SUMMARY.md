---
phase: 46-cube-aware-interval-proposals
plan: 01
subsystem: state-management
tags: [zustand, vitest, cube-sandbox, interval-proposals, deterministic-ranking]

# Dependency graph
requires:
  - phase: 45-cube-constrained-warp-proposals
    provides: deterministic proposal patterns and apply-feedback architecture in cube sandbox
provides:
  - Deterministic cube-aware interval proposal engine driven by enabled constraints and burst windows
  - Interval proposal store with generation metadata plus stable selection lifecycle
  - Regression coverage for determinism, overlap suppression, and confidence/quality payload shape
affects: [46-02, 46-03, interval-review-ui, proposal-apply]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure interval scoring engine separated from store orchestration
    - Deterministic ordering with overlap suppression and stable tie-breakers
    - Proposal metadata tracking with generated timestamp and sorted source constraint ids

key-files:
  created:
    - src/app/cube-sandbox/lib/intervalProposalEngine.ts
    - src/store/useIntervalProposalStore.ts
    - src/app/cube-sandbox/lib/intervalProposalEngine.test.ts
  modified: []

key-decisions:
  - "Model interval proposals as constraint-linked records with explicit confidence and quality blocks for downstream review UI."
  - "Suppress heavily overlapping intervals within each constraint during ranking to reduce redundant candidates while preserving deterministic output."
  - "Mirror prior warp store pattern for route-local generation, stable selection retention, and trace metadata consistency."

patterns-established:
  - "Interval Engine Pattern: combine burst peak and cube geometry metrics into deterministic interval ranking with overlap filtering."
  - "Interval Store Pattern: generate/select/clear actions with stable selected id retention across regenerations."

# Metrics
duration: 8m
completed: 2026-03-05
---

# Phase 46 Plan 01: Cube-Aware Interval Proposal Foundation Summary

**Cube-aware interval proposal generation now deterministically ranks burst-derived candidate ranges per enabled spatial constraint and emits apply-ready confidence and quality metadata.**

## Performance

- **Duration:** 8m
- **Started:** 2026-03-05T13:31:45Z
- **Completed:** 2026-03-05T13:39:47Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Implemented a pure interval proposal engine that combines burst windows and enabled cube constraints into deterministic, context-linked ranked proposals.
- Added rationale, confidence, and quality payload blocks so each proposal carries review-ready metadata.
- Added overlap suppression to reduce redundant interval suggestions while preserving deterministic tie-break behavior.
- Added a dedicated interval proposal store for route-local generation metadata, selection persistence, and clear/select flows.
- Added deterministic regression tests covering enabled-only handling, overlap suppression, payload shape, and empty-input behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement deterministic cube-aware interval proposal engine** - `8881396` (feat)
2. **Task 2: Add interval proposal store orchestration for generate/select/clear** - `3338125` (feat)
3. **Task 3: Add regression tests for determinism and confidence payload shape** - `6930f04` (test)

## Files Created/Modified
- `src/app/cube-sandbox/lib/intervalProposalEngine.ts` - Pure deterministic interval proposal ranking and overlap suppression with confidence/quality metadata.
- `src/store/useIntervalProposalStore.ts` - Zustand interval proposal orchestration with generation metadata and stable selection behavior.
- `src/app/cube-sandbox/lib/intervalProposalEngine.test.ts` - Vitest regression suite for determinism, overlap suppression, and required payload fields.

## Decisions Made
- Kept proposal identity deterministic with `interval-{constraintId}-{burstId}` IDs so selection state can remain stable across regenerations.
- Packaged confidence in both `rationale` and top-level `confidence` to support downstream UI without recomputation.
- Applied overlap suppression per constraint (not globally) to preserve spatial grouping while avoiding duplicate interval recommendations.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CINTV data-layer foundation is ready for interval review and apply UI wiring in subsequent Phase 46 plans.
- No blockers identified for integrating interval proposal presentation into `/cube-sandbox` diagnostics rail.

---
*Phase: 46-cube-aware-interval-proposals*
*Completed: 2026-03-05*
