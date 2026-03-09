---
phase: 48-api-stabilization
plan: 01
subsystem: api
tags: [coordinates, normalization, duckdb, vitest]

# Dependency graph
requires:
  - phase: 47-01
    provides: dead code cleanup guardrails before API stabilization
provides:
  - Shared Chicago coordinate normalization adapter for crime APIs
  - Stream endpoint parity with range endpoint coordinate scaling
  - Regression coverage for normalized mock stream coordinates
affects: [48-02, api-consumers, timeline-data-plumbing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared coordinate transforms in `src/lib` reused by API routes and tests

key-files:
  created:
    - src/lib/coordinate-normalization.ts
  modified:
    - src/app/api/crime/stream/route.ts
    - src/lib/crime-api.test.ts

key-decisions:
  - "Centralize Chicago bounds and lon/lat <-> x/z math in a shared adapter instead of duplicating formulas per endpoint."
  - "Normalize streamed CSV rows after parsing so mock and database-backed responses share the same adapter path."

patterns-established:
  - "API coordinate parity: shared normalization helpers define the canonical -50..50 Chicago transform."
  - "Regression tests should assert normalized coordinate contracts instead of endpoint-local formulas."

# Metrics
duration: 1 min
completed: 2026-03-09
---

# Phase 48 Plan 01: Coordinate Normalization Summary

**Shared Chicago coordinate normalization for crime stream data, with stream/range parity locked by regression tests.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T00:25:27Z
- **Completed:** 2026-03-09T00:26:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `src/lib/coordinate-normalization.ts` with canonical Chicago bounds plus forward and inverse transforms.
- Updated `src/app/api/crime/stream/route.ts` so both mock rows and streamed CSV rows use the shared normalization helper.
- Updated `src/lib/crime-api.test.ts` to verify the new -50..50 normalization contract instead of the legacy stream formula.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coordinate normalization adapter** - `f59b279` (feat)
2. **Task 2: Update stream route to use adapter** - `64835bb` (fix)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/lib/coordinate-normalization.ts` - Shared Chicago bounds and coordinate conversion helpers.
- `src/app/api/crime/stream/route.ts` - Stream endpoint now derives `x`/`z` through the shared adapter for mock and CSV-backed data.
- `src/lib/crime-api.test.ts` - Regression coverage updated to assert the normalized coordinate contract.

## Decisions Made
- Centralized coordinate normalization in `src/lib/coordinate-normalization.ts` so stream and range endpoints share one canonical formula.
- Applied normalization in JavaScript after CSV parsing so the stream route uses the same helper path for both database and mock responses.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale stream-coordinate regression expectations**
- **Found during:** Task 2 (Update stream route to use adapter)
- **Issue:** `src/lib/crime-api.test.ts` still encoded the legacy `/api/crime/stream` normalization formula, so regression coverage no longer matched the stabilized API contract.
- **Fix:** Switched mock test data and coordinate assertions to use `lonLatToNormalized` and the shared Chicago bounds scale.
- **Files modified:** `src/lib/crime-api.test.ts`
- **Verification:** `npm test -- --run src/lib/crime-api.test.ts src/app/api/crimes/range/route.test.ts`
- **Committed in:** `64835bb` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The test update was required to keep regression coverage aligned with the new shared normalization contract. No scope creep.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `48-02-PLAN.md` to remove double-buffering drift on the client/API boundary.
- Coordinate normalization is now centralized for stream consumers, reducing one source of endpoint drift before buffering changes.

---
*Phase: 48-api-stabilization*
*Completed: 2026-03-09*
