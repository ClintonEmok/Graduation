# Phase 78: Burst Visibility + Visual Consistency - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is exclusively about making burst intensity the clearest signal in the dashboard-demo system and keeping that signal visually consistent across the cube and timeline while the map remains density-only spatial context.

It does **not** introduce a new route, a new analytics pipeline, camera choreography, or the temporal-evolution work reserved for Phase 79. The phase stays centered on burst visibility, shared visual encoding, and consistent legend/state behavior.

</domain>

<decisions>
## Implementation Decisions

### Burst encoding model
- **BVS-01/BVS-02/BVS-03:** Treat `burstScore` as the common visual source of truth across the dashboard-demo cube and timeline. The shared domain should drive opacity and intensity consistently, while the map stays density-only and does not encode burst.
- **BVS-05:** Active burst emphasis should stay static and motion-safe: opacity, intensity, and subtle highlight cues are enough. Avoid continuous pulsing or glow-first treatment.

### Rendering path
- **BVS-01:** Migrate the dashboard-demo 3D slice rendering away from Canvas2D texture generation and toward GPU-backed `ShaderMaterial` rendering. Keep labels, rings, and shell chrome intact.
- **BVS-08:** Use burst confidence only to shape heat-kernel softness/tightness where heatmap-style rendering is used. Confidence should not rewrite `burstScore` or alter slice ordering.

### Shared state and consistency
- **BVS-04/BVS-06/BVS-07:** Use one shared burst mode and one shared legend across the cube/timeline pair. The dashboard-demo coordination state should own the persisted raw-density vs burst-emphasized mode, with existing burst controls bridged into it rather than duplicated.
- **BVS-04:** Shared color scale/domain should remain stable across the cube and timeline so the same burst score means the same thing everywhere.

### Exclusions
- **BVS-05/BVS-06:** Do not add a burst-only view, a second coordination store, or continuous pulse animations.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — canonical Phase 78 goal, plan list, and success criteria.
- `.planning/REQUIREMENTS.md` — BVS-01 through BVS-08 are the source-of-truth requirements.
- `.planning/STATE.md` — current milestone context and phase continuity.

### Current implementation touchpoints
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — current CanvasTexture-driven slice stack that Phase 78 should rework.
- `src/components/map/MapVisualization.tsx` — current map density pipeline and legacy burst-related controls that should stay out of Phase 78 burst encoding.
- `src/components/map/MapEventLayer.tsx` — burst vs type color mode handling that is excluded from Phase 78 burst encoding.
- `src/components/timeline/DemoDualTimeline.tsx` — current burst annotations and shared selection flow.
- `src/store/useDashboardDemoCoordinationStore.ts` — shared dashboard-demo coordination state available for persisted burst mode settings.
- `src/store/useAdaptiveStore.ts` — existing adaptive burst metric state that the map currently reads from, kept out of Phase 78 burst encoding.

### Research references
- `.planning/research/FEATURES.md` — burst visibility and visual consistency heuristics.
- `.planning/research/SUMMARY.md` — cross-objective guidance for burst visibility and visual consistency.

</canonical_refs>

<specifics>
## Specific Ideas

- The cube should keep its active slice legible while making bursty slices visibly more prominent through opacity/intensity rather than extra geometry or camera changes.
- The timeline should remain a comparison surface, not a second heatmap; it should use the same burst scale with lighter emphasis.
- The cube and timeline should feel like two renderings of the same underlying burst scale, while the map stays spatial context only.

</specifics>

<assumptions>
## Assumptions

- `burstScore` remains normalized and stable across the demo pipeline.
- `burstConfidence` is a styling input, not a new analytical score.
- The shared burst mode should default to raw density for safety and comparability.

</assumptions>

---

*Phase: 78-burst-visibility-visual-consistency*
*Context gathered: 2026-05-31*
