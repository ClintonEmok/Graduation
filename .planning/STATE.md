# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-04)

**Core value:** Users compare uniform vs adaptive time mapping to reveal hidden spatiotemporal patterns.
**Current focus:** v2.1 refactoring and decomposition planning based on `.planning/REFACTORING-PLAN.md`.

## Current Position

Phase: **48 of 51** (API Layer Stabilization)
Plan: **3 of 3** in current phase
Status: **Phase complete**
Last activity: 2026-03-09 - Completed 48-03-PLAN.md - unified range and query normalization ownership

Progress: **███████████████████░** 171/173 plans complete (98.8%)

## Milestone Status

- v1.0: Complete (2026-02-07)
- v1.1: Complete (2026-02-22)
- v1.2: Complete (2026-03-02)
- v1.3: Complete (2026-03-04)
- v2.0: 3/3 phases complete
- v2.1: 2/6 phases complete (Phases 46-48 complete)

## Decisions

- Redefined v2.0 scope to a single objective: ship a 3D version of timeline-test functionality.
- Deferred broader spatial-constraint and cross-view diagnostic ambitions to later milestones.
- Kept continuous phase numbering, with v2.0 now spanning phases 43-45.
- Kept parity-critical warp/remap orchestration route-local inside `src/app/timeline-test-3d/lib` for CUBE-09 isolation.
- Standardized `/timeline-test-3d` on one canonical domain pipeline (`useCrimeData` -> `useDataStore` + `computeMaps`) to avoid dual-source drift.
- Mapped 3D slice percent values through domain epoch conversion plus adaptive warp sampling so 3D slice planes align with point Y positions.
- Reused shared `useSliceSelectionStore` and `setActiveSlice` in 3D handlers so timeline panel and 3D selection state stay synchronized.
- Used shared slice-adjustment utilities (`adjustBoundary`, `resolveSnapIntervalSec`) in 3D boundary dragging to preserve snapping semantics.
- Kept warp intervals in a dedicated `WarpSlices3D` overlay to separate annotation slice and warp slice interaction styling.
- Fixed NaN propagation from BurstList click: normalized burst window ranges before passing to focusTimelineRange, hardened DualTimeline coordinate/date calculations to gracefully handle invalid startup values.
- Mirrored suggestion UI components into `src/app/timeline-test-3d/components` to keep 3D suggestion parity route-local instead of cross-importing from timeslicing.
- Kept `accept-full-auto-package` event contract unchanged in 3D so package acceptance behavior remains aligned with existing orchestration.
- Adopted refactoring sequencing from `.planning/REFACTORING-PLAN.md`: guardrails -> dead code cleanup -> API stabilization -> timeline/query/store decomposition.
- Added a deterministic baseline capture workflow (`node scripts/capture-refactor-baseline.mjs --write`) to persist line/size and hot-path timing metrics before refactors.
- Added `Refactor Guardrails` PR checklist requirements to enforce behavior parity, baseline comparison, regression coverage, and debug-log cleanup in phases 47-51.
- Locked useCrimeData buffering expectations with provider-backed regression tests to catch contract drift before API/query refactors.
- Added `/api/crimes/range` contract tests for validation paths, buffer metadata semantics, sampled flags, and coordinate normalization parity.
- Standardized Vitest config loading via `vitest.config.mts` after resolving an ESM startup blocker.
- Extracted DualTimeline interaction math into `src/components/timeline/lib/interaction-guards.ts` and pinned brush/zoom/selection invariants with deterministic tests.
- Enforced lint-safe hook ordering for burst auto-slice synchronization while keeping interaction contracts unchanged.
- [Phase 48]: Centralized Chicago coordinate normalization in a shared adapter — Stream and range consumers now share one canonical -50..50 transform instead of drifting formulas.
- [Phase 48]: Normalize stream CSV rows after parsing with the shared helper — Mock and database-backed stream responses now follow the same conversion path.
- [Phase 48]: Kept /api/crimes/range as the only buffering authority so hooks forward visible epochs and consume server-reported buffer metadata. — This removes double-buffer drift and keeps fetched-range reporting aligned with the API response.
- [Phase 48]: Included bufferDays in the useCrimeData query key. — Visible start/end epochs alone no longer distinguish cache entries once buffering moved fully server-side.
- [Phase 48]: Let src/lib/coordinate-normalization.ts own both JS helpers and SQL-safe normalization expressions. — Range routes and query builders now share one Chicago normalization contract instead of duplicating bounds and formulas.
- [Phase 48]: Preserve the 48-02 buffering behavior while refactoring only normalization ownership. — The gap closure needed coordinate unification without reintroducing any buffering drift.

## Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-09 04:49 UTC
Stopped at: Completed 48-03-PLAN.md
Resume file: None
