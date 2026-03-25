# Roadmap: Adaptive Space-Time Cube

## Overview

v3.0 is about **making everything click for user-facing usage** — completing the adaptive timeslicing system into a cohesive, usable experience.

Current focus: v3.0 milestone — Making Everything Click (phases 61-66)

## Milestones

- ✅ **v1.0 Thesis Prototype** - Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1 Manual Timeslicing** - Phases 26-33 (shipped 2026-02-22)
- ✅ **v1.2 Semi-Automated Timeslicing Workflows** - Phases 34-39 (shipped 2026-03-02)
- ✅ **v1.3 Fully Automated Timeslicing Workflows** - Phases 40-42 (shipped 2026-03-04)
- ✅ **v2.0 3D Timeline-Test Parity** - Phases 43-45 (shipped 2026-03-06)
- ✅ **v2.1 Refactoring and Decomposition** - Phases 46-51 (shipped 2026-03-10)
- ✅ **v2.2 Timeslicing Fidelity Improvements** - Phases 52-53 (shipped 2026-03-11)
- ✅ **v2.3 Adaptive Timeslicing Algos Hardening** - Phase 54 (shipped with tech debt)
- ✅ **v2.4 STKDE Exploration Surface** - Phase 55 (shipped 2026-03-16)
- ✅ **v2.3 Neighbourhood Diagnostics** - Phases 57-58 (shipped 2026-03-22)
- ✅ **v2.5 Stats Dashboard** - Phase 59 (shipped 2026-03-23)
- 📋 **v3.0 Making Everything Click** - Phases 61-66 (in progress)

## Phases

- [x] **Phase 43: 3D Timeline-Test Foundation** - Stand up a dedicated 3D test route that reuses timeline-test state, controls, and data plumbing.
- [x] **Phase 44: 3D Interaction Parity** - Bring manual timeslicing and warp interactions to 3D with behavior matching timeline-test.
- [x] **Phase 45: 3D Suggestion and Acceptance Parity** - Bring suggestion generation, review, and acceptance workflows to the 3D test experience.
- [x] **Phase 46: Guardrails and Baselines** - Add regression safety checks and baseline metrics before structural refactors.
- [x] **Phase 47: Dead Code Removal** - Remove legacy hooks and stale paths no longer used by active workflows. (completed 2026-03-07)
- [x] **Phase 48: API Layer Stabilization** - Normalize coordinate handling and eliminate double-buffering drift.
- [x] **Phase 49: DualTimeline Decomposition** - Extract focused hooks from DualTimeline and reduce component complexity. (completed 2026-03-09)
- [x] **Phase 50: Query Layer Decomposition** - Split `lib/queries.ts` into modular builders with safer parameterization. (completed 2026-03-09)
- [x] **Phase 51: Store Consolidation** - Consolidate slice-domain stores and remove deprecated data store paths. (completed 2026-03-10)
- [x] **Phase 52: Uniform-Events Binning for Timeslicing** - Add quantile-style event-balanced binning alongside existing uniform-time bins. (completed 2026-03-11)
- [x] **Phase 53: Add dedicated timeslicing algos route** - Add `/timeslicing-algos` for algorithm-focused timeline testing with mode comparison and centralized route-mode wiring. (completed 2026-03-11)
- [x] **Phase 54: Adaptive timeslicing in algos route with verbose diagnostics** - Add adaptive-mode controls and high-signal runtime diagnostics for `/timeslicing-algos` validation workflows. (5/9 plans — 4 incomplete: tech debt)
- [ ] **Phase 55: STKDE exploration route with Chicago heatmap and hotspots panel** - Add a dedicated STKDE QA route with spatiotemporal hotspot heatmap rendering and interactive hotspot list linked to map selection.
- [ ] **Phase 56: Variable sampling API support for high-fidelity selection detail** - Upgrade `/api/crimes/range` with intent-aware sampling semantics and wire `/timeslicing-algos` selection-detail requests to preserve explicit provenance under dense selections.

## Phase Details

