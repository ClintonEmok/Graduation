# Phase 78: Burst Visibility + Visual Consistency - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 78-burst-visibility-visual-consistency
**Areas discussed:** burst encoding model, ShaderMaterial migration, shared burst mode state, legend + confidence kernel behavior, explicit exclusions

---

## Burst encoding model

| Option | Description | Selected |
|--------|-------------|----------|
| Shared burst scale across cube and timeline | One burst intensity domain drives opacity, color intensity, and active emphasis consistently across the cube and timeline. | ✓ |
| Per-view burst scales | Each view chooses its own local burst mapping. | |
| Burst-only visual treatment | Use burst emphasis in one view and keep the others on raw density. | |

**Working direction:** Use one shared burst scale across the cube and timeline. The map stays density-only and does not encode burst; the cube uses opacity plus intensity, and the timeline uses restrained markers so the same burst score reads consistently without making every view look identical.

---

## 3D rendering path

| Option | Description | Selected |
|--------|-------------|----------|
| ShaderMaterial GPU rendering for the 3D pipeline | Replace the current Canvas2D texture path in the dashboard-demo 3D widget with GPU-backed shader rendering while keeping labels and ring overlays. | ✓ |
| Keep Canvas2D textures | Leave the existing CPU texture pipeline in place. | |
| Partial migration | Update only the active slice while leaving the rest of the stack as Canvas textures. | |

**Working direction:** Migrate the dashboard-demo 3D slice rendering to ShaderMaterial-based GPU rendering. Keep the existing HTML labels, active rings, and shell chrome intact so the change improves saliency without changing the interaction model.

---

## Shared mode state + persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Single shared burst mode in coordination state | Persist one raw-density vs burst-emphasized toggle across the cube and timeline. | ✓ |
| Local toggles per view | Let each view manage burst mode independently. | |
| Auto-switch by context | Change modes automatically based on the active panel. | |

**Working direction:** Keep one shared view mode in the dashboard-demo coordination state and bridge existing burst controls into it rather than creating competing controls. Default to raw density, with burst-emphasized mode opt-in and persistent across the cube/timeline pair.

---

## Legend + kernel behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Shared legend and confidence-scaled emphasis | One legend explains the scale; confidence adjusts burst emphasis softness/tightness where burst visualization is rendered. | ✓ |
| Separate per-view legends | Each panel explains its own scale independently. | |
| Confidence changes the underlying burst score | Recompute burst values when confidence changes. | |

**Working direction:** Add one shared legend for the burst scale and use burst confidence only to shape burst emphasis softness/tightness in the cube/timeline rendering path. Do not mutate the underlying burstScore or time-slice semantics.

---

## Explicit exclusions

- No burst-only route or separate burst workspace.
- No continuous pulsing, bloom-first treatment, or audio alerts.
- No recomputation of burstScore or new analytics semantics.
- No camera choreography or temporal-evolution work in Phase 78.
- No second coordination store for burst mode.
- No burst encoding on the map.
