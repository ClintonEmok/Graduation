# Roadmap: Adaptive Space-Time Cube

## Overview

v3.0 is about turning the prototype into a coherent investigative workflow inside one unified route: `dashboard-v2`. Users define slicing intent, the system generates flexible bins, users review and apply those bins, all views update together inside that route, and adaptive/STKDE analysis makes bursts and hotspots easier to inspect without splitting the experience across separate surfaces.

Current focus: v3.0 milestone - Integrated Adaptive Timeslicing Workflow in `dashboard-v2` (phases 61-66)

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
- 📋 **v3.0 Integrated Adaptive Timeslicing Workflow** - Phases 61-66 (in progress)

## v3.0 Phases (Replanned)

### Phase 61: Flexible Binning Engine and Generation Core ✓ Complete

**Goal:** Replace fixed-count binning with a flexible engine that can support rule-based strategies, granular presets, and downstream review/apply workflows.
**Depends on:** Phase 58
**Requirements:** BIN-01, BIN-02, BIN-03, BIN-04, BIN-05, BIN-06, BIN-07, BIN-08 (8 requirements)
**Success Criteria** (what must be TRUE):
1. Fixed bin counts are no longer the only binning path.
2. Rule-based generation, CRUD operations, and validation exist as reusable core primitives.
3. Hourly, daily, weekly, burst-aware, and adaptive strategies are possible at the engine level.
4. Generated bins can be handed off to later review, apply, and manual-refinement phases.
**Plans:** 1 complete

---

### Phase 62: Constraint-Driven Generation and Review-to-Apply Flow

**Goal:** Users describe what they need with domain constraints, receive generated bins as the default output, review them clearly, and apply approved slices into the unified `dashboard-v2` workflow state.
**Depends on:** Phase 61
**Requirements:** GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06 (6 requirements)
**Success Criteria** (what must be TRUE):
1. User can request generated slices using crime type, neighbourhood, time window, and granularity inputs.
2. Generator is no longer framed around a fixed number of bins.
3. Hourly and daily granularity are first-class user options, with room for weekly and adaptive variants.
4. Generated bins are presented as the main default result, not a hidden draft-only flow.
5. Review UI makes it clear what will change before apply.
6. Apply updates active slices that will be consumed by the unified `dashboard-v2` experience.
**Plans:** 1 replanned plan ready

Plans:
- [ ] 62-01-PLAN.md - Implement constraint-driven generation, review, and apply workflow

---

### Phase 63: Manual Refinement and Adaptive Burst Emphasis

**Goal:** After generation, users can manually adjust slices inside `dashboard-v2`, while adaptive spacing and burst-focused logic make dense periods more prominent for investigation.
**Depends on:** Phase 62
**Requirements:** MAN-01, MAN-02, MAN-03, MAN-04, MAN-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. User can edit generated slices after generation instead of starting from manual-only creation.
2. Manual refinement is precise enough for investigation without making the main workflow harder.
3. Burst periods can be emphasized by narrower generated bins where warranted.
4. Adaptive time allocation expands burst-heavy periods more aggressively in visual space.
5. Phase 63 ships on `dashboard-v2` as the dedicated single-route surface for the rest of v3.0.
**Plans:** milestone replan pending

---

### Phase 64: Cross-View Synchronization and Unified Workflow Dashboard

**Goal:** `dashboard-v2` becomes the single unified surface where timeslices are shared across timeline, map, heatmap, cube, and control panels.
**Depends on:** Phase 63
**Requirements:** SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. Applied slices are immediately visible in the `dashboard-v2` timeline.
2. `dashboard-v2` map view shows slice-linked locations and heatmap context coherently.
3. `dashboard-v2` 3D cube shows points and slice context in sync with the timeline.
4. `dashboard-v2` clearly communicates whether the user is generating, reviewing, applied, or refining slices.
5. Binning strategy, granularity, and workflow status are easy to understand at a glance inside `dashboard-v2`.
**Plans:** 2 plans

Plans:
- [ ] 64-01-PLAN.md — Harden cross-view coordination store contracts with deterministic reconciliation behavior
- [ ] 64-02-PLAN.md — Integrate synchronized header + timeline/map/heatmap/cube composition in dashboard-v2

---

### Phase 65: STKDE Integration

**Goal:** Add STKDE-powered hotspot detection directly into `dashboard-v2` so slice-based investigation, map analysis, and cube analysis stay unified.
**Depends on:** Phase 64
**Requirements:** STKD-01, STKD-02, STKD-03, STKD-04, STKD-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. STKDE overlay can be toggled alongside slice exploration.
2. Hotspot detection helps users inspect bursty regions and time windows.
3. `dashboard-v2` map and heatmap surfaces show STKDE output clearly.
4. `dashboard-v2` cube view can surface STKDE-informed density context.
5. STKDE integrates with the same applied-slice workflow inside `dashboard-v2` rather than feeling like a separate route-only experiment.
**Plans:** milestone replan pending

---

### Phase 66: Full Workflow Hardening and Validation

**Goal:** Verify that the unified `dashboard-v2` generate-review-apply-refine-investigate workflow is stable, performant, and suitable for evaluation.
**Depends on:** Phase 65
**Requirements:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06 (6 requirements)
**Success Criteria** (what must be TRUE):
1. A user can generate bins from domain constraints and apply them end-to-end within `dashboard-v2` without confusion.
2. Manual refinement works after generation without desynchronizing the views.
3. `dashboard-v2` dashboard, map, timeline, heatmap, and cube remain consistent through the workflow.
4. Performance is good enough for interactive use on the thesis dataset.
5. Empty, low-confidence, and error states are understandable.
6. Legacy route split no longer blocks the unified v3.0 experience.
**Plans:** milestone replan pending