### Phase 43: 3D Timeline-Test Foundation
**Goal**: Create a 3D test surface with the same core runtime context as timeline-test.
**Depends on**: Phase 42
**Requirements**: CUBE-01, CUBE-02, CUBE-09
**Success Criteria** (what must be TRUE):
  1. A dedicated 3D test route loads with the same timeline domain and store-backed state model used by timeline-test.
  2. Core controls (time scale mode, warp source/mode, generation triggers) are available and connected.
  3. Data and timeline context stay synchronized between 3D visualization and timeline panel.
  4. Parity-critical behavior can be implemented with 3D-specific logic copies without requiring cross-surface consolidation in v2.0.
**Plans**: 1 plan
Plans:
- [x] 43-01-PLAN.md — Stand up `/timeline-test-3d` runtime context and core control wiring

### Phase 44: 3D Interaction Parity
**Goal**: Enable core manual timeslicing and warp interactions in 3D with timeline-test-equivalent behavior.
**Depends on**: Phase 43
**Requirements**: CUBE-03, CUBE-04, CUBE-05
**Success Criteria** (what must be TRUE):
  1. Users can create/select/edit slices and warp slices from the 3D test experience.
  2. Acceptance of warp artifacts updates adaptive behavior consistently, matching timeline-test semantics.
  3. Interaction feedback (selection, active state, overlap/preview cues) is visible and stable in 3D.
**Plans**: 2 plans
Plans:
- [x] 44-01-PLAN.md — Add 3D slice visualization and create/select interactions
- [x] 44-02-PLAN.md — Add slice editing, warp visualization, and interaction feedback

### Phase 45: 3D Suggestion and Acceptance Parity
**Goal**: Provide full suggestion workflow parity in 3D test, including full-auto package review and acceptance.
**Depends on**: Phase 44
**Requirements**: CUBE-06, CUBE-07, CUBE-08
**Success Criteria** (what must be TRUE):
  1. Suggestion panel flows (generate/review/compare/history) are usable in 3D test.
  2. Full-auto ranked package review and whyRecommended rationale are visible and actionable.
  3. Accepting a package applies reviewed artifacts consistently and preserves safeguards/rerun behavior.
**Plans**: 1 plan
Plans:
- [x] 45-01-PLAN.md — Add SuggestionPanel component to timeline-test-3d route

### Phase 46: Guardrails and Baselines
**Goal**: Lock down behavior with regression coverage and measurable baselines before refactoring.
**Depends on**: Phase 45
**Requirements**: REFACTOR-01, REFACTOR-02
**Success Criteria** (what must be TRUE):
  1. Baseline metrics exist for key timeline interaction paths and can be compared after refactors.
  2. Regression tests cover buffering semantics, coordinate scale parity, and brush/zoom selection sync.
  3. Refactor checklist and quality gates are in place for subsequent phases.
**Plans**: 3 plans
Plans:
- [x] 46-01-PLAN.md — Add measurable refactor baselines and PR quality gates
- [x] 46-02-PLAN.md — Add buffering and coordinate parity regression contracts for useCrimeData and range API
- [x] 46-03-PLAN.md — Extract and test DualTimeline interaction guard logic for brush/zoom and selection sync

### Phase 47: Dead Code Removal
**Goal**: Remove obsolete code paths with zero behavior change.
**Depends on**: Phase 46
**Requirements**: REFACTOR-03
**Success Criteria** (what must be TRUE):
  1. Legacy `useSuggestionTrigger.ts` is removed.
  2. No runtime imports reference removed files.
  3. Build and regression suites pass after deletion.
**Plans**: 1 plan
Plans:
- [x] 47-01-PLAN.md — Remove legacy useSuggestionTrigger.ts hook

### Phase 48: API Layer Stabilization
**Goal**: Stabilize timeline data plumbing by unifying coordinate normalization and buffering ownership.
**Depends on**: Phase 47
**Requirements**: REFACTOR-04, REFACTOR-05
**Success Criteria** (what must be TRUE):
  1. A shared coordinate normalization adapter is used by all relevant consumers.
  2. Buffering logic has a single authoritative layer with no double-buffer drift.
  3. Range/stream endpoint coordinate behavior remains consistent with existing contracts.
