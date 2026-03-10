# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-04)

**Core value:** Users compare uniform vs adaptive time mapping to reveal hidden spatiotemporal patterns.
**Current focus:** v2.1 refactoring and decomposition planning based on `.planning/REFACTORING-PLAN.md`.

## Current Position

Phase: **51 of 51** (Store Consolidation)
Plan: **3 of 12** in current phase
Status: **In progress**
Last activity: 2026-03-10 - Completed 51-03 timeline data contract/store extraction and compatibility shim

Progress: **███████████████████░** 180/192 plans complete (93.8%)

## Milestone Status

- v1.0: Complete (2026-02-07)
- v1.1: Complete (2026-02-22)
- v1.2: Complete (2026-03-02)
- v1.3: Complete (2026-03-04)
- v2.0: 3/3 phases complete
- v2.1: 5/6 phases complete (Phase 51 in progress)

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
- [Phase 49]: Keep adaptive/linear timeline transform-domain math in `useScaleTransforms` and consume it from `DualTimeline` orchestration. — This isolates pure scale conversion behavior ahead of interaction extraction work.
- [Phase 49]: Keep detail density-strip recompute/fallback decisions in `useDensityStripDerivation`, with `DualTimeline` reusing the shared threshold constant. — This prevents render-mode drift while decomposition continues.
- [Phase 49]: Preserve range store synchronization ownership in `DualTimeline` and inject it into `useBrushZoomSync`. — This keeps time/filter/coordination/viewport writes on the same parity-safe path while extracting D3 side effects.
- [Phase 49]: Keep brush/zoom conversion math routed through `interaction-guards` and make `isSyncingRef` guard boundaries explicitly testable via `withSyncGuard`. — This prevents feedback-loop drift during decomposition.
- [Phase 49]: Keep point-selection threshold semantics exactly `max(rangeSpan * 0.01, 60)` inside `usePointSelection` helper exports. — This preserves nearest-point parity while extracting pointer interaction ownership.
- [Phase 49]: Keep DualTimeline orchestration-focused by composing `usePointSelection` instead of owning pointer math inline. — This completes the four-hook decomposition boundary for the timeline component.
- [Phase 49]: Expose deterministic brush/zoom callback helper boundaries and validate both paths against the shared `applyRangeToStores` contract, including `setViewport`. — This closes the verification gap on multi-store parity evidence without changing runtime behavior.
- [Phase 50]: Keep `src/lib/queries.ts` as an import-compatible facade while internalizing query construction into `src/lib/queries/*`. — This allows decomposition without route churn.
- [Phase 50]: Centralize non-bindable SQL sanitization in `src/lib/queries/sanitization.ts` with explicit allow-list/clamp helpers. — This creates one auditable boundary for structural SQL values.
- [Phase 50]: Extract filter/aggregation/builder scaffolds before hot-path parameterization. — This keeps 50-01 focused on boundaries and parity, leaving semantic hardening to 50-02/50-03.
- [Phase 50]: Parameterize hot-path range/count values (`startEpoch`, `endEpoch`, filter lists, stride/limit) through builder-managed `{ sql, params }` outputs. — This removes ad-hoc interpolation from highest-traffic queries while preserving query signatures.
- [Phase 50]: Preserve `/api/crimes/range` consumer contract by pinning `sampled`, `sampleStride`, and buffer metadata parity in route-level regression tests. — This keeps observable API behavior stable while query internals evolve.
- [Phase 50]: Keep `src/lib/queries.ts` as a compatibility facade while moving density-bin and adaptive-cache SQL assembly into `src/lib/queries/aggregations.ts`. — This completes decomposition without requiring route import churn.
- [Phase 50]: Enforce adaptive aggregation scalar sanitization through centralized clamps (`clampAdaptiveBinCount`, `clampKernelWidth`, `clampDensityResolution`) and bind builder runtime values through params. — This tightens structural SQL safety with one auditable policy surface.
- [Phase 50]: Lock decomposition compatibility with regressions that assert callable facade exports and parameterized aggregation/cache query assembly contracts. — This guards API-facing behavior while internals continue to evolve.
- [Phase 51]: Consolidate authored slice lifecycle, selection, creation preview, and adjustment interaction state into one bounded `useSliceDomainStore` composed from internal slices. — This establishes a single ownership boundary before consumer migration.
- [Phase 51]: Apply `persist` once at the bounded store boundary and partialize to authored `slices` only. — This preserves persisted user-authored slice data while keeping drag/hover/selection interaction state transient.
- [Phase 51]: Export explicit slice-domain selector helpers from a single store entrypoint. — This supports parity-safe consumer rewires with fine-grained subscriptions instead of broad store selections.
- [Phase 51]: Move `DataPoint`, `ColumnarData`, `FilteredPoint`, and `selectFilteredData` ownership to `src/lib/data/*` modules. — This unanchors shared contracts from the deprecated `useDataStore` file before broad consumer migration.
- [Phase 51]: Introduce `useTimelineDataStore` as canonical timeline metadata/loading surface and keep `useDataStore` as a temporary re-export shim. — This preserves import compatibility while reducing deletion blast radius for 51-12.
- [Phase 51]: Rewire immediate trajectory/clustering consumers to shared selector/type imports from `src/lib/data/*`. — This validates extraction parity on key visualization paths during migration.

## Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-03-10 00:59 UTC
Stopped at: Completed 51-03-PLAN.md
Resume file: None
