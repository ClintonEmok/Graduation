# Roadmap: Adaptive Space-Time Cube

## Overview

v2.0 delivered a **3D version of timeline-test functionality** with interaction, suggestion, and acceptance parity.

Next focus is v2.1: a **refactoring and decomposition milestone** that reduces structural complexity, removes dead code, and hardens critical behavior before major internal cleanup.

## Milestones

- ✅ **v1.0 Thesis Prototype** - Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1 Manual Timeslicing** - Phases 26-33 (shipped 2026-02-22)
- ✅ **v1.2 Semi-Automated Timeslicing Workflows** - Phases 34-39 (shipped 2026-03-02)
- ✅ **v1.3 Fully Automated Timeslicing Workflows** - Phases 40-42 (shipped 2026-03-04)
- ✅ **v2.0 3D Timeline-Test Parity** - Phases 43-45 (shipped 2026-03-06)
- 📋 **v2.1 Refactoring and Decomposition** - Phases 46-51 (planned)

## Phases

- [x] **Phase 43: 3D Timeline-Test Foundation** - Stand up a dedicated 3D test route that reuses timeline-test state, controls, and data plumbing.
- [x] **Phase 44: 3D Interaction Parity** - Bring manual timeslicing and warp interactions to 3D with behavior matching timeline-test.
- [x] **Phase 45: 3D Suggestion and Acceptance Parity** - Bring suggestion generation, review, and acceptance workflows to the 3D test experience.
- [x] **Phase 46: Guardrails and Baselines** - Add regression safety checks and baseline metrics before structural refactors.
- [ ] **Phase 47: Dead Code Removal** - Remove legacy hooks and stale paths no longer used by active workflows.
- [x] **Phase 48: API Layer Stabilization** - Normalize coordinate handling and eliminate double-buffering drift.
- [ ] **Phase 49: DualTimeline Decomposition** - Extract focused hooks from DualTimeline and reduce component complexity.
- [ ] **Phase 50: Query Layer Decomposition** - Split `lib/queries.ts` into modular builders with safer parameterization.
- [ ] **Phase 51: Store Consolidation** - Consolidate slice-domain stores and remove deprecated data store paths.

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
**Plans**: 2 plans
Plans:
- [ ] 43-01-PLAN.md — Stand up `/timeline-test-3d` runtime context and core control wiring
- [ ] 43-02-PLAN.md — Add store-backed 3D scene synchronization and QA verification checkpoint

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
- [ ] 49-01-PLAN.md — Extract scale transforms and density derivation into dedicated hooks with deterministic tests
- [ ] 49-02-PLAN.md — Extract brush/zoom synchronization into a focused hook with parity-safe D3 wiring tests
- [ ] 49-03-PLAN.md — Extract point selection and finalize DualTimeline as an orchestration-focused hook composer
- [ ] 49-04-PLAN.md — Close verification gap with deterministic brush/zoom range-update parity regression coverage

### Phase 50: Query Layer Decomposition
**Goal**: Break `lib/queries.ts` into modular query builders with safer SQL construction.
**Depends on**: Phase 49
**Requirements**: REFACTOR-08, REFACTOR-09
**Success Criteria** (what must be TRUE):
  1. Query filters, aggregations, sanitization, and builders live in dedicated modules.
  2. Parameterized query construction replaces ad-hoc interpolation in hot paths.
  3. Query behavior remains backward-compatible for API consumers.
**Plans**: (created by /gsd/plan-phase)
Plans:
- [ ] TBD — created by /gsd/plan-phase

### Phase 51: Store Consolidation
**Goal**: Consolidate slice-domain state into coherent stores and retire deprecated data store paths.
**Depends on**: Phase 50
**Requirements**: REFACTOR-10, REFACTOR-11
**Success Criteria** (what must be TRUE):
  1. Slice-related stores are consolidated under a clear domain boundary.
  2. Deprecated `useDataStore.ts` is removed after consumer migration verification.
  3. No duplicate slice state sources remain in active workflows.
**Plans**: (created by /gsd/plan-phase)
Plans:
- [ ] TBD — created by /gsd/plan-phase

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01-25 | v1.0 | 82/82 | Complete | 2026-02-07 |
| 26-33 | v1.1 | 36/36 | Complete | 2026-02-22 |
| 34-39 | v1.2 | 25/25 | Complete | 2026-03-02 |
| 40-42 | v1.3 | 13/13 | Complete | 2026-03-04 |
| 43 | v2.0 | 2/2 | Complete | 2026-03-05 |
| 44 | v2.0 | 2/2 | Complete | 2026-03-06 |
| 45 | v2.0 | 1/1 | Complete | 2026-03-06 |
| 46 | v2.1 | 3/3 | Complete | 2026-03-06 |
| 47 | v2.1 | 1/1 | Complete | 2026-03-07 |
| 48 | v2.1 | 3/3 | Complete | 2026-03-09 |
| 49 | v2.1 | 0/3 | Planned | - |
| 50 | v2.1 | 0/0 | Planned | - |
| 51 | v2.1 | 0/0 | Planned | - |

---

*For milestone history, see `.planning/MILESTONES.md`*
