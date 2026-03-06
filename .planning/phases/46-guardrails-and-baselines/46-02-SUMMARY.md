---
phase: 46-guardrails-and-baselines
plan: 02
subsystem: testing
tags: [regression-tests, react-query, api-contracts, buffering, timeline]

# Dependency graph
requires:
  - phase: 46-guardrails-and-baselines
    provides: Baseline capture and guardrail PR checklist for refactor safety
provides:
  - Hook-level regression tests locking useCrimeData buffering and error contract behavior
  - API contract tests locking /api/crimes/range validation, buffer metadata, and coordinate parity
  - Deterministic helper exports for filter parsing and buffered range calculations
affects: [47-dead-code-and-logs-cleanup, 48-api-and-hooks-surface-freeze, 49-query-layer-decomposition]

# Tech tracking
tech-stack:
  added: []
  patterns: [Hook + endpoint contract pinning before refactor, deterministic helper extraction for API tests]

key-files:
  created: [src/hooks/useCrimeData.test.ts, src/app/api/crimes/range/route.test.ts]
  modified: [src/app/api/crimes/range/route.ts, vitest.config.mts]

key-decisions:
  - "Validated useCrimeData through QueryClientProvider-backed hook rendering so tests exercise real React Query behavior."
  - "Extracted parseCsvFilterParam and buildBufferedRange from route handler to keep contract checks deterministic without runtime behavior changes."

patterns-established:
  - "Buffer contract pinning: hook and endpoint tests now fail on accidental double-buffering or metadata drift."
  - "Endpoint contract coverage includes invalid-input guards plus coordinate normalization invariants."

# Metrics
duration: 6m20s
completed: 2026-03-06
---

# Phase 46 Plan 02: Hook/API Regression Contract Summary

**useCrimeData buffering and /api/crimes/range metadata/coordinate contracts are now pinned by deterministic regression tests ahead of API/query decomposition.**

## Performance

- **Duration:** 6m 20s
- **Started:** 2026-03-06T23:42:56Z
- **Completed:** 2026-03-06T23:49:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `src/hooks/useCrimeData.test.ts` with coverage for default/custom buffering, query-key stability, and error propagation.
- Added `src/app/api/crimes/range/route.test.ts` covering required-param validation, filter parsing, buffer meta semantics, sampled flags, and coordinate parity in mock responses.
- Updated `src/app/api/crimes/range/route.ts` with pure helper extraction (`parseCsvFilterParam`, `buildBufferedRange`) to enable deterministic assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add useCrimeData buffering regression tests** - `223d1a1` (test)
2. **Task 2: Add /api/crimes/range contract tests for buffer and coordinate parity** - `f271d0e` (test)

## Files Created/Modified
- `src/hooks/useCrimeData.test.ts` - Provider-backed hook tests with fetch mocking and bufferedRange/meta assertions.
- `src/app/api/crimes/range/route.test.ts` - GET contract tests for success/error paths and coordinate normalization parity.
- `src/app/api/crimes/range/route.ts` - Extracted parsing/buffer helpers and reused them in route logic.
- `vitest.config.mts` - ESM-safe Vitest configuration file used by `npx vitest run`.

## Decisions Made
- Kept production route behavior intact while exposing pure parsing/buffering helpers for deterministic testing.
- Anchored hook tests in QueryClientProvider render flow to capture real query lifecycle behavior instead of isolated stubs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Vitest startup failure from CJS/ESM config loading mismatch**
- **Found during:** Task 1 verification
- **Issue:** `npx vitest run` failed before tests executed due to `ERR_REQUIRE_ESM` while loading `vitest.config.ts`.
- **Fix:** Migrated config file to `vitest.config.mts` so Vitest loads config via ESM path.
- **Files modified:** `vitest.config.mts`
- **Verification:** `npx vitest run src/hooks/useCrimeData.test.ts src/app/api/crimes/range/route.test.ts` passed.
- **Committed in:** `223d1a1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to execute planned regression test verification; no scope creep.

## Issues Encountered
- React 19 test renderer warns about deprecation in test output, but tests execute and assertions are stable.

## Authentication Gates
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Timeline interaction guard extraction (46-03) can proceed with hook/API contracts now pinned.
- No blockers identified.

---
*Phase: 46-guardrails-and-baselines*
*Completed: 2026-03-06*
