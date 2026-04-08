---
phase: 49-dualtimeline-decomposition
plan: 03
subsystem: ui
tags: [timeline, react, d3, hooks, vitest]

# Dependency graph
requires:
  - phase: 49-02
    provides: brush/zoom synchronization extraction and interaction-guard invariants
provides:
  - usePointSelection hook for pointer scrub/hover/select behavior
  - deterministic parity tests for selection threshold and nearest-point contracts
  - DualTimeline orchestration-focused composition of extracted hooks
affects: [50-store-query-decomposition, 51-final-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns: [DualTimeline orchestration via focused timeline hooks, deterministic helper tests for interaction contracts]

key-files:
  created:
    - src/components/timeline/hooks/usePointSelection.ts
    - src/components/timeline/hooks/usePointSelection.test.ts
    - src/components/timeline/hooks/useBrushZoomSync.test.ts
  modified:
    - src/components/timeline/DualTimeline.tsx

key-decisions:
  - "Keep selection threshold semantics exactly max(rangeSpan * 0.01, 60) inside dedicated hook helpers."
  - "Replace jsdom-only brush/zoom test path with node-safe deterministic coverage to keep targeted regression suite executable."

patterns-established:
  - "Timeline interaction extraction: hook owns pointer domain logic, component owns orchestration and rendering"
  - "Selection parity tests target exported pure helpers for deterministic nearest-point threshold behavior"

# Metrics
duration: 6 min
completed: 2026-03-09
---

# Phase 49 Plan 03: Point selection decomposition Summary

**DualTimeline now composes dedicated pointer-selection logic via `usePointSelection` while preserving nearest-point threshold parity and deterministic regression coverage.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-09T16:37:00Z
- **Completed:** 2026-03-09T16:42:34Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extracted timeline pointer scrubbing, hover, and select/clear flow into `usePointSelection` with parity-safe helpers.
- Added deterministic regression tests for threshold rule and safe handling of empty/invalid selection inputs.
- Finalized `DualTimeline.tsx` as orchestration-focused composition over `useScaleTransforms`, `useDensityStripDerivation`, `useBrushZoomSync`, and `usePointSelection`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract pointer hover/select logic into usePointSelection** - `7b0377b` (feat)
2. **Task 2: Add deterministic regression coverage for point-selection parity** - `73a8f8e` (test)
3. **Task 3: Finalize DualTimeline as hook-composition orchestrator** - `d002c63` (feat)

## Files Created/Modified
- `src/components/timeline/hooks/usePointSelection.ts` - Pointer interaction hook with threshold and nearest-point parity helpers.
- `src/components/timeline/hooks/usePointSelection.test.ts` - Deterministic tests for threshold semantics and edge cases.
- `src/components/timeline/DualTimeline.tsx` - Removed duplicated pointer logic and wired `usePointSelection` composition.
- `src/components/timeline/hooks/useBrushZoomSync.test.ts` - Node-safe deterministic guard coverage used by targeted regression suite.
- `src/components/timeline/hooks/useBrushZoomSync.test.tsx` - Removed failing jsdom worker-dependent test path.

## Decisions Made
- Kept `usePointSelection` behavior aligned with existing selection contracts by reusing `findNearestIndexByTime` and preserving source label `'timeline'`.
- Exported selection-threshold and pointer-resolution helpers from the hook module to make parity checks deterministic and stable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed targeted regression run blocked by jsdom worker ESM failure**
- **Found during:** Task 3 (Finalize DualTimeline as hook-composition orchestrator)
- **Issue:** `useBrushZoomSync.test.tsx` failed to start in Vitest worker (`ERR_REQUIRE_ESM` via `html-encoding-sniffer`), blocking required verification command.
- **Fix:** Replaced the jsdom-only `.test.tsx` file with deterministic node-safe `useBrushZoomSync.test.ts` coverage for `withSyncGuard` behavior.
- **Files modified:** `src/components/timeline/hooks/useBrushZoomSync.test.ts`, `src/components/timeline/hooks/useBrushZoomSync.test.tsx`
- **Verification:** `npm test -- --run src/components/timeline/hooks/useScaleTransforms.test.ts src/components/timeline/hooks/useDensityStripDerivation.test.ts src/components/timeline/hooks/useBrushZoomSync.test.ts src/components/timeline/hooks/usePointSelection.test.ts src/components/timeline/lib/interaction-guards.test.ts`
- **Committed in:** `d002c63`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking fix was required to execute the plan's mandated targeted verification suite; behavior scope stayed within Phase 49 contracts.

## Issues Encountered
- Vitest worker startup failed for the jsdom test file due an ESM/CJS dependency mismatch; resolved by switching that path to deterministic node-safe coverage.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 49 decomposition is complete; DualTimeline now composes all required hook modules and preserves interaction parity under deterministic tests.
- Ready to proceed to phase-level transition and follow-on cleanup/decomposition work.

---
*Phase: 49-dualtimeline-decomposition*
*Completed: 2026-03-09*
