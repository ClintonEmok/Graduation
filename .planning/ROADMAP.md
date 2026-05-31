# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

v3.2 levels up the visualization quality of the `dashboard-demo` experience by tightening the rendering foundation, restoring spatial legibility, making bursts immediately readable, and adding interpolation- and aging-driven temporal motion only inside the demo 3D STKDE widget. This milestone deliberately stops short of the deferred work on Multi-Scale Temporal, Dense Data Readability, and Evaluation Readiness.

## Milestones

- ✅ **v3.1 Workflow Finalization** — Phases 72-75, complete
- 🚧 **v3.2 Visualization Level Up** — Phases 76-79, current milestone
- 📋 **Future milestones** — Multi-Scale Temporal, Dense Data Readability, Evaluation Readiness

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

### Phase 78: Burst Visibility + Visual Consistency
**Goal**: Bursts are the clearest signal in the system, and that signal reads the same across cube and timeline while the map remains density-only spatial context.
**Depends on**: Phases 76-77
**Requirements**: BVS-01, BVS-02, BVS-03, BVS-04, BVS-05, BVS-06, BVS-07, BVS-08
**Success Criteria**:
  1. Bursts render with GPU-backed visual encoding instead of looking like flat CPU textures.
  2. Burstier slices are visibly more prominent through opacity and intensity differences in the cube and timeline.
  3. The same burst intensity means the same thing in the cube and timeline because the color scale and legend are shared.
  4. Users can switch between raw density and burst-emphasized modes in the cube/timeline pair, and the chosen mode persists across views.
  5. Active burst slices stand out through opacity, intensity, and fluid emphasis without changing the underlying data.

### Phase 79: Temporal Evolution (Demo 3D STKDE Widget Only)
**Goal**: Slice changes feel continuous and interpretable inside the demo 3D STKDE widget, while the map and timeline remain non-animated readers.
**Depends on**: Phases 76-78; scope is limited to `src/components/dashboard-demo/Demo3dSpatialView.tsx`, `src/app/stkde-3d/components/Stkde3DScene.tsx`, `src/app/stkde-3d/components/StkdeSliceStack.tsx`, and `src/app/stkde-3d/components/SliceScrubber.tsx`
**Requirements**: TME-01, TME-02, TME-03, TME-04
**Success Criteria**:
  1. Changing slices in the demo 3D widget feels sequenced and continuous instead of like a hard reset.
  2. Analysts can see aging trails or temporal persistence across adjacent slices inside the 3D widget.
  3. Smooth interpolation between consecutive slices is available only as an opt-in mode and is clearly labeled as estimated or interpolated.
  4. Playback, trail decay, and interpolation controls are exposed in the demo Inspect/3D widget pair and only affect the demo 3D STKDE path.

## Progress

| Phase | Milestone | Status | Requirements | Success Criteria |
|-------|-----------|--------|--------------|------------------|
| 76. Foundation Cleanup + Motion Scaffolding | v3.2 | Complete | 7 | 4 |
| 77. Volumetric Duration + Depth Encoding | v3.2 | Complete | 6 | 5 |
| 78. Burst Visibility + Visual Consistency | v3.2 | Not started | 8 | 5 |
| 79. Temporal Evolution (Demo 3D STKDE Widget Only) | v3.2 | Not started | 4 | 4 |
