# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-04)

**Core value:** Users compare uniform vs adaptive time mapping to reveal hidden spatiotemporal patterns.
**Current focus:** Execute Phase 54 plans to deliver adaptive-mode testing and verbose diagnostics in `/timeslicing-algos`.

## Current Position

Phase: **54 of 54** (Adaptive timeslicing in algos route with verbose diagnostics)
Plan: **3 of 5** completed in current phase
Status: **In progress**
Last activity: 2026-03-13 - Completed 54-05 timeline parity rewire for `/timeslicing-algos`

Progress: **███████████████████░** 199/202 plans complete (98.5%)

## Milestone Status

- v1.0: Complete (2026-02-07)
- v1.1: Complete (2026-02-22)
- v1.2: Complete (2026-03-02)
- v1.3: Complete (2026-03-04)
- v2.0: 3/3 phases complete
- v2.1: 6/6 phases complete
- v2.2: 2/2 phases complete
- v2.3: 0/1 phases complete (planned)

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
- [Phase 51]: Rewire timeline-test slice consumers and `DualTimeline` orchestration reads to bounded `useSliceDomainStore` selectors/actions. — This removes split-store consumer ownership while preserving create/select/adjust parity.
- [Phase 51]: Convert `useSliceStore`, `useSliceSelectionStore`, `useSliceCreationStore`, and `useSliceAdjustmentStore` into compatibility adapters over `useSliceDomainStore`. — This removes split legacy store roots while preserving import paths for downstream rewires.
- [Phase 51]: Add explicit no-new-root adapter guards and verify zero `create(` calls in legacy slice modules. — This locks a single bounded owner assumption before consumer migration plans.
- [Phase 51]: Move `DataPoint`, `ColumnarData`, `FilteredPoint`, and `selectFilteredData` ownership to `src/lib/data/*` modules. — This unanchors shared contracts from the deprecated `useDataStore` file before broad consumer migration.
- [Phase 51]: Introduce `useTimelineDataStore` as canonical timeline metadata/loading surface and keep `useDataStore` as a temporary re-export shim. — This preserves import compatibility while reducing deletion blast radius for 51-12.
- [Phase 51]: Rewire immediate trajectory/clustering consumers to shared selector/type imports from `src/lib/data/*`. — This validates extraction parity on key visualization paths during migration.
- [Phase 51]: Rewire `TimeSlices3D` slice interactions directly to `useSliceDomainStore` selectors/actions. — This keeps timeline-test-3d aligned with the bounded slice-domain ownership model before legacy split-store cleanup.
- [Phase 51]: Enforce zero split-store imports in `TimeSlices3D` via import-gate verification. — This prevents regression to deprecated `useSliceSelectionStore`/`useSliceCreationStore`/`useSliceAdjustmentStore` paths.
- [Phase 51]: Migrated core timeline/map components to useTimelineDataStore and shared selectors/types for parity-safe deprecated-store retirement. — Reduces high-traffic dependency on useDataStore while preserving interaction behavior before final store deletion.
- [Phase 51]: Switch advanced `ClusterManager` and `TrajectoryLayer` consumers to `useTimelineDataStore` while preserving selector-derived clustering/trajectory behavior. — This clears advanced visualization residual ownership from the deprecated store path.
- [Phase 51]: Update `useSliceStore` normalization fallback to read timestamp bounds from `useTimelineDataStore`. — This keeps the slice compatibility adapter independent from `useDataStore` before 51-12 deletion gating.
- [Phase 51]: Keep hook/lib consumer rewires parity-safe by migrating ownership/import paths to `useTimelineDataStore` and shared selectors without changing selection/density/slice-stat semantics. — This lowers deprecated-store coupling while preserving user-visible behavior.
- [Phase 51]: Record explicit zero-import gate evidence for the migrated hook/lib batch (`@/store/useDataStore` count = 0). — This provides deterministic readiness evidence for staged deprecated-store deletion.
- [Phase 51]: Migrate supporting viz overlays and inspector consumers (`BurstDetails`, `BurstList`, `HeatmapOverlay`, `PointInspector`, `SliceManagerUI`) to `useTimelineDataStore`. — This removes another supporting-viz batch from deprecated `useDataStore` ownership while preserving behavior parity.
- [Phase 51]: Treat targeted lint verification as a blocking migration gate for supporting viz files and fix hook/memoization blockers inline. — This keeps store-retirement work aligned with existing quality gates.
- [Phase 51]: Rewire core 3D scene/render files (`CubeVisualization`, `MainScene`, `DataPoints`, `TimeGrid`, `TimeLoop`, `TimeSlices`) to `useTimelineDataStore` and enforce a zero deprecated-import gate in this batch. — This clears high-visibility render surfaces from `useDataStore` before final deletion.
- [Phase 51]: Replace residual route-level and 3D consumer `useDataStore` reads/writes with `useTimelineDataStore` in timeslicing and timeline-test-3d route files. — This removes deprecated-store ownership from the remaining route/3D migration batch while preserving behavior parity.
- [Phase 51]: Route canonical 3D point derivation through `selectFilteredData` and enforce a targeted zero-import gate for the residual batch. — This aligns canonical point reads with shared selector ownership and provides deterministic evidence before final deletion planning.
- [Phase 51]: Used useTimelineDataStore as canonical fallback for residual timeline/slice reads after useDataStore deletion — Prevents reintroducing deprecated ownership while preserving existing selector behavior.
- [Phase 51]: Handled residual deprecated imports as regression fixes discovered in post-delete gates — Ensures final deletion gate is enforced by code state, not only by staged migration assumptions.
- [Phase 51]: Recorded lint debt separately while keeping typecheck and targeted store tests as passing parity gates — Broad lint issues pre-existed and are outside this terminal deletion plan scope.
- [Phase 52]: Kept adaptive compute calls backward-compatible by defaulting missing `binningMode` to `uniform-time` at store/worker boundaries. — Existing timeline-test, timeline-test-3d, and MainScene call sites remain unchanged.
- [Phase 52]: Standardized worker outputs to preserve `densityMap`/`countMap`/`burstinessMap`/`warpMap` shape while adding uniform-events internals. — Consumers can adopt mode overrides without output-contract branching.
- [Phase 52]: Locked `countMap` to raw per-bin event counts and treated density smoothing/normalization as a separate concern. — This preserves count semantics for burst reporting while still supporting adaptive warp weighting.
- [Phase 52]: Scoped `binningMode: 'uniform-events'` override to `/timeslicing` route recompute wiring. — Non-timeslicing routes preserve default `uniform-time` behavior without call-site churn.
- [Phase 52]: Added route-level timeslicing mode-intent regression coverage in `page.binning-mode.test.ts`. — Refactors now fail fast if explicit uniform-events wiring is removed.
- [Phase 52]: Extended global adaptive cache keys with binning mode suffix to isolate uniform-time and uniform-events entries. — Prevents cross-mode cache collisions when density scope switches or callers request different binning modes.
- [Phase 52]: Default missing binning mode to uniform-time in global adaptive API/query path. — Preserves backward compatibility for existing callers that do not pass mode.
- [Phase 52]: Hydrate countMap with global precomputed payloads in MainScene. — Keeps global and viewport adaptive contract parity for downstream consumers.
- [Phase 52]: Keep global adaptive cache insert SQL column order unchanged and fix VALUES placeholders to 11/11 parity. — Resolves cache-miss persistence failure risk without widening query-layer behavior changes.
- [Phase 52]: Enforce global adaptive cache insert parity through deterministic builder-level SQL parsing tests. — Prevents future column/placeholder drift from reintroducing runtime SQL failures.
- [Phase 53]: Established `/timeslicing-algos` as an algorithm-focused route with both `uniform-time` and `uniform-events` controls and timeline interaction coverage. — This isolates algorithm behavior testing from suggestion/full-auto orchestration UI.
- [Phase 53]: Introduced `src/app/timeslicing-algos/lib/algorithm-options.ts` as a future-friendly algorithm selector contract. — Additional methods (for example STKDE/KDE) can be added through one registry boundary.
- [Phase 53]: Centralized route mode ownership in `resolveRouteBinningMode(pathname, explicitMode)` and wired `MainScene` to use it. — Global adaptive fetch mode no longer depends on inline pathname heuristics and now supports explicit in-route override behavior.
- [Phase 54]: Keep `adaptive` as `/timeslicing-algos` route intent and resolve effective compute mode via `resolveRouteBinningMode`. — This adds third-mode QA coverage without widening backend/store binning contracts.
- [Phase 54]: Preserve existing invalid/missing mode fallback as `uniform-events` on `/timeslicing-algos`. — This keeps current user behavior stable while adding adaptive query intent support.
- [Phase 54]: Keep `adaptive` as timeline interaction mode while binning strategy remains explicitly `uniform-time`/`uniform-events`. — This preserves compute contract stability and keeps uniform strategy selection first-class.
- [Phase 54]: Canonicalize `/timeslicing-algos` query state to `strategy` + `timescale` with field-level fallback from legacy `mode`. — This keeps old links functional while making route intent deterministic.
- [Phase 54]: Remove settled selection delay and `/api/crime/meta` label ownership from `/timeslicing-algos`. — Fetch-domain and status labels now follow the active base timeline domain contract.
- [Phase 54]: Keep `computeMaps` and timeline store domain writes pinned to `[baseDomainStartSec, baseDomainEndSec]` while detail range always follows selected/viewport range. — This aligns drag/brush behavior with `/timeslicing` without recoupling selection to fetch windows.
- Reconciled roadmap checkboxes and progress table to match on-disk phase completion after stale/duplicate planning artifact cleanup.
- Added roadmap placeholder for Phase 54 to introduce adaptive mode coverage and route-scoped verbose diagnostics in `/timeslicing-algos`.

## Blockers/Concerns

- Targeted lint command for timeline/map/viz surfaces still reports pre-existing repo lint errors outside the 51-12 deletion change set.

## Accumulated Context

### Roadmap Evolution

- Phase 53 retargeted to dedicated `/timeslicing-algos` algorithm route with both mode comparison and extension-point contract.

## Session Continuity

Last session: 2026-03-13 01:22 UTC
Stopped at: Completed 54-05-PLAN.md
Resume file: None
