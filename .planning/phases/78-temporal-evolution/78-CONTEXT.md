# Phase 78: Temporal Evolution (Demo 3D STKDE Widget Only) - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is exclusively about temporal evolution inside the demo 3D STKDE widget path: slice sequencing, playback, interpolation, and aging trails.

It does **not** expand map animation, timeline animation, camera-orientation policy, or any non-demo route. The only intended work surface is the demo 3D widget chain.

</domain>

<decisions>
## Implementation Decisions

### State ownership
- **D-01:** Reuse the existing `useDashboardDemoCoordinationStore` for temporal state instead of creating a second animation store.
- **D-02:** Playback should continue to step `activeSliceIndex` through the demo’s ordered slice list; the 3D widget remains the source of temporal motion, not the map or timeline.

### Playback behavior
- **D-03:** Playback speed is adjustable with a slider rather than fixed.
- **D-04:** Scrubbing pauses playback while the user is dragging.
- **D-05:** Loop restarts use a brief pause at the end of the ordered slice list rather than an instant wrap.
- **D-06:** Playback feedback stays minimal: active slice only, no extra progress bar chrome.

### Interpolation presentation
- **D-07:** Smooth interpolation is opt-in and only available during playback.
- **D-08:** The interpolation mode label must read `Interpolated`.
- **D-09:** Interpolation uses morph + crossfade between neighboring slices.
- **D-10:** The active slice remains the anchor while neighbors blend around it during interpolation.

### Aging trails
- **D-11:** Aging trails should be implemented as ghosted layers with short-lived persistence, not as a separate map effect or post-processing pass.
- **D-12:** Trail controls live in the Inspect panel with the other temporal controls.
- **D-13:** The control surface should stay compact and quiet rather than becoming a prominent tool strip.
- **D-14:** Exact decay curve, trail length, and slider range are left to planning discretion as long as the result stays readable and subdued.

### Scene boundary
- **D-15:** `Stkde3DScene` owns scene wiring only; do not add another camera controller or alter the established camera policy.
- **D-16:** `StkdeSliceStack` owns the visual temporal effects for the slices; `SliceScrubber` owns slice-step feedback and controls.

### Planning split
- **D-17:** Keep the temporal controls and visuals tied to the same ordered slice list produced by `Demo3dSpatialView` so playback and interpolation do not drift out of sync.
- **D-18:** Grouping differs slightly from the raw requirement order: TME-01 and TME-04 are the control/state plan, while TME-02 and TME-03 are the rendering plan. Requirement numbers stay unchanged.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — canonical phase 78 goal, plan list, and success criteria.
- `.planning/REQUIREMENTS.md` — TME-01 through TME-04 are the source-of-truth requirements.
- `.planning/STATE.md` — milestone state and phase completion history.

### Scope boundary
- `.planning/codebase/STKDE_TEMPORAL_SCOPE.md` — exact file boundary for this phase.

### Demo 3D widget path
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — orchestration layer and ordered slice list.
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — 3D scene wrapper and pass-through layer.
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — slice rendering, opacity, and temporal visuals.
- `src/app/stkde-3d/components/SliceScrubber.tsx` — slice stepping and playback UI.

### Motion helpers and duration encoding
- `src/lib/motion/aging.ts` — aging opacity / trail intensity helpers for temporal decay.
- `src/lib/motion/easing.ts` — easing and interpolation helpers used by motion and crossfade behavior.
- `src/app/stkde-3d/lib/volume-encoding.ts` — duration-volume profile already established in Phase 77.

</canonical_refs>

<specifics>
## Specific Ideas

- `Demo3dSpatialView` already produces the ordered slice list; temporal motion should reuse that order rather than recompute a second sequence.
- The current demo 3D widget should feel sequenced and continuous, but still preserve the analytical jump-cut as the default mental model.
- The trail style was checked against literature and should read as ghosted layers with bounded persistence, not shadow-like effects.
- Aging and interpolation are visual layers on top of the existing slice system; they should not change the underlying slice data model.

</specifics>

<assumptions>
## Assumptions

- Slice duration means `endEpoch - startEpoch` in seconds.
- Normalization should only consider slices currently being rendered in the demo widget.
- The active slice should stay visually dominant through depth cues and opacity/falloff, not through camera overrides.

</assumptions>

---

*Phase: 78-temporal-evolution*
*Context gathered: 2026-06-01*
