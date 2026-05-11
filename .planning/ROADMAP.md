# Roadmap: Adaptive Space-Time Cube Prototype — v3.0

## Overview

Milestone **v3.0 — Burstiness-Driven Adaptive Slicing** delivers the core adaptive time
mechanism the prototype was designed for. Equal-width temporal bins become non-uniform —
proportional to burstiness scores — so the timeline expands around dense/spiky intervals
and compresses quiet periods. The same bins render as 3D slice planes with KDE heatmaps,
creating a unified burst-aware spatiotemporal view.

**Current focus:** v3.0 milestone

## Milestones

- ✅ **v1.0** Thesis Prototype — Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1** Manual Timeslicing — Phases 26-33 (shipped 2026-02-22)
- ✅ **v1.2** Semi-Automated Timeslicing Workflows — Phases 34-39 (shipped 2026-03-02)
- ✅ **v1.3** Fully Automated Timeslicing Workflows — Phases 40-42 (shipped 2026-03-04)
- ✅ **v2.0** 3D Timeline-Test Parity — Phases 43-45 (shipped 2026-03-06)
- ✅ **v2.1** Refactoring and Decomposition — Phases 46-51 (shipped 2026-03-10)
- ✅ **v2.2** Timeslicing Fidelity — Phases 52-53 (shipped 2026-03-11)
- ✅ **v2.3** Adaptive Timeslicing Algos Hardening — Phase 54 (shipped with tech debt)
- ✅ **v2.4** STKDE Exploration Surface — Phase 55 (shipped 2026-03-16)
- ✅ **v2.5** Stats Dashboard + Neighbourhood Diagnostics — Phases 57-59 (shipped 2026-03-23)
- ✅ **MVP Finale** Phases 01-06 (completed 2026-05-07)
  - 01: Store sync + slice planes
  - 02: 3D STKDE on cube planes
  - 03: Adjacent slice comparison + burst evolution
  - 04: Evolution view with playback
  - 05: DBSCAN clustering
  - 06: Category encoding
- 📋 **v3.0 Burstiness-Driven Adaptive Slicing** — Current milestone

## v3.0 Phases

### Phase 1: Burstiness Engine

**Goal:** Compute burstiness scores per time bin and allocate slices non-uniformly.

**Depends on:** Nothing (new API + lib)

**Requirements:** BURST-01, BURST-02, BURST-03, BURST-04

| ID | Requirement | Notes |
|----|-------------|-------|
| BURST-01 | Temporal B score per bin computed server-side | CV of inter-event intervals |
| BURST-02 | Spatial B score as cross-reference | 1 - meanKDE/peakKDE |
| BURST-03 | Combined B = 0.5 x temporalB + 0.5 x spatialB | Single burstiness metric |
| BURST-04 | N slices allocated across bins proportional to combined B | Non-uniform slice allocation |

**Success criteria (what must be TRUE):**
1. `/api/adaptive/bursts` returns bins with temporalB, spatialB, combinedB
2. Bursty bins get more slices than quiet bins
3. Client lib fetches and caches burst data

---

### Phase 2: UI Redesign

**Goal:** Simplify dashboard-demo by removing WorkflowSkeleton and restructuring the rail.

**Depends on:** Phase 1 (detect tab needs burst scores)

**Requirements:** UI-01, UI-02, UI-03, UI-04

| ID | Requirement | Notes |
|----|-------------|-------|
| UI-01 | Remove WorkflowSkeleton from the shell | ~21rem left panel eliminated |
| UI-02 | Map/3D toggle replaces Map/Cube toggle | Cleaner binary toggle |
| UI-03 | 5-tab right rail: Scan, Detect, Slices, Inspect, Configure | Consolidated rail |
| UI-04 | Auto-transition: apply slices → 3D view + Inspect tab | Implicit workflow flow |

**Success criteria (what must be TRUE):**
1. WorkflowSkeleton.tsx deleted, no regressions
2. Rail has exactly 5 tabs
3. Toggle switches between Map and 3D views
4. Applying slices in Detect automatically switches to 3D + Inspect

---

### Phase 3: STKDE-3D Port

**Goal:** Port standalone `/stkde-3d` scene into dashboard 3D view.

**Depends on:** Phase 2 (needs new shell)

**Requirements:** 3D-01, 3D-02, 3D-03

| ID | Requirement | Notes |
|----|-------------|-------|
| 3D-01 | Demo3dSpatialView renders in 3D toggle slot | R3F Canvas + MapTileSource |
| 3D-02 | Detect tab has burst controls + results table | Consolidated from stepper + slice panel |
| 3D-03 | Inspect tab has scrubber, playback, opacity | STKDE-3D sidebar controls |

**Success criteria (what must be TRUE):**
1. 3D view shows KDE heatmaps per applied slice
2. Scrubber steps through slices in 3D
3. Detect tab shows burst scores and generation controls
4. Configure tab has warp, adaptive/linear, threshold controls

---

### Phase 4: Coordination Flow

**Goal:** Extract shared KDE, clean up stores, wire auto-transition logic.

**Depends on:** Phases 1-3

**Requirements:** COORD-01, COORD-02, COORD-03

| ID | Requirement | Notes |
|----|-------------|-------|
| COORD-01 | computeSliceKde in shared lib | Both API and 3D view import from same place |
| COORD-02 | Remove workflowPhase from coordination store | No stepper phases |
| COORD-03 | Auto-transition after apply | Detect → Inspect + 3D |

**Success criteria (what must be TRUE):**
1. `src/lib/kde/compute-slice-kde.ts` exists and is imported by both API and 3D view
2. workflowPhase removed, no regressions
3. Apply action in Detect tab triggers viewport + tab switch

## Progress

| Phase | Requirements | Status |
|-------|-------------|--------|
| 1. Burstiness Engine | 4 | Not started |
| 2. UI Redesign | 4 | Not started |
| 3. STKDE-3D Port | 3 | Not started |
| 4. Coordination Flow | 3 | Not started |

## Deferred

- **Burst taxonomy labels**: Prolonged peak / isolated spike / valley classification. Temporal B provides the raw score; semantic labels can be a follow-up.
- **Full-range generation**: Using full population data instead of sampled fetches. Current API sampling is sufficient for interactive use.
- **Edit history / undo**: Manual slice editing history. Existing store snapshots provide basic undo.