**Plans**: 3 plans
Plans:
- [x] 48-01-PLAN.md — Create coordinate normalization adapter and fix stream route
- [x] 48-02-PLAN.md — Fix double-buffering in useCrimeData, update tests
- [x] 48-03-PLAN.md — Close the verification gap by wiring shared normalization through range and query consumers

### Phase 49: DualTimeline Decomposition
**Goal**: Decompose `DualTimeline.tsx` into dedicated hooks to improve maintainability and testability.
**Depends on**: Phase 48
**Requirements**: REFACTOR-06, REFACTOR-07
**Success Criteria** (what must be TRUE):
  1. Scale transforms, brush/zoom sync, point selection, and density derivation are extracted into focused hooks.
  2. `DualTimeline.tsx` is reduced to orchestration-focused logic.
  3. Extracted hook behavior is covered by tests and preserves existing interactions.
**Plans**: 4 plans
Plans:
- [x] 49-01-PLAN.md — Extract scale transforms and density derivation into dedicated hooks with deterministic tests
- [x] 49-02-PLAN.md — Extract brush/zoom synchronization into a focused hook with parity-safe D3 wiring tests
- [x] 49-03-PLAN.md — Extract point selection and finalize DualTimeline as an orchestration-focused hook composer
- [x] 49-04-PLAN.md — Close verification gap with deterministic brush/zoom range-update parity regression coverage

### Phase 50: Query Layer Decomposition
**Goal**: Break `lib/queries.ts` into modular query builders with safer SQL construction.
**Depends on**: Phase 49
**Requirements**: REFACTOR-08, REFACTOR-09
**Success Criteria** (what must be TRUE):
  1. Query filters, aggregations, sanitization, and builders live in dedicated modules.
  2. Parameterized query construction replaces ad-hoc interpolation in hot paths.
  3. Query behavior remains backward-compatible for API consumers.
**Plans**: 3 plans
Plans:
- [x] 50-01-PLAN.md — Create modular query-layer foundation and compatibility facade
- [x] 50-02-PLAN.md — Parameterize hot-path range/count queries with parity regression coverage
- [x] 50-03-PLAN.md — Complete aggregation/cache decomposition with sanitization boundary hardening

### Phase 51: Store Consolidation
**Goal**: Consolidate slice-domain state into coherent stores and retire deprecated data store paths.
**Depends on**: Phase 50
**Requirements**: REFACTOR-10, REFACTOR-11
**Success Criteria** (what must be TRUE):
  1. Slice-related stores are consolidated under a clear domain boundary.
  2. Deprecated `useDataStore.ts` is removed after consumer migration verification.
  3. No duplicate slice state sources remain in active workflows.
**Plans**: 12 plans
Plans:
- [x] 51-01-PLAN.md — Audit store coupling and introduce bounded `useSliceDomainStore` foundation
- [x] 51-02-PLAN.md — Convert legacy slice stores into bounded-domain compatibility adapters
- [x] 51-03-PLAN.md — Extract shared data contracts/selectors and introduce `useTimelineDataStore`
- [x] 51-04-PLAN.md — Rewire timeline-test slice consumers to bounded selectors/actions
- [x] 51-05-PLAN.md — Rewire timeline-test-3d slice consumers to bounded selectors/actions
- [x] 51-06-PLAN.md — Migrate core component data consumers off `useDataStore`
- [x] 51-07-PLAN.md — Migrate core hook/lib data consumers off `useDataStore`
- [x] 51-08-PLAN.md — Migrate core viz scene/render consumers off `useDataStore`
- [x] 51-09-PLAN.md — Migrate supporting viz overlays/inspector consumers off `useDataStore`
- [x] 51-10-PLAN.md — Migrate residual route/3D data consumers off `useDataStore`
- [x] 51-11-PLAN.md — Migrate advanced viz and adapter residual consumers off `useDataStore`
- [x] 51-12-PLAN.md — Enforce zero-import gate and delete `src/store/useDataStore.ts`

