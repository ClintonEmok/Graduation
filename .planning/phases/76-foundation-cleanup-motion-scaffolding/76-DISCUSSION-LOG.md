# Phase 76: Foundation Cleanup + Motion Scaffolding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 76-foundation-cleanup-motion-scaffolding
**Areas discussed:** deck.gl for map heatmap, GSAP scope, motion scaffolding primitives, performance priorities

---

## deck.gl for map heatmap

| Option | Description | Selected |
|--------|-------------|----------|
| Install deck.gl aggregation layers | GPU-bound heatmap density via deck.gl + MapboxOverlay. ~48KB gzip. Replaces CPU-bound MapLibre built-in heatmap. | ✓ |
| Keep MapLibre built-in heatmap | No new deps. CPU-bound rendering works at current scale but bottlenecks at higher density. | |

**User's choice:** Auto-selected recommended (deck.gl install)
**Notes:** Research validated deck.gl as the right GPU density tool for the map. MapLibre's CPU-bound heatmap would bottleneck at scale. Integration via MapboxOverlay keeps existing MapLibre layers intact.

---

## GSAP scope for animation

| Option | Description | Selected |
|--------|-------------|----------|
| Camera fly-throughs + transition sequences only | GSAP drives macroscopic sequencing (fly camera A→B, pause, advance). Per-frame updates stay in R3F render loop. | ✓ |
| Also drive slice opacity/interpolation | GSAP handles all animation including per-frame micro-updates. Risks React reconciliation conflicts. | |

**User's choice:** Auto-selected recommended (scoped to camera/transitions)
**Notes:** User earlier expressed interest in GSAP but wanted it scoped to meaningful sequencing, not per-frame micro-management. Three.js/useFrame is the right tool for per-frame slice updates. GSAP provides the timeline sequencing and easing that R3F doesn't natively offer.

---

## Motion scaffolding primitives

| Option | Description | Selected |
|--------|-------------|----------|
| Interpolation pipeline + aging trails + transition sequencing | Three shared primitives: easing/lerp helpers, opacity fade by temporal distance, GSAP camera sequences. All in 3D widget path only. | ✓ |
| Only interpolation pipeline | Minimal scaffolding — just easing helpers. Aging and transitions handled ad-hoc in Phase 79. | |
| Full animation framework | Comprehensive animation system with configurable presets, timeline editor, keyframe management. Over-engineered for the prototype. | |

**User's choice:** Auto-selected recommended (three primitives)
**Notes:** The three primitives map directly to Phase 79's requirements: TME-01 (transition sequencing), TME-02 (aging trails), TME-03 (interpolation). Building them in Phase 76 means Phase 79 wires them, not invents them.

---

## Performance priorities

| Option | Description | Selected |
|--------|-------------|----------|
| 30fps stable with 8 slices + priority order (KDE→culling→shaders) | Concrete target with ordered priorities. KDE worker highest impact (blocks main thread today). | ✓ |
| 60fps target for all interactions | Ambitious but unrealistic with 8.5M points. Would force aggressive LOD that hurts analytical clarity. | |
| No specific target — "as fast as possible" | No measurable success criterion. Hard to verify completion. | |

**User's choice:** Auto-selected recommended (30fps, ordered priorities)
**Notes:** 30fps is a realistic analytical target (distinct from 60fps interaction target). The priority order matches the research findings: KDE blocks the UI today on main thread computeSliceKde(), frustum culling wastes GPU on hidden points, shader recompilation causes frame spikes on slice change.

---

## the Agent's Discretion

- Store consolidation: which stores to merge and final store count
- KDE worker architecture: transferable buffer patterns, worker pool size
- Shader caching mechanism: uniform-based variants vs other strategies
- LOD strategy: which geometry levels for 8.5M point cloud
- Exact easing functions and lerp implementations for motion scaffolding

## Deferred Ideas

None
