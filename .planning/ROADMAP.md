# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

v3.2 levels up the visualization quality of the `dashboard-demo` experience by tightening the rendering foundation, restoring spatial legibility, and adding interpolation- and aging-driven temporal motion only inside the demo 3D STKDE widget. This milestone deliberately stops short of the deferred work on Multi-Scale Temporal, Dense Data Readability, and Evaluation Readiness.

## Milestones

- ✅ **v3.1 Workflow Finalization** — Phases 72-75, complete
- 🚧 **v3.2 Visualization Level Up** — Phases 76-78, current milestone
- 📋 **Future milestones** — Study & Evaluation, Multi-Scale Temporal, Dense Data Readability

## Phase Details

### Phase 76: Foundation Cleanup + Motion Scaffolding

**Goal**: The visualization stack is stable enough to support richer 3D and map rendering, plus fluid interpolation- and aging-driven motion, without blocking the UI or causing shader/rendering drift.
**Depends on**: Phase 75
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07
**Plans**: 5 plans
**Success Criteria**:

  1. User can open the demo with the motion scaffolding in place without breaking interaction or visibility.
  2. GPU-backed density rendering works on the map and stays responsive on large crime datasets.
  3. Large point clouds remain visually stable and navigable instead of overloading the scene with every point rendered at full cost.
  4. Cross-view controls stay synchronized through one coordination state, so filters and active selections do not drift between views.

Plans:

- [ ] 76-01-PLAN.md — Install deck.gl + GSAP dependencies (FND-02, FND-03)
- [ ] 76-02-PLAN.md — Consolidate 3 drift-prone stores into CoordinationStore (FND-04)
- [ ] 76-03-PLAN.md — Fix shader program caching + enable frustum culling/LOD (FND-06, FND-07)
- [ ] 76-04-PLAN.md — Offload KDE computation to Web Worker (FND-05)
- [ ] 76-05-PLAN.md — Build motion scaffolding primitives (FND-01)

### Phase 77: Volumetric Duration + Depth Encoding

**Goal**: Variable slice durations read as volume and depth in the 3D view so temporal extent is visible at a glance.
**Depends on**: Phase 76
**Requirements**: VOL-01, VOL-02, VOL-03, VOL-04, VOL-05, VOL-06
**Plans**: 2 plans
Plans:

- [x] 77-01-PLAN.md — Establish duration-volume state and normalization helpers (VOL-02, VOL-06)
- [x] 77-02-PLAN.md — Render duration as depth and preserve active-slice readability in the demo 3D widget (VOL-01, VOL-03, VOL-04, VOL-05)

**Success Criteria**:

  1. Slice duration is visible through volumetric thickness, height, or extrusion rather than only flat surface color.
  2. Longer and shorter durations remain distinguishable immediately, even before the user inspects labels.
  3. The volumetric encoding stays readable when slices overlap or cluster densely.
  4. Duration scaling remains normalized and consistent across different windows so the same duration means the same visual magnitude.
  5. The volume encoding stays aligned with the active slice and other 3D widget interactions without flattening the scene.

### Phase 78: Temporal Evolution (Demo 3D STKDE Widget Only)

**Goal**: Slice changes feel continuous and interpretable inside the demo 3D STKDE widget, while the map and timeline remain non-animated readers.
**Depends on**: Phases 76-77; scope is limited to `src/store/useDashboardDemoCoordinationStore.ts`, `src/components/dashboard-demo/Demo3dSpatialView.tsx`, `src/app/stkde-3d/components/Stkde3DScene.tsx`, `src/app/stkde-3d/components/StkdeSliceStack.tsx`, and `src/app/stkde-3d/components/SliceScrubber.tsx`
**Requirements**: TME-01, TME-02, TME-03, TME-04
**Plans**: 2 plans
**Success Criteria**:

  1. Changing slices in the demo 3D widget feels sequenced and continuous instead of like a hard reset.
  2. Analysts can see aging trails or temporal persistence across adjacent slices inside the 3D widget.
  3. Smooth interpolation between consecutive slices is available only as an opt-in mode and is clearly labeled as estimated or interpolated.
  4. Playback, trail decay, and interpolation controls are exposed in the demo Inspect/3D widget pair and only affect the demo 3D STKDE path.