### Phase 52: Uniform-Events Binning for Timeslicing
**Goal**: Implement quantile-style uniform-events binning in adaptive map generation and wire it into timeslicing without regressing existing behavior.
**Depends on**: Phase 51
**Requirements**: BINS-01, BINS-02
**Success Criteria** (what must be TRUE):
  1. Timeslicing can request uniform-events bins (equal-event-target bins) in addition to uniform-time bins.
  2. Worker/store contracts expose count and density outputs for both modes with parity-safe defaults.
  3. Existing flows remain backward-compatible when uniform-time mode is used.
**Plans**: 4 plans
Plans:
- [x] 52-01-PLAN.md — Add mode-aware adaptive worker/store contract and uniform-events binning algorithm
- [x] 52-02-PLAN.md — Wire `/timeslicing` to request uniform-events bins with route-level regression guard
- [x] 52-03-PLAN.md — Make global adaptive precompute/cache mode-aware with count+density parity outputs
- [x] 52-04-PLAN.md — Close verification gap by fixing global cache insert SQL parity and adding regression guard

### Phase 54: Adaptive timeslicing in algos route with verbose diagnostics
**Goal**: Extend `/timeslicing-algos` to include adaptive timeslicing mode and add explicit route-level diagnostics so behavior is inspectable during algorithm comparisons.
**Depends on**: Phase 53
**Requirements**: ALGOS-ADAPTIVE-01, OBS-01
**Success Criteria** (what must be TRUE):
  1. `/timeslicing-algos` can switch across `uniform-time`, `uniform-events`, and adaptive mode in a single route session.
  2. Adaptive-mode toggles and request payloads are explicit and test-covered to prevent silent fallback behavior.
  3. Verbose diagnostics are available for QA (selected mode, effective parameters, cache-key/mode context) without polluting non-algos routes.
**Plans**: 9 plans
Plans:
- [x] 54-01-PLAN.md — Add adaptive mode option and route wiring in `/timeslicing-algos`
- [ ] 54-02-PLAN.md — Add verbose route-scoped diagnostics panel/logging for mode/payload/cache context *(tech debt)*
- [ ] 54-03-PLAN.md — Add regression coverage for adaptive mode selection, fallback behavior, and diagnostics visibility *(tech debt)*
- [x] 54-04-PLAN.md — Separate strategy/time-scale controls and timeline-test parity wiring for `/timeslicing-algos`
- [x] 54-05-PLAN.md — Rewire `/timeslicing-algos` timeline domain/fetch lifecycle to match `/timeslicing`
- [ ] 54-06-PLAN.md — Improve span-aware DualTimeline tick UX and guarded dashboard rollout *(tech debt)*
- [x] 54-07-PLAN.md — Add deep per-bin adaptive diagnostics for `/timeslicing-algos` QA
- [ ] 54-08-PLAN.md — Clarify QA/exploration timeline semantics across `/timeslicing` and `/timeslicing-algos` *(tech debt)*
- [x] 54-09-PLAN.md — Add selection-specific high-capacity detail fetch with explicit provenance, diagnostics source control, and guardrailed fallback

> **Tech Debt Note**: Plans 54-02, 54-03, 54-06, and 54-08 were not executed. They remain as known tech debt and can be revisited as future refinements. Phase 57 delivered the diagnostics infrastructure that superseded 54-02. Phase 58 delivered neighbourhood enrichment. Phases 55 and 56 can proceed independently.

### Phase 55: STKDE exploration route with Chicago heatmap and hotspots panel
**Goal**: Provide a dedicated STKDE exploration surface for QA to inspect spatial-temporal hotspots on Chicago map + timeline context, without changing general-user dashboard flows.
**Depends on**: Phase 54
**Requirements**: STKDE-01, STKDE-02, STKDE-03
**Success Criteria** (what must be TRUE):
  1. A dedicated `/stkde` route exists and is isolated from existing `/timeslicing` and `/timeslicing-algos` workflows.
  2. STKDE computation runs with QA-tunable parameters and returns deterministic heatmap + hotspot outputs under explicit compute limits.
  3. Chicago heatmap rendering and hotspot panel stay synchronized through a two-way interaction loop (map selection filters list; list selection focuses map).
  4. Hotspot rows expose spatial + temporal attributes (location, intensity score, time window, support counts) suitable for QA analysis.
  5. Performance guardrails, regression tests, and rollback toggles are in place to disable STKDE surfaces quickly if compute/render pressure is too high.
