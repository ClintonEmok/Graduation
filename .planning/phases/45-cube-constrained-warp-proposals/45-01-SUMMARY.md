---
phase: 45-cube-constrained-warp-proposals
plan: 01
subsystem: state-management
tags: [zustand, vitest, cube-sandbox, warp-proposals, deterministic-ranking]

# Dependency graph
requires:
  - phase: 44-cube-spatial-context-setup
    provides: enabled cube spatial constraint records and reset-safe constraint state
provides:
  - Deterministic constraint-aware warp proposal generation with rationale metrics
  - Sandbox proposal store for generation metadata, selection, and applied tracking
  - Function-level regression tests for deterministic proposal ordering and empty states
affects: [45-02, 45-03, cube-sandbox-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure ranking engine separated from state orchestration
    - Deterministic score ordering with stable tie-breaks by constraint id
    - Store metadata tracing proposal generation inputs for diagnostics

key-files:
  created:
    - src/app/cube-sandbox/lib/warpProposalEngine.ts
    - src/store/useWarpProposalStore.ts
    - src/app/cube-sandbox/lib/warpProposalEngine.test.ts
  modified: []

key-decisions:
  - "Filter proposal generation to enabled constraints and return [] when none are active."
  - "Keep proposal IDs deterministic as proposal-{constraintId} to stabilize review and selection state."
  - "Track generation timestamp plus sorted source constraint IDs for traceability without coupling to UI routing."

patterns-established:
  - "Proposal Engine Pattern: score geometry-derived density and hotspot signals, then sort by score with deterministic ties."
  - "Sandbox Proposal Store Pattern: generate/clear/select/markApplied actions with route-local metadata."

# Metrics
duration: 3m
completed: 2026-03-05
---

# Phase 45 Plan 01: Cube-Constrained Warp Proposal Foundation Summary

**Deterministic cube-scoped warp proposal generation now produces ranked payloads with density and hotspot rationale, backed by a dedicated sandbox store for selection and apply-ready traceability.**

## Performance

- **Duration:** 3m
- **Started:** 2026-03-05T12:10:37Z
- **Completed:** 2026-03-05T12:13:45Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Implemented a pure proposal engine that accepts cube constraints and temporal context to return ranked, deterministic proposal outputs.
- Added proposal rationale composition with plain-language summary, density concentration, hotspot coverage, and confidence signals.
- Introduced route-safe sandbox proposal state for generation metadata, selection, and applied proposal markers.
- Added regression tests covering enabled-only proposal derivation, stable ordering, rationale field population, and empty active-constraint behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement pure cube-constrained warp proposal generator** - `5ca6b5b` (feat)
2. **Task 2: Add sandbox proposal state store** - `467f38d` (feat)
3. **Task 3: Add deterministic scoring and rationale tests** - `0a29ef2` (test)

## Files Created/Modified
- `src/app/cube-sandbox/lib/warpProposalEngine.ts` - Pure deterministic proposal scoring, rationale shaping, and ordering.
- `src/store/useWarpProposalStore.ts` - Zustand store for proposal generation, trace metadata, selection, and apply markers.
- `src/app/cube-sandbox/lib/warpProposalEngine.test.ts` - Function-level regression suite for determinism and rationale quality checks.

## Decisions Made
- Kept generation deterministic by combining stable input normalization (enabled-only + sorted ids) with explicit tie-break sorting.
- Chose proposal payload shape with `warpFactor` + temporal `range` so downstream apply flows can map directly to adaptive controls.
- Preserved store independence from navigation/global layout state to keep sandbox proposal workflows route-local.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CWARP proposal data foundation is complete and ready for proposal rail UI integration in 45-02.
- No blockers identified for wiring proposal selection/apply UX.

---
*Phase: 45-cube-constrained-warp-proposals*
*Completed: 2026-03-05*
