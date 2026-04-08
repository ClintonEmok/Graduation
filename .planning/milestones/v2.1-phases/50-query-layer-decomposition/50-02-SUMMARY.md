---
phase: 50-query-layer-decomposition
plan: 02
subsystem: api
tags: [duckdb, sql-parameterization, query-builders, vitest, regression]

# Dependency graph
requires:
  - phase: 50-query-layer-decomposition
    provides: modular query-layer boundaries and compatibility facade from 50-01
provides:
  - Parameterized hot-path builders for range and count queries
  - Facade execution path that runs builder SQL with ordered parameter arrays
  - Regression coverage for placeholder ordering and range metadata parity
affects: [50-03-aggregation-hardening, 51-store-consolidation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hot-path query builders return `{ sql, params }` and keep placeholder order deterministic
    - Compatibility facade executes builder output via one parameterized execution helper

key-files:
  created: []
  modified:
    - src/lib/queries/filters.ts
    - src/lib/queries/builders.ts
    - src/lib/queries.ts
    - src/lib/queries.test.ts
    - src/app/api/crimes/range/route.test.ts

key-decisions:
  - "Bind start/end epochs, IN-list filters, and hot-path stride/limit controls as query params instead of interpolating user input."
  - "Keep structural SQL values (table names and query layout) behind existing sanitization helpers while parameterizing runtime values."
  - "Guard API compatibility at the route boundary by testing sampled/buffer metadata contracts directly."

patterns-established:
  - "Hot-path parameterization pattern: compose WHERE fragments with placeholders and append params atomically."
  - "Parity-first regression pattern: validate route metadata behavior rather than internal implementation details."

# Metrics
duration: 4 min
completed: 2026-03-09
---

# Phase 50 Plan 02: Hot-Path Parameterization Summary

**Parameterized the highest-traffic range/count query paths with ordered SQL bindings and preserved `/api/crimes/range` metadata contracts via regression tests.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T20:22:57Z
- **Completed:** 2026-03-09T20:27:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Replaced hot-path range and IN-list filter interpolation with placeholder-based fragment composition.
- Updated `queryCrimesInRange` and `queryCrimeCount` to execute builder-generated `{ sql, params }` outputs with bound parameters.
- Added regression tests to catch placeholder-order drift and ensure sampled/buffer metadata parity in range route responses.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement parameterized hot-path query builders with ordered fragments** - `daac317` (feat)
2. **Task 2: Rewire hot-path exports to execute parameterized SQL without API signature changes** - `dc7b6be` (feat)
3. **Task 3: Add regression coverage for placeholder ordering and range metadata parity** - `02f84e5` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/lib/queries/filters.ts` - Converted range and IN-list predicates to placeholder fragments with ordered params.
- `src/lib/queries/builders.ts` - Added `buildCrimesInRangeQuery` and bound limit/stride controls through params.
- `src/lib/queries.ts` - Wired hot-path public functions to execute builder SQL with parameter arrays.
- `src/lib/queries.test.ts` - Added builder/runner regression assertions for placeholder usage and param ordering.
- `src/app/api/crimes/range/route.test.ts` - Added sampled-response metadata contract coverage for buffer/sample fields.

## Decisions Made
- Standardized hot-path builders on a deterministic `{ sql, params }` contract so optional filter combinations cannot drift placeholder order.
- Preserved route-facing signatures and response shaping while changing only internal SQL execution mechanics.
- Extended tests at both query-builder and route-contract layers to protect behavior and metadata parity simultaneously.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated SQL-backed query test double to accept variadic bound params**
- **Found during:** Task 2 (hot-path facade execution rewire)
- **Issue:** Existing test mock expected `db.all(query, callback)` and crashed once parameter arrays were passed to `db.all`.
- **Fix:** Updated the mock to capture variadic args and resolve using the final callback argument.
- **Files modified:** `src/lib/queries.test.ts`
- **Verification:** `npm test -- --run src/lib/queries.test.ts src/app/api/crimes/range/route.test.ts`
- **Committed in:** `02f84e5` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking fix was required to validate the new parameterized execution path; no scope creep.

## Issues Encountered

- SQL-backed unit test mocks initially assumed callback-only `db.all` shape; updated test harness to match parameterized call semantics.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Hot-path range/count paths now use bound parameters with regression guards for param order and route metadata parity.
- Remaining query decomposition work can focus on aggregation/cache hardening in 50-03 with lower hot-path risk.

---
*Phase: 50-query-layer-decomposition*
*Completed: 2026-03-09*