**Plans**: 2 plans
Plans:
- [ ] 55-01-PLAN.md — Build dedicated `/stkde` QA route with hybrid STKDE compute pipeline, Chicago heatmap rendering, and interactive hotspot panel
- [ ] 55-02-PLAN.md — Add QA-only full-population STKDE mode with SQL/chunked aggregation path, guardrailed fallback, and provenance UI on `/stkde`

### Phase 56: Variable sampling API support for high-fidelity selection detail
**Goal**: Introduce intent-aware variable sampling for `/api/crimes/range` and use it from `/timeslicing-algos` to improve dense selection fidelity without breaking legacy consumers.
**Depends on**: Phase 54
**Requirements**: SAMPLING-01, SAMPLING-02, PROVENANCE-01
**Success Criteria** (what must be TRUE):
  1. `/api/crimes/range` accepts variable sampling semantics (`samplingIntent` and optional `targetPoints`) while remaining backward-compatible with legacy query patterns.
  2. Sampling provenance remains explicit and test-covered (`sampled`, `sampleStride`, returned/total counts, intent/target/effective policy metadata).
  3. `/timeslicing-algos` selection-detail flow requests high-fidelity intent-aware sampling and preserves explicit fallback/provenance labels.
  4. Regression + baseline guardrails exist for dense selection behavior, and rollback steps are documented and executable.
  5. Dashboard route behavior remains unchanged (out of scope).
**Plans**: 3 plans
Plans:
- [ ] 56-01-PLAN.md — Define `/api/crimes/range` variable-sampling contract and policy-backed provenance metadata with backward-compatible defaults
- [ ] 56-02-PLAN.md — Integrate intent-aware selection-detail requests in `/timeslicing-algos` while preserving explicit provenance/fallback labels
- [ ] 56-03-PLAN.md — Add dense-selection regressions, rollout guardrail baseline capture, and executable rollback checklist

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01-25 | v1.0 | 82/82 | Complete | 2026-02-07 |
| 26-33 | v1.1 | 36/36 | Complete | 2026-02-22 |
| 34-39 | v1.2 | 25/25 | Complete | 2026-03-02 |
| 40-42 | v1.3 | 13/13 | Complete | 2026-03-04 |
| 43 | v2.0 | 1/1 | Complete | 2026-03-05 |
| 44 | v2.0 | 2/2 | Complete | 2026-03-06 |
| 45 | v2.0 | 1/1 | Complete | 2026-03-06 |
| 46 | v2.1 | 3/3 | Complete | 2026-03-06 |
| 47 | v2.1 | 1/1 | Complete | 2026-03-07 |
| 48 | v2.1 | 3/3 | Complete | 2026-03-09 |
| 49 | v2.1 | 4/4 | Complete | 2026-03-09 |
| 50 | v2.1 | 3/3 | Complete | 2026-03-09 |
| 51 | v2.1 | 12/12 | Complete | 2026-03-10 |
| 52 | v2.2 | 4/4 | Complete | 2026-03-11 |
| 53 | v2.2 | 2/2 | Complete | 2026-03-11 |
| 57 | v2.3 | 5/5 | Complete | 2026-03-20 |
| 58 | v2.3 | 3/3 | Complete | 2026-03-22 |
| 54 | v2.3 | 5/9 | Complete (tech debt) | - |
| 55 | v2.4 | 2/2 | Complete | 2026-03-16 |
| 56 | v2.5 | 0/3 | Planned | - |
| 57 | v2.3 | 5/5 | Complete | 2026-03-20 |
| 58 | v2.3 | 3/3 | Complete | 2026-03-22 |
| 59 | v2.5 | 3/3 | Complete | 2026-03-23 |
| 61 | v3.0 | 1/1 | Complete | 2026-03-25 |
| 62 | v3.0 | 0/1 | Planned | - |
| 63 | v3.0 | 0/1 | Planned | - |
| 64 | v3.0 | 0/1 | Planned | - |
| 65 | v3.0 | 0/1 | Planned | - |
| 66 | v3.0 | 0/1 | Planned | - |

