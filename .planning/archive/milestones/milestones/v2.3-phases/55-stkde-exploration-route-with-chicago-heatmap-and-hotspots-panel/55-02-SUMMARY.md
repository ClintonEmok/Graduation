---
phase: 55-stkde-exploration-route-with-chicago-heatmap-and-hotspots-panel
plan: 02
subsystem: api
tags: [stkde, duckdb, nextjs-api, provenance, guardrails, vitest]

# Dependency graph
requires:
  - phase: 55-stkde-exploration-route-with-chicago-heatmap-and-hotspots-panel
    provides: isolated `/stkde` route shell, baseline STKDE API contract, and rollback flag
provides:
  - mode-aware STKDE contracts with requested/effective compute provenance
  - chunked SQL full-population aggregation pipeline for STKDE compute inputs
  - guardrailed `/api/stkde/hotspots` mode dispatch with deterministic sampled fallback
  - `/stkde` compute mode controls and provenance display for QA trust
affects: [56-variable-sampling-selection-fidelity, stkde-qa-validation, route-guardrail-operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SQL/chunked aggregation feeding deterministic STKDE projection
    - explicit requested/effective mode provenance surfaced API-to-UI
    - deterministic full-population fallback ordering under safety guardrails

key-files:
  created:
    - src/lib/stkde/full-population-pipeline.ts
    - src/lib/stkde/full-population-pipeline.test.ts
  modified:
    - src/lib/stkde/contracts.ts
    - src/lib/stkde/compute.ts
    - src/lib/stkde/compute.test.ts
    - src/app/api/stkde/hotspots/route.ts
    - src/app/api/stkde/hotspots/route.test.ts
    - src/app/stkde/lib/stkde-query-state.ts
    - src/app/stkde/lib/StkdeRouteShell.tsx
    - src/app/stkde/lib/stkde-view-model.ts
    - src/app/stkde/page.stkde.test.ts

key-decisions:
  - "Kept sampled mode backward-compatible default while gating full-population execution by `/stkde` caller intent and QA flag."
  - "Implemented full-population input derivation as DuckDB SQL aggregation with chunked reads instead of row-level JS materialization."
  - "Made provenance first-class by always returning requested/effective mode, clamp notes, fallback reasons, and optional full-pop stats."

patterns-established:
  - "Mode-aware STKDE contract: request intent and response provenance are explicit and test-pinned."
  - "Fallback determinism: full-pop guard, span cap, timeout/error, then sampled compute path."

# Metrics
duration: 11m 7s
completed: 2026-03-16
---

# Phase 55 Plan 02: Full-population STKDE Mode Summary

**Delivered QA-selectable sampled vs full-population STKDE compute on `/stkde` using chunked SQL aggregation with deterministic fallback provenance from API through UI.**

## Performance

- **Duration:** 11m 7s
- **Started:** 2026-03-16T11:10:59Z
- **Completed:** 2026-03-16T11:22:06Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Extended STKDE contracts and compute internals to support mode-aware responses (`requestedComputeMode`, `effectiveComputeMode`, `clampsApplied`, `fullPopulationStats`) while preserving existing sampled consumers.
- Added `buildFullPopulationStkdeInputs` to aggregate STKDE-ready cell/time buckets in DuckDB with paged reads, avoiding full raw row materialization in server JS memory.
- Wired `/api/stkde/hotspots` and `/stkde` UI to support full-population requests with guardrails (QA gate, span cap, timeout/error fallback) and explicit provenance rendering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mode-aware STKDE contracts and SQL/chunked full-population pipeline** - `c55963e` (feat)
2. **Task 2: Wire `/api/stkde/hotspots` mode dispatch with guardrails, timeout, and fallback provenance** - `ca4ccf5` (feat)
3. **Task 3: Update `/stkde` UI to request full-pop mode and display provenance** - `4d93bfd` (feat)

## Files Created/Modified
- `src/lib/stkde/contracts.ts` - compute mode request fields, guardrail fields, and mode/provenance response metadata.
- `src/lib/stkde/full-population-pipeline.ts` - DuckDB aggregate builder for full-population STKDE inputs via chunked SQL paging.
- `src/lib/stkde/compute.ts` - shared projection logic supporting raw-crime sampled inputs and aggregate full-population inputs.
- `src/app/api/stkde/hotspots/route.ts` - mode dispatch, guardrails, timeout wrapper, deterministic sampled fallback and provenance propagation.
- `src/app/stkde/lib/StkdeRouteShell.tsx` - compute mode control, API payload mode intent, and provenance badges in route summary.

## Decisions Made
- Kept full-population compute QA-scoped by requiring `callerIntent: 'stkde'` and a dedicated environment gate, while preserving sampled default behavior for omitted `computeMode`.
- Chose server-side aggregated inputs for full-pop mode so hotspot projection remains deterministic without loading all eligible source rows into JS arrays.
- Standardized provenance shape across route and UI so QA can always inspect requested mode, effective mode, and fallback/clamp reasons.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored true chunk-size behavior in full-pop pipeline tests and runtime**
- **Found during:** Task 1 (full-population pipeline verification)
- **Issue:** `chunkSize` had a hard minimum of 100, preventing small configured chunk windows and masking chunk pagination behavior in deterministic tests.
- **Fix:** Lowered configurable minimum to `1` so chunking semantics are honored for test-scale validation and QA tuning.
- **Files modified:** `src/lib/stkde/full-population-pipeline.ts`, `src/lib/stkde/full-population-pipeline.test.ts`
- **Verification:** `npm test -- --run src/lib/stkde/full-population-pipeline.test.ts src/lib/stkde/compute.test.ts`
- **Committed in:** `c55963e` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was required to verify and preserve chunked full-population behavior; no scope creep.

## Issues Encountered
- Initial pipeline test fixture used out-of-grid indices, causing eventCount mismatch; fixture was corrected to valid grid coordinates and re-verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/stkde` now exposes trustworthy sampled/full-pop provenance and is ready for fidelity comparison work in phase 56.
- Full-population path remains rollback-safe through sampled fallback and existing `stkdeRoute` kill switch.

---
*Phase: 55-stkde-exploration-route-with-chicago-heatmap-and-hotspots-panel*
*Completed: 2026-03-16*
