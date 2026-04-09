---
phase: 50-query-layer-decomposition
plan: 01
subsystem: api
tags: [duckdb, sql, query-builders, sanitization, typescript]

# Dependency graph
requires:
  - phase: 49-dualtimeline-decomposition
    provides: stable timeline/query consumers ready for internal query-layer refactor boundaries
provides:
  - Query-layer module decomposition under src/lib/queries/*
  - Compatibility facade preserving src/lib/queries.ts exports
  - Dedicated sanitization boundary for non-bindable SQL structure values
affects: [50-02-hot-path-parameterization, 50-03-aggregation-hardening, 51-store-consolidation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Query responsibilities split by module (types, filters, aggregations, builders, sanitization)
    - Public API remains stable via facade delegation while internals evolve

key-files:
  created:
    - src/lib/queries/types.ts
    - src/lib/queries/sanitization.ts
    - src/lib/queries/filters.ts
    - src/lib/queries/aggregations.ts
    - src/lib/queries/builders.ts
    - src/lib/queries/index.ts
  modified:
    - src/lib/queries.ts

key-decisions:
  - "Keep src/lib/queries.ts import-compatible and delegate internals to src/lib/queries/* modules."
  - "Use a single sanitization boundary (allow-list + clamp helpers) for non-bindable SQL structure values."
  - "Extract filter/aggregation/builder scaffolds first, preserving runtime behavior before hot-path parameterization in follow-up plans."

patterns-established:
  - "Compatibility facade pattern: preserve route imports while moving logic into internal modules."
  - "Query fragments as shared contracts (sql + params) even when parity paths still use literal interpolation."

# Metrics
duration: 6 min
completed: 2026-03-09
---

# Phase 50 Plan 01: Query Layer Decomposition Foundation Summary

**Split monolithic query internals into dedicated query modules while preserving the existing `src/lib/queries.ts` API surface for routes and tests.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T20:13:35Z
- **Completed:** 2026-03-09T20:20:17Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added shared query-layer contracts and central sanitization helpers under `src/lib/queries/`.
- Extracted dedicated filter, aggregation, and builder modules to own SQL composition scaffolding.
- Converted `src/lib/queries.ts` into a compatibility facade that delegates internal construction to the new module boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared query fragment and sanitization boundary modules** - `8f81438` (feat)
2. **Task 2: Extract filter and aggregation scaffolds into dedicated modules** - `aa6f9cc` (feat)
3. **Task 3: Convert src/lib/queries.ts into a compatibility facade** - `d31fb6e` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/lib/queries/types.ts` - Shared `QueryFragment` and query-facing type contracts.
- `src/lib/queries/sanitization.ts` - Table allow-list and positive integer clamp helpers.
- `src/lib/queries/filters.ts` - Composable range predicate and IN-list builders.
- `src/lib/queries/aggregations.ts` - Adaptive map numeric helpers and aggregation SQL builders.
- `src/lib/queries/builders.ts` - Orchestration builders for range/count/density SQL assembly.
- `src/lib/queries/index.ts` - Internal module re-export surface.
- `src/lib/queries.ts` - Public compatibility facade delegating internals to modular query files.

## Decisions Made
- Preserved public query exports and type exports in `src/lib/queries.ts` to avoid route import churn.
- Routed structural SQL concerns (table names and numeric bounds) through centralized sanitization helpers.
- Deferred behavioral parameterization changes to follow-up plans to keep this decomposition step parity-safe.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Query concerns are now split behind stable module boundaries, ready for 50-02 hot-path parameterization work.
- Facade compatibility keeps downstream API routes stable while further internal query hardening proceeds.

---
*Phase: 50-query-layer-decomposition*
*Completed: 2026-03-09*