### Phase 53: Add dedicated timeslicing algos route

**Goal:** Add a dedicated `/timeslicing-algos` route focused on core timeslicing algorithm behavior and timeline interaction testing, including in-route comparison of `uniform-time` and `uniform-events`, with a clear extension point for future methods (for example STKDE/KDE).
**Depends on:** Phase 52
**Plans:** 2/2 plans complete

Plans:
- [x] 53-01-PLAN.md — Build a focused `/timeslicing-algos` route shell for algorithm + timeline testing with both mode controls and a future-friendly algorithm selector contract (no full-auto workflow UI)
- [x] 53-02-PLAN.md — Wire and test centralized route-to-binning resolution with `/timeslicing-algos` override support for both modes

### Phase 57: Context-aware timeslicing core (temporal + spatial, data-driven diagnostics)

**Goal:** Add a deterministic context-diagnostics core (temporal + spatial) and surface compact, explainable dynamic profile insights in timeslicing/timeslicing-algos without changing generation ranking behavior.
**Requirements**: None (phase-context decisions in 57-CONTEXT.md)
**Depends on:** Phase 56
**Plans:** 5/5 plans complete

Plans:
- [x] 57-01-PLAN.md — Build deterministic temporal/spatial diagnostics engine with dynamic profile + comparison contracts
- [x] 57-02-PLAN.md — Integrate diagnostics output into suggestion generation metadata persistence
- [x] 57-03-PLAN.md — Surface compact diagnostics UI with collapsed comparison, confidence toggle, and partial-failure notices
- [x] 57-04-PLAN.md — Make `/timeslicing-algos` strategy-comparison effects explicit and human-verifiable in default diagnostics
- [x] 57-05-PLAN.md — Add deterministic per-bin characterization labels in `/timeslicing-algos` details while preserving comparison-first default readability

### Phase 58: enrich the with neighbourhood data poi events that happened on the day anything useful

**Goal:** Add neighbourhood context enrichment to timeslicing by fetching Points of Interest (POI) data from OpenStreetMap and Chicago Open Data Portal. Integrate neighbourhood diagnostics into `/timeslicing-algos` with on-demand fetching and graceful fallback.
**Requirements**: None (new phase)
**Depends on:** Phase 57
**Plans:** 3 plans

Plans:
- [x] 58-01-PLAN.md — Build neighbourhood lib module with OSM Overpass API client, Chicago Data Portal client, and summary builder
- [x] 58-02-PLAN.md — Create /api/neighbourhood/poi server-side route with caching and integrate neighbourhood into context diagnostics
- [x] 58-03-PLAN.md — Add neighbourhood diagnostics panel to /timeslicing-algos with compact/expandable UI

### Phase 59: Add stats page for neighborhoods

**Goal:** Create a dedicated `/stats` route for neighborhood crime statistics with district-level breakdowns, crime type distribution, temporal patterns, spatial hotspots, and neighbourhood context integration.
**Depends on:** Phase 58
**Plans:** 3 plans

Plans:
- [ ] 59-01-PLAN.md — Create stats route shell, district selector, aggregation helpers, and useNeighborhoodStats hook
- [ ] 59-02-PLAN.md — Add crime type breakdown charts, temporal heatmap/trend, and overview stat cards
- [ ] 59-03-PLAN.md — Add spatial hotspot map, neighbourhood context cards, and finalize responsive dashboard layout

## v3.0 Making Everything Click Milestone

### Phase 61: Dynamic Rule-Based Binning System ✓ Complete

