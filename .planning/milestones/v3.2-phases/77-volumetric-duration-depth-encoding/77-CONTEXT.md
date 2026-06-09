# Phase 77: Volumetric Duration + Depth Encoding - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is exclusively about making slice duration read as volume/depth inside the demo 3D STKDE widget.

It does **not** expand camera constraints, general spatial orientation, map behavior, timeline animation, or burst-visibility work. The only intended visual change is duration-to-volume encoding in the demo 3D widget path.

</domain>

<decisions>
## Implementation Decisions

### Duration encoding scope
- **D-01:** Slice duration is the source of truth for volume magnitude. The encoding should be derived from each slice’s start/end span, not from burst score or crime count.
- **D-02:** The visible duration range must be normalized against the currently rendered slice set so the same duration reads consistently across different windows and slice counts.
- **D-03:** Volumetric depth is a rendering concern for `StkdeSliceStack`, not a separate map/timeline concern.
- **D-04:** Readability wins over literal scale. If duration overlap makes the stack too flat or too crowded, the fix should be falloff, layering, or spacing rather than camera changes.

### State ownership
- **D-05:** Reuse the consolidated dashboard-demo coordination store for volume settings instead of introducing a second coordination channel, unless a later implementation proves the store is becoming unmanageable.
- **D-06:** The volume settings need to cover scale, exaggeration, and normalization mode so the demo widget can stay synchronized with Inspect/3D interactions.

### Planning split
- **D-07:** VOL-02 and VOL-06 belong together as the foundation plan because normalization and state ownership are prerequisites for rendering.
- **D-08:** VOL-01, VOL-03, VOL-04, and VOL-05 belong together as the widget-rendering plan because they all affect the same slice-stack geometry, overlap handling, and active-slice emphasis.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — canonical phase 77 goal, plan list, and success criteria.
- `.planning/REQUIREMENTS.md` — VOL-01 through VOL-06 are the source-of-truth requirements.
- `.planning/STATE.md` — current milestone context and store-consolidation decision history.

### Demo 3D widget path
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — computes ordered/count slices and already manages active-index synchronization.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — top-level 3D scene wrapper for the widget.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — current flat CanvasTexture plane stack that needs volumetric depth cues.
- `src/store/useDashboardDemoCoordinationStore.ts` — shared coordination state available after phase 76.

### Reference pattern for derived thickness
- `src/components/viz/Trajectory.tsx` — existing derived-thickness logic based on time gaps; useful as a conceptual pattern only.

</canonical_refs>

<specifics>
## Specific Ideas

- `Demo3dSpatialView` already has the right slice ordering and `activeIndex` guard logic, so the phase should reuse that flow instead of introducing a second selection source.
- The current `StkdeSliceStack` behavior is flat and label-first; the phase should add depth cues without breaking the existing labels, textures, or active-ring affordances.
- The duration-volume model should stay deterministic for the same slice set so Inspect/3D interactions do not cause the widget to visually drift.

</specifics>

<assumptions>
## Assumptions

- Slice duration means `endEpoch - startEpoch` in seconds.
- Normalization should only consider slices currently being rendered in the demo widget.
- The active slice should stay visually dominant through depth cues and opacity/falloff, not through camera overrides.

</assumptions>

---

*Phase: 77-volumetric-duration-depth-encoding*
*Context gathered: 2026-05-26*