Plans:

- [x] 78-01-PLAN.md — Playback, scrubbing, and compact temporal controls for the demo 3D widget (TME-01, TME-04)
- [x] 78-02-PLAN.md — Ghosted aging trails and interpolated slice blending in the 3D stack (TME-02, TME-03)

## Phase Details

### Phase 79: Adaptive 3D Visualization + Interactive Slices

**Goal**: The adaptive warp map is visible as a volumetric axis in the demo 3D widget, applied slices reposition based on warp density within the current viewport, and users can create/resize/delete applied slices directly in the 3D view with full cross-view sync to the timeline and Slices tab.
**Depends on**: Phase 78
**Requirements**: ADP-01, ADP-02, ADP-03, ADP-04, ADP-05, ADP-06
**Plans**: 3 plans
**Success Criteria**:

  1. The adaptive warp map renders as a colored volumetric axis behind the slice stack in the demo 3D widget.
  2. Applied slices reposition based on the warp map (variable spacing) when in adaptive mode, using the current viewport time window.
  3. Users can click to select, drag to resize, and double-click to create slices in the 3D view.
  4. Slice edits in 3D sync back to the timeline and Slices tab through shared stores.
  5. Per-slice warp weight is adjustable from the 3D view, and applied slices can be deleted.
  6. The timeline shows a density strip matching the 3D warp axis colors in adaptive mode.

Plans:

- [x] 79-01-PLAN.md — Volumetric adaptive axis + variable slice spacing (ADP-01, ADP-02)
- [ ] 79-02-PLAN.md — 3D slice interaction: select, resize, create (applied slices only) (ADP-03, ADP-04)
- [ ] 79-03-PLAN.md — Warp weight, delete, timeline density strip, cross-view verification (ADP-05, ADP-06)

## Progress

| Phase | Milestone | Status | Requirements | Success Criteria |
|-------|-----------|--------|--------------|------------------|
| 76. Foundation Cleanup + Motion Scaffolding | v3.2 | Complete | 7 | 4 |
| 77. Volumetric Duration + Depth Encoding | v3.2 | Complete | 6 | 5 |
| 78. Temporal Evolution (Demo 3D STKDE Widget Only) | v3.2 | Complete | 4 | 4 |
| **79. Adaptive 3D Visualization + Interactive Slices** | **v3.3** | **In progress** | **6** | **6** |

### Phase 80: Evaluation readiness — prepare dashboard-demo prototype for user study to answer RQ1-RQ4

**Goal:** The `dashboard-demo` prototype can run as a controlled within-subjects evaluation route with explicit counterbalanced participant order, locked participant-facing controls, researcher-only warp adjustment, in-app task/questionnaire flow, structured DuckDB logging, and audited session reset between participants.
**Requirements**: D-01, D-03, D-07, D-10, D-12, D-14, D-15, D-16
**Depends on:** Phase 79
**Plans:** 3 plans

Plans:

- [ ] 80-01-PLAN.md — Protocol/order contract, audited reset checklist, and structured DuckDB persistence
- [ ] 80-02-PLAN.md — `/evaluation` shell, header stepper, training tour, task card, and questionnaires
- [ ] 80-03-PLAN.md — Dashboard-demo evaluation locks, researcher-only warp controls, and end-to-end pilot verification

### Phase 81: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads

**Goal:** Dashboard startup stays summary-first and low-memory by serving overview/meta from persisted DuckDB summary tables, while exact detail loads only after explicit user narrowing through a paged working-window contract.
**Requirements**: TBD
**Depends on:** Phase 80
**Plans:** 3 plans

Plans:

- [ ] 81-01-PLAN.md — Persist DuckDB fact/summary tables and cut `/api/crime/meta` + `/api/crime/overview` over to them
- [ ] 81-02-PLAN.md — Audit dashboard `useTimelineDataStore` consumers and enforce summary-first preview-safe startup
- [ ] 81-03-PLAN.md — Rebuild `/api/crimes/range` as exact paged detail and migrate active-slice-first consumers