**Goal:** Build dynamic rule-based binning system with merge/split/delete/resize operations and constraint validation.
**Depends on:** Phase 58
**Requirements:** BIN-01, BIN-02, BIN-03, BIN-04, BIN-05, BIN-06, BIN-07, BIN-08
**Success Criteria** (what must be TRUE):
  1. User can select from 13 binning strategies.
  2. User can merge adjacent bins into single bin.
  3. User can split bin at midpoint or custom timestamp.
  4. User can delete individual bins.
  5. User can resize bin by adjusting start/end times.
  6. User can save/load binning configurations.
  7. User can undo/reset binning changes.
  8. Constraints prevent invalid bin configurations (minEvents, maxEvents, maxBins, contiguous).
**Plans:** 1 plan

Plans:
- [x] 61-01-PLAN.md — Build binning types, rules, engine, and store operations

### Phase 62: User-Driven Timeslicing (Manual Mode)

**Goal:** Implement user-driven timeslicing with manual mode, presets, and templates.
**Depends on:** Phase 61
**Requirements:** MANU-01, MANU-02, MANU-03, MANU-04, MANU-05, MANU-06
**Success Criteria** (what must be TRUE):
  1. User can toggle between auto and manual timeslicing modes.
  2. User can create slices manually via click-drag on timeline.
  3. User can adjust slice boundaries by dragging handles.
  4. User can preview slice effects before applying.
  5. User can delete individual slices.
  6. User can reorder slices.
**Plans:** 1 plan

Plans:
- [ ] 62-01-PLAN.md — Extend timeslicing mode store, build toolbar and manual editor

### Phase 63: Map Visualization

**Goal:** Enhance 2D map with slice visualization and cross-view sync.
**Depends on:** Phase 62
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05
**Success Criteria** (what must be TRUE):
  1. Time slices visible on 2D map view.
  2. Slice boundaries clearly rendered.
  3. Cross-view sync: selecting slice on map highlights in timeline/cube.
  4. Map supports current zoom/pan levels without performance degradation.
  5. Spatial filters integrate with slice selection.
**Plans:** 1 plan

Plans:
- [ ] 63-01-PLAN.md — Add slice visualization to map, implement cross-view sync, optimize performance

### Phase 64: Dashboard Redesign

**Goal:** Redesign dashboard with unified header, integrated controls, and proper layout.
**Depends on:** Phase 63
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. Unified control panel for all timeslicing operations.
  2. Current binning strategy and status visible.
  3. Active slices displayed with quick actions.
  4. Workflow status (manual/auto) clearly indicated.
  5. Quick access to switch between modes.
**Plans:** 1 plan

Plans:
- [ ] 64-01-PLAN.md — Build DashboardHeader, update dashboard layout, add layout store, wire cross-panel sync

### Phase 65: STKDE Integration

**Goal:** Integrate STKDE computation and visualization into dashboard with heatmap and controls.
**Depends on:** Phase 64
**Requirements:** STKD-01, STKD-02, STKD-03, STKD-04, STKD-05
**Success Criteria** (what must be TRUE):
  1. Kernel density estimation overlay available.
  2. Hotspot detection panel shows high-density areas.
  3. Chicago heatmap integration functional.
  4. STKDE results visible in 3D cube view.
  5. Toggle between standard and STKDE visualization.
**Plans:** 1 plan

Plans:
- [ ] 65-01-PLAN.md — Extend STKDE store, implement heatmap layer, create STKDE route, connect to dashboard

### Phase 66: Full Integration and Testing

**Goal:** Complete full integration and testing - connect all pieces and verify all routes work.
**Depends on:** Phase 65
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. End-to-end workflow tests pass.
  2. Cross-route navigation works correctly.
  3. State persists across route changes.
  4. Performance benchmarks meet targets.
  5. Edge cases handled gracefully.
**Plans:** 1 plan

Plans:
- [ ] 66-01-PLAN.md — Verify all routes, implement cross-route state sync, add feature flags, write integration tests

---

*For milestone history, see `.planning/MILESTONES.md`*
