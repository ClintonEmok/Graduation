# Roadmap: Adaptive Space-Time Cube

## Overview

v2.0 is narrowed to one outcome: a **3D version of timeline-test functionality**.
The milestone focuses on bringing timeline-test interaction parity (timeslicing controls, warp behavior, suggestions/review loop, and acceptance flows) into a dedicated 3D test experience.

Implementation policy for v2.0: favor 3D-specific logic copies for parity-critical flows; consolidation of duplicated 2D/3D logic is intentionally deferred to a potential v2.1 cleanup milestone.

## Milestones

- ✅ **v1.0 Thesis Prototype** - Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1 Manual Timeslicing** - Phases 26-33 (shipped 2026-02-22)
- ✅ **v1.2 Semi-Automated Timeslicing Workflows** - Phases 34-39 (shipped 2026-03-02)
- ✅ **v1.3 Fully Automated Timeslicing Workflows** - Phases 40-42 (shipped 2026-03-04)
- 🚧 **v2.0 3D Timeline-Test Parity** - Phases 43-45 (planned)

## Phases

- [x] **Phase 43: 3D Timeline-Test Foundation** - Stand up a dedicated 3D test route that reuses timeline-test state, controls, and data plumbing.
- [x] **Phase 44: 3D Interaction Parity** - Bring manual timeslicing and warp interactions to 3D with behavior matching timeline-test.
- [x] **Phase 45: 3D Suggestion and Acceptance Parity** - Bring suggestion generation, review, and acceptance workflows to the 3D test experience.

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

---

*For milestone history, see `.planning/MILESTONES.md`*