---

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
| 54 | v2.3 | 5/9 | Complete (tech debt) | - |
| 55 | v2.4 | 2/2 | Complete | 2026-03-16 |
| 56 | v2.5 | 0/3 | Planned | - |
| 57 | v2.3 | 5/5 | Complete | 2026-03-20 |
| 58 | v2.3 | 3/3 | Complete | 2026-03-22 |
| 59 | v2.5 | 3/3 | Complete | 2026-03-23 |
| 61 | v3.0 | 1/1 | Complete | 2026-03-25 |
| 62 | v3.0 | 0/1 | In Progress | - |
| 63 | v3.0 | Replan needed | Planned | - |
| 64 | v3.0 | Replan needed | Planned | - |
| 65 | v3.0 | Replan needed | Planned | - |
| 66 | v3.0 | Replan needed | Planned | - |

---

## Phase Details (Previous Milestones)

### Phase 53: Add dedicated timeslicing algos route

**Goal:** Add a dedicated `/timeslicing-algos` route focused on core timeslicing algorithm behavior and timeline interaction testing, including in-route comparison of `uniform-time` and `uniform-events`, with a clear extension point for future methods (for example STKDE/KDE).
**Depends on:** Phase 52
**Plans:** 2/2 plans complete

Plans:
- [x] 53-01-PLAN.md — Build a focused `/timeslicing-algos` route shell for algorithm + timeline testing with both mode controls and a future-friendly algorithm selector contract (no full-auto workflow UI)
- [x] 53-02-PLAN.md — Wire and test centralized route-to-binning resolution with `/timeslicing-algos` override support for both modes

### Phase 57: Context-aware timeslicing core

**Goal:** Add a deterministic context-diagnostics core (temporal + spatial) and surface compact, explainable dynamic profile insights in timeslicing/timeslicing-algos without changing generation ranking behavior.
**Depends on:** Phase 56
**Plans:** 5/5 plans complete

Plans:
- [x] 57-01-PLAN.md — Build deterministic temporal/spatial diagnostics engine with dynamic profile + comparison contracts
- [x] 57-02-PLAN.md — Integrate diagnostics output into suggestion generation metadata persistence
- [x] 57-03-PLAN.md — Surface compact diagnostics UI with collapsed comparison, confidence toggle, and partial-failure notices
- [x] 57-04-PLAN.md — Make `/timeslicing-algos` strategy-comparison effects explicit and human-verifiable in default diagnostics
- [x] 57-05-PLAN.md — Add deterministic per-bin characterization labels in `/timeslicing-algos` details while preserving comparison-first default readability

### Phase 58: Neighbourhood data enrichment

**Goal:** Add neighbourhood context enrichment to timeslicing by fetching Points of Interest (POI) data from OpenStreetMap and Chicago Open Data Portal.
**Depends on:** Phase 57
**Plans:** 3/3 plans complete

Plans:
- [x] 58-01-PLAN.md — Build neighbourhood lib module with OSM Overpass API client, Chicago Data Portal client, and summary builder
- [x] 58-02-PLAN.md — Create /api/neighbourhood/poi server-side route with caching and integrate neighbourhood into context diagnostics
- [x] 58-03-PLAN.md — Add neighbourhood diagnostics panel to /timeslicing-algos with compact/expandable UI

### Phase 59: Stats page for neighborhoods

**Goal:** Create a dedicated `/stats` route for neighborhood crime statistics with district-level breakdowns.
**Depends on:** Phase 58
**Plans:** 3/3 plans complete

Plans:
- [x] 59-01-PLAN.md — Create stats route shell, district selector, aggregation helpers, and useNeighborhoodStats hook
- [x] 59-02-PLAN.md — Add crime type breakdown charts, temporal heatmap/trend, and overview stat cards
- [x] 59-03-PLAN.md — Add spatial hotspot map, neighbourhood context cards, and finalize responsive dashboard layout

---

## Phase Details (Previous Tech Debt)

### Phase 54: Adaptive timeslicing with verbose diagnostics (partial)

**Goal:** Extend `/timeslicing-algos` to include adaptive timeslicing mode and add explicit route-level diagnostics.
**Depends on:** Phase 53
**Plans:** 5/9 complete (tech debt on 54-02, 54-03, 54-06, 54-08)

> **Tech Debt Note**: Plans 54-02, 54-03, 54-06, and 54-08 were not executed. They remain as known tech debt and can be revisited as future refinements. Phase 57 delivered the diagnostics infrastructure that superseded 54-02. Phases 55 and 56 can proceed independently.

### Phase 55: STKDE exploration route

**Goal:** Provide a dedicated STKDE exploration surface for QA to inspect spatial-temporal hotspots.
**Depends on:** Phase 54
**Plans:** 2/2 complete

### Phase 56: Variable sampling API

**Goal:** Introduce intent-aware variable sampling for `/api/crimes/range`.
**Depends on:** Phase 54
**Plans:** 0/3 planned

---

*Last updated: 2026-03-26 after aligning all v3.0 work to dashboard-v2 as the single unified route*

*For milestone history, see `.planning/MILESTONES.md`*
