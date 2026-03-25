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

## v3.0 Phases (Derived from Requirements)

### Phase 61: Dynamic Rule-Based Binning System ✓ Complete

**Goal:** Users can create, modify, and manage time bins using 13 strategies with full CRUD operations and constraint validation.
**Depends on:** Phase 58
**Requirements:** BIN-01, BIN-02, BIN-03, BIN-04, BIN-05, BIN-06, BIN-07, BIN-08 (8 requirements)
**Success Criteria** (what must be TRUE):
1. User can select from 13 binning strategies (daytime-heavy, nighttime-heavy, crime-type-specific, burstiness, uniform-distribution, uniform-time, weekday-weekend, quarter-hourly, hourly, daily, weekly, custom, auto-adaptive).
2. User can merge adjacent bins into a single bin.
3. User can split a bin at midpoint or custom timestamp.
4. User can delete individual bins.
5. User can resize bins by adjusting start/end times.
6. User can save and load binning configurations.
7. User can undo and reset binning changes.
8. Constraints prevent invalid configurations (minEvents, maxEvents, maxBins, contiguous requirement).
**Plans:** 1 plan

Plans:
- [x] 61-01-PLAN.md — Build binning types, rules, engine, and store operations

---

### Phase 62: User-Driven Timeslicing (Manual Mode)

**Goal:** Users can create and manage time slices manually with precision controls, clearly distinguished from auto modes.
**Depends on:** Phase 61
**Requirements:** MANU-01, MANU-02, MANU-03, MANU-04, MANU-05, MANU-06 (6 requirements)
**Success Criteria** (what must be TRUE):
1. User can manually create time slices by dragging on the timeline.
2. User can adjust slice boundaries with precision controls (numeric input, snap options).
3. User can preview slice effects before applying changes.
4. User can delete individual slices.
5. User can reorder slices in the slice list.
6. Manual mode is visually and functionally distinguished from auto modes.
**Plans:** 1 plan

Plans:
- [x] 62-01-PLAN.md — Extend timeslicing mode store, build toolbar and manual editor

---

### Phase 63: Map Visualization

**Goal:** Time slices are visible on the 2D map with cross-view synchronization and spatial filter integration.
**Depends on:** Phase 62
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. Time slices are rendered as visible overlays on the 2D map view.
2. Slice boundaries are clearly rendered with distinct visual markers.
3. Cross-view sync works: selecting a slice on the map highlights the corresponding slice in timeline and cube views.
4. Map supports current zoom/pan levels without performance degradation.
5. Spatial filters integrate with slice selection.
**Plans:** 1 plan

Plans:
- [ ] 63-01-PLAN.md — Add slice visualization to map, implement cross-view sync, optimize performance

---

### Phase 64: Dashboard Redesign

**Goal:** Unified dashboard with all timeslicing controls integrated into a cohesive control panel.
**Depends on:** Phase 63
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. Unified control panel provides access to all timeslicing operations.
2. Current binning strategy and status are prominently visible.
3. Active slices are displayed with quick action buttons.
4. Workflow status (manual/auto) is clearly indicated in the UI.
5. Quick access controls allow switching between modes.
**Plans:** 1 plan

Plans:
- [ ] 64-01-PLAN.md — Build DashboardHeader, update dashboard layout, add layout store, wire cross-panel sync

---

### Phase 65: STKDE Integration

**Goal:** Spatiotemporal kernel density estimation overlay with hotspot detection and toggle between visualizations.
**Depends on:** Phase 64
**Requirements:** STKD-01, STKD-02, STKD-03, STKD-04, STKD-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. Kernel density estimation overlay can be toggled on/off.
2. Hotspot detection panel displays high-density areas with intensity scores.
3. Chicago heatmap integration functions correctly in the dashboard.
4. STKDE results are visible in the 3D cube view.
5. User can toggle between standard and STKDE visualization modes.
**Plans:** 1 plan

Plans:
- [ ] 65-01-PLAN.md — Extend STKDE store, implement heatmap layer, create STKDE route, connect to dashboard

---

### Phase 66: Full Integration and Testing

**Goal:** All pieces connected and verified—end-to-end workflows function correctly across routes.
**Depends on:** Phase 65
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05 (5 requirements)
**Success Criteria** (what must be TRUE):
1. End-to-end workflow tests pass for all major user journeys.
2. Cross-route navigation works correctly (/timeslicing, /timeslicing-algos, /stkde, /stats).
3. State persists correctly across route changes.
4. Performance benchmarks meet targets (load times, interaction response, compute latency).
5. Edge cases are handled gracefully (empty states, error boundaries, fallback states).
**Plans:** 1 plan

Plans:
- [ ] 66-01-PLAN.md — Verify all routes, implement cross-route state sync, add feature flags, write integration tests

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
| 63 | v3.0 | 0/1 | Planned | - |
| 64 | v3.0 | 0/1 | Planned | - |
| 65 | v3.0 | 0/1 | Planned | - |
| 66 | v3.0 | 0/1 | Planned | - |

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

*For milestone history, see `.planning/MILESTONES.md`*
