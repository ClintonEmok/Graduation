# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

v3.2 levels up the visualization quality of the `dashboard-demo` experience by tightening the rendering foundation, restoring spatial legibility, and adding interpolation- and aging-driven temporal motion only inside the demo 3D STKDE widget. The next milestone, v3.4, makes burstiness the primary adaptive signal while preserving density as a configurable fallback and keeping the detail timeline histogram-based.

## Milestones

- ✅ **v3.1 Workflow Finalization** — Phases 72-75, complete
- ✅ **v3.2 Visualization Level Up** — Phases 76-78, complete
- 🚧 **v3.4 Burstiness-First Adaptive Timeline** — Phases 83-85, current milestone
- 📋 **Future milestones** — Study & Evaluation follow-ups, POI map work, memory-pressure cleanup

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
- [x] 79-02-PLAN.md — 3D slice interaction: select, resize, create (applied slices only) (ADP-03, ADP-04)
- [x] 79-03-PLAN.md — Warp weight, delete, timeline density strip, cross-view verification (ADP-05, ADP-06)

## Progress

| Phase | Milestone | Status | Requirements | Success Criteria |
|-------|-----------|--------|--------------|------------------|
| 76. Foundation Cleanup + Motion Scaffolding | v3.2 | Complete | 7 | 4 |
| 77. Volumetric Duration + Depth Encoding | v3.2 | Complete | 6 | 5 |
| 78. Temporal Evolution (Demo 3D STKDE Widget Only) | v3.2 | Complete | 4 | 4 |
| **79. Adaptive 3D Visualization + Interactive Slices** | **v3.3** | **Complete (2026-06-19)** | **6** | **6** |
| 80. Evaluation readiness — prepare dashboard-demo prototype for user study to answer RQ1-RQ4 | v3.3 | In progress | 8 | 3 |
| 81. Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads | v3.3 | Planned | TBD | 3 |
| 82. add poi to 2d map on dashboard demo | v3.3 | Planned | TBD | 0 |
| 83. Burstiness Signal Contract + Density Fallback | v3.4 | Planned | 3 | 4 |
| 84. Histogram Timeline Warping | v3.4 | Planned | 3 | 4 |
| 85. Burst Onset + Ramp-Up Readability | v3.4 | Planned | 4 | 4 |

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

### Phase 82: add poi to 2d map on dashboard demo

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 81
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 82 to break down)

### Phase 83: Burstiness Signal Contract + Density Fallback

**Goal:** Adaptive scaling is burstiness-first under the hood, but density remains selectable as a toggleable/parameterized fallback without breaking the existing adaptive pipeline.
**Depends on**: Existing adaptive store/warp pipeline and burst taxonomy outputs
**Requirements**: BFT-01, BFT-02, BFT-03
**Plans**: 2 plans

Success criteria:

1. Users can switch the adaptive driver between burstiness and density without changing the surrounding timeline workflow.
2. Density mode remains available as an explicit fallback/compare option, not removed or hardwired away.
3. The overview frame stays visually stable when adaptive settings change.
4. The active signal source is visible/inspectable so analysts know what is driving spacing.

Plans:

- [ ] 83-01-PLAN.md — Define the burstiness/density adaptive signal contract (BFT-01, BFT-02)
- [ ] 83-02-PLAN.md — Wire the parameterized fallback into the shared warp pipeline (BFT-03)

### Phase 84: Histogram Timeline Warping

**Goal:** The detail timeline continues to read as a histogram, with adaptive time expressed through spacing and aggregation changes.
**Depends on**: Phase 83
**Requirements**: BFT-04, BFT-05, BFT-06
**Plans**: 2 plans

Success criteria:

1. The detail timeline still renders as bins/bars in both linear and adaptive modes.
2. Adaptive mode changes the spacing/width of bins rather than switching the view into a point-cloud or scatter style.
3. Bursty intervals become more legible through redistribution of horizontal space, not through a different visualization type.
4. Users can compare event concentration before and after warping without losing histogram structure.

Plans:

- [ ] 84-01-PLAN.md — Keep detail rendering histogram-based in both modes (BFT-04, BFT-05)
- [ ] 84-02-PLAN.md — Tune bin spacing and aggregation behavior for bursty windows (BFT-06)

### Phase 85: Burst Onset + Ramp-Up Readability

**Goal:** Analysts can answer “when did it start?” by reading onset and ramp-up cues directly in the detail view.
**Depends on**: Phase 84
**Requirements**: BFT-07, BFT-08, BFT-09, BFT-10, BFT-11, BFT-12
**Plans**: 2 plans

Success criteria:

1. The detail view highlights burst starts clearly enough to identify onset without switching panels.
2. Ramp-up cues make it obvious whether activity is building, peaking, or fading.
3. The overview remains a stable reference frame while the detail view carries the adaptive emphasis.
4. Selecting a burst keeps its temporal context visible across the synchronized timeline views.

Plans:

- [ ] 85-01-PLAN.md — Add onset and ramp-up cues to the detail timeline (BFT-07, BFT-08, BFT-09)
- [ ] 85-02-PLAN.md — Add toggle/compare controls and validation coverage for burstiness vs density (BFT-10, BFT-11, BFT-12)
