---
phase: 46-guardrails-and-baselines
plan: 01
subsystem: testing
tags: [baseline, benchmarking, refactor, guardrails, node]

# Dependency graph
requires:
  - phase: 45-3d-suggestion-and-acceptance-parity
    provides: 3D timeline parity baseline that refactor phases must preserve
provides:
  - Repeatable baseline capture command for refactor-critical file size and timing metrics
  - Persisted JSON baseline snapshot and capture playbook for future comparison
  - PR template gate requiring behavior parity, baseline checks, regression tests, and debug-log cleanup
affects: [47-dead-code-and-logs-cleanup, 48-api-and-hooks-surface-freeze, 49-query-layer-decomposition, 50-timeline-splitting, 51-store-and-orchestration-splitting]

# Tech tracking
tech-stack:
  added: []
  patterns: [Deterministic baseline benchmarks with median timing snapshots, refactor PR quality checklist gate]

key-files:
  created: [scripts/capture-refactor-baseline.mjs, .planning/baselines/46-guardrails-baseline.json, .planning/baselines/46-guardrails-baseline.md, .github/pull_request_template.md]
  modified: []

key-decisions:
  - "Used deterministic synthetic datasets for timing baselines so results remain comparable across runs and machines."
  - "Kept baseline capture dependency-free by implementing Node-native benchmark and snapshot tooling in a single script."

patterns-established:
  - "Baseline-as-code: metrics are generated through one committed command and persisted in versioned JSON artifacts."
  - "Refactor gatekeeping: every PR must explicitly confirm behavior parity, benchmark comparison, test updates, and log cleanup."

# Metrics
duration: 1h42m
completed: 2026-03-06
---

# Phase 46 Plan 01: Guardrails and Baseline Capture Summary

**Deterministic refactor baseline capture now records timeline file-size and hot-path timing metrics with a committed PR checklist gate for parity and regression discipline.**

## Performance

- **Duration:** 1h 42m
- **Started:** 2026-03-06T21:59:15Z
- **Completed:** 2026-03-06T23:40:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `scripts/capture-refactor-baseline.mjs` with deterministic benchmark capture plus `--write` snapshot mode.
- Persisted `.planning/baselines/46-guardrails-baseline.json` and documented repeatable recapture/comparison workflow in `.planning/baselines/46-guardrails-baseline.md`.
- Added `.github/pull_request_template.md` with a dedicated `Refactor Guardrails` checklist for phases 47-51.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add baseline capture command and persisted snapshot** - `539682c` (feat)
2. **Task 2: Add refactor guardrail checklist to PR template** - `ed20845` (docs)

## Files Created/Modified
- `scripts/capture-refactor-baseline.mjs` - Captures file-size and deterministic timing baselines; supports print and write modes.
- `.planning/baselines/46-guardrails-baseline.json` - Timestamped machine-readable baseline snapshot for comparisons.
- `.planning/baselines/46-guardrails-baseline.md` - Baseline scope, capture commands, and comparison process for follow-on phases.
- `.github/pull_request_template.md` - PR guardrail checklist used to enforce refactor quality gates.

## Decisions Made
- Used deterministic benchmark inputs and median-of-runs timing summaries to reduce incidental noise in refactor comparisons.
- Scoped benchmarked helpers to timeline interaction hot paths (selection lookup and time-domain conversions) to align with refactor risk.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Authentication Gates
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for follow-on refactor phases to use the baseline command and checklist gate in every PR.
- No blockers identified.

---
*Phase: 46-guardrails-and-baselines*
*Completed: 2026-03-06*
