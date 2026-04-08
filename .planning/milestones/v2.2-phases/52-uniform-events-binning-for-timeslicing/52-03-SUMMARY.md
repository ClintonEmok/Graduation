---
phase: 52-uniform-events-binning-for-timeslicing
plan: 3
subsystem: api
tags: [adaptive-binning, cache, api, query-layer, vitest]

# Dependency graph
requires:
  - phase: 52-uniform-events-binning-for-timeslicing
    provides: mode-aware worker/store contract and timeslicing uniform-events route intent
provides:
  - Global adaptive cache/query pipeline is binning-mode aware with collision-safe keys
  - Global adaptive API and MainScene hydration preserve density/count parity fields
  - Regression tests lock mode-sensitive cache behavior and default fallback safety
affects: [phase-transition, adaptive-global-scope, density-scope-parity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mode-inclusive cache key pattern for global adaptive precompute (`global:{binCount}:{kernelWidth}:{mode}`)
    - Backward-compatible API/query fallback pattern with default `uniform-time` behavior

key-files:
  created: []
  modified:
    - src/lib/queries/types.ts
    - src/lib/queries/aggregations.ts
    - src/lib/queries.ts
    - src/app/api/adaptive/global/route.ts
    - src/components/viz/MainScene.tsx
    - src/lib/queries.test.ts

key-decisions:
  - "Extended global adaptive cache keys with `binningMode` so uniform-time and uniform-events precomputes cannot collide."
  - "Kept omitted mode behavior backward-compatible by resolving API/query defaults to `uniform-time`."
  - "Hydrated `countMap` with global precomputed maps so global and viewport adaptive consumers share the same map field contract."

patterns-established:
  - "Global adaptive parity pattern: API returns `densityMap`, `countMap`, `burstinessMap`, and `warpMap` regardless of mode."

# Metrics
duration: 4 min
completed: 2026-03-11
---

# Phase 52 Plan 3: Global Adaptive Mode-Aware Cache Summary

**Delivered mode-aware global adaptive precompute/cache with parity-safe count+density map outputs, collision-safe keys, and regression coverage for default fallback behavior.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T17:24:11Z
- **Completed:** 2026-03-11T17:29:03Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended global adaptive query/cache contracts to include `binningMode`, persist `countMap`, and isolate cache entries per mode.
- Threaded `binningMode` through `/api/adaptive/global` and MainScene global hydration, including `countMap` in `setPrecomputedMaps`.
- Added regression tests to lock mode-aware cache-key behavior, stable output contract fields, and uniform-time fallback when mode is omitted.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend global adaptive query/cache contracts for binning mode and count parity** - `0dc9a6e` (feat)
2. **Task 2: Thread binning mode through global adaptive API and scene hydration** - `95cd525` (feat)
3. **Task 3: Add regression tests for mode-aware cache/query contract stability** - `4ca3560` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/lib/queries/types.ts` - Added shared global adaptive mode/count map contract fields.
- `src/lib/queries/aggregations.ts` - Added mode/count cache columns and adaptive timestamp query builder.
- `src/lib/queries.ts` - Added mode-aware cache keys, persistence/hydration of count maps, and uniform-events global binning path.
- `src/app/api/adaptive/global/route.ts` - Added optional `binningMode` parsing and `countMap` response parity.
- `src/components/viz/MainScene.tsx` - Requested mode-aware global maps and hydrated precomputed `countMap`.
- `src/lib/queries.test.ts` - Added regression assertions for mode-sensitive keys and fallback-safe map contract stability.

## Decisions Made

- Used `global:{binCount}:{kernelWidth}:{mode}` for cache identity to prevent cross-mode adaptive map reuse.
- Kept missing `binningMode` behavior backward-compatible by treating it as `uniform-time` in API/query layers.
- Preserved stable global map response shape by adding `countMap` without removing existing fields.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added cache-table column migration for existing deployments**
- **Found during:** Task 1 (global adaptive cache contract extension)
- **Issue:** Existing `adaptive_global_cache` tables may lack new `binning_mode`/`count_json` columns, which would break reads/writes after contract expansion.
- **Fix:** Added `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` safeguards during cache setup before reads.
- **Files modified:** `src/lib/queries/aggregations.ts`, `src/lib/queries.ts`
- **Verification:** `npm run typecheck` and `npm test -- --run src/lib/queries.test.ts` pass with mode-aware cache tests.
- **Committed in:** `0dc9a6e` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix was required for backward-compatible cache schema rollout; no scope creep beyond correctness.

## Authentication Gates

None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 52 is complete: global and viewport adaptive pathways now share mode-aware, parity-safe map contracts.
- No blockers identified for milestone transition.

---
*Phase: 52-uniform-events-binning-for-timeslicing*
*Completed: 2026-03-11*
