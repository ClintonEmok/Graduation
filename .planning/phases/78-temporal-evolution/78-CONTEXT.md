# Phase 78: Temporal Evolution (Demo 3D STKDE Widget Only) - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is exclusively about temporal evolution inside the demo 3D STKDE widget path: slice sequencing, interpolation, aging trails, and playback feedback.

It does **not** expand map animation, timeline animation, camera-orientation policy, or any non-demo route. The only intended work surface is the demo 3D widget chain.

</domain>

<decisions>
## Implementation Decisions

### State ownership
- **D-01:** Reuse the existing `useDashboardDemoCoordinationStore` for temporal state instead of creating a second animation store.
- **D-02:** Playback should continue to step `activeSliceIndex` through the demo’s ordered slice list; the 3D widget remains the source of temporal motion, not the map or timeline.

### Playback behavior
- **D-03:** Playback is continuous and loops through the ordered slice set while enabled.
- **D-04:** The temporal clock stays discrete at the slice level; do not introduce frame-level route animation or timeline playheads.

### Interpolation policy
- **D-05:** Smooth interpolation is opt-in and must be clearly labeled as estimated/interpolated.
- **D-06:** Discrete slice changes remain the default analytical mode.

### Aging trails
- **D-07:** Aging trails should be implemented as slice-distance decay / persistence inside the 3D widget, not as a separate map effect or post-processing pass.
- **D-08:** Trail visibility should preserve the active slice as the dominant reference and keep older slices readable but subdued.

### Scene boundary
- **D-09:** `Stkde3DScene` owns scene wiring only; do not add another camera controller or alter the established camera policy.
- **D-10:** `StkdeSliceStack` owns the visual temporal effects for the slices; `SliceScrubber` owns slice-step feedback and controls.

### Phase split
- **D-11:** Keep the temporal controls and visuals tied to the same ordered slice list produced by `Demo3dSpatialView` so playback and interpolation do not drift out of sync.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — phase 78 goal, scope boundary, and success criteria.
- `.planning/REQUIREMENTS.md` — TME-01 through TME-04.
- `.planning/STATE.md` — milestone state and phase completion history.

### Scope boundary
- `.planning/codebase/STKDE_TEMPORAL_SCOPE.md` — exact file boundary for this phase.

### Demo 3D widget path
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — orchestration layer and ordered slice list.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — 3D scene wrapper and pass-through layer.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — slice rendering, opacity, and temporal visuals.
- `src/app/stkde-3d/components/SliceScrubber.tsx` — slice stepping and playback UI.

### Preceding foundation
- `.planning/phases/77-volumetric-duration-depth-encoding/77-CONTEXT.md` — duration-to-volume encoding already established.
- `.planning/phases/76-foundation-cleanup-motion-scaffolding/76-CONTEXT.md` — motion scaffolding and animation boundary decisions.

</canonical_refs>

<specifics>
## Specific Ideas

- `Demo3dSpatialView` already produces the ordered slice list; temporal motion should reuse that order rather than recompute a second sequence.
- The current demo 3D widget should feel sequenced and continuous, but still preserve the analytical jump-cut as the default mental model.
- Aging and interpolation are visual layers on top of the existing slice system; they should not change the underlying slice data model.

</specifics>

<assumptions>
## Assumptions

- Slice playback advances one rendered slice at a time.
- Interpolation blends only between neighboring slices.
- Trail decay is driven by slice distance / recent history, not by map or timeline frames.

</assumptions>

<deferred>
## Deferred Ideas

- Any map or timeline animation remains out of scope.
- Multi-scale temporal aggregation belongs to a later milestone.
- Evaluation logging / playback analytics are out of scope for this phase.

</deferred>

---

*Phase: 78-temporal-evolution*
*Context gathered: 2026-05-31*
