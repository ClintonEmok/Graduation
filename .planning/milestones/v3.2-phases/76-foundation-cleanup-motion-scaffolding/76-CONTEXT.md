# Phase 76: Foundation Cleanup + Motion Scaffolding - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the rendering foundation and motion primitives that enable Phases 77-79. It installs the remaining visualization stack dependencies (deck.gl, GSAP), consolidates drift-prone stores, fixes known performance bottlenecks (KDE offload, shader caching, frustum culling), and builds the motion scaffolding that Phase 79's interpolation and aging will use — all scoped to the demo 3D STKDE widget path only.

</domain>

<decisions>
## Implementation Decisions

### deck.gl for GPU map heatmap
- **D-01:** Install and configure `deck.gl` with `@deck.gl/aggregation-layers` and `@deck.gl/mapbox`. GPU-bound density rendering is worth the ~48KB gzip cost. MapLibre's built-in heatmap is CPU-bound and would bottleneck at scale.
- **D-02:** Integrate via MapboxOverlay so deck.gl layers render interleaved with MapLibre layers. Do not replace MapLibre — augment it.

### GSAP scope for animation
- **D-03:** Install GSAP, scoped to camera fly-throughs and transition sequencing only. Do NOT use GSAP for per-frame slice opacity or interpolation — those stay in ShaderMaterial uniforms via `useFrame`.
- **D-04:** GSAP handles macroscopic sequencing: fly camera from active slice A to slice B, pause, then advance. Three.js/render loop handles per-frame micro-updates.

### Motion scaffolding primitives (FND-01)
- **D-05:** Build three shared motion primitives for the 3D widget path:
  1. Interpolation pipeline — shared easing helpers and lerp primitives for smooth slice-to-slice transitions
  2. Aging/opacity trails — fade non-active slices based on temporal distance from the active slice index
  3. Transition sequencing — GSAP-driven camera fly-throughs between slices
- **D-06:** All motion primitives live in the 3D widget path only (Demo3dSpatialView → Stkde3DScene → StkdeSliceStack). Do not wire to map or timeline.

### Performance priorities
- **D-07:** Target 30fps stable with 8 active slices visible. Priority order for perf work:
  1. KDE worker offload (FND-05) — highest impact, blocks UI on main thread currently
  2. Frustum culling / LOD (FND-07) — prevents 8.5M instanced points from all rendering at full cost
  3. Shader caching fix (FND-06) — prevents recompilation stalls during slice changes

### the Agent's Discretion
- Store consolidation (FND-04): which stores to merge and the final store count
- KDE worker architecture: transferable buffer patterns, worker pool size
- Shader caching mechanism: uniform-based variants vs other stable key strategies
- LOD strategy: which geometry levels to use for the 8.5M point cloud
- Exact easing functions and lerp implementations for motion scaffolding

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope
- `.planning/codebase/STKDE_TEMPORAL_SCOPE.md` — Defines the exact file boundary for 3D widget work (Demo3dSpatialView, Stkde3DScene, StkdeSliceStack, SliceScrubber)

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — FND-01 through FND-07 definitions, BVS-01 through BVS-08, TME-01 through TME-04
- `.planning/ROADMAP.md` — Phase 76 success criteria (4 items)

### Architecture & Pitfalls
- `.planning/research/ARCHITECTURE.md` — Rendering pipeline analysis, Canvas2D→ShaderMaterial migration path, store consolidation targets
- `.planning/research/PITFALLS.md` — Known traps: `frustumCulled={false}` on all instances, onBeforeCompile template literals, Canvas2D CPU bottleneck, cross-store drift

### Stack
- `.planning/research/STACK.md` — Versioned recommendations for deck.gl, GSAP, integration patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDashboardDemoCoordinationStore` — Central coordination store with activeSliceIndex, selectedIndex, syncStatus. Consolidation target.
- `useDashboardDemoTimeslicingModeStore` — Slice generation and apply flow. Coordinates with coordination store.
- `useDashboardDemoAnalysisStore` — STKDE params and response storage. May be consolidated.
- `Demo3dSpatialView` — Orchestration layer for demo 3D widget. Entry point for motion scaffolding.
- `Stkde3DScene` — R3F scene setup with CameraControls. Entry point for GSAP camera transitions.
- `StkdeSliceStack` — Per-slice heatmap rendering via Canvas2D → CPU texture. Primary target for ShaderMaterial migration.

### Established Patterns
- Web Worker architecture: `adaptiveTime.worker.ts` uses transferable `Float32Array.buffer`. KDE worker should follow same zero-copy pattern.
- Shader infrastructure: `src/components/viz/shaders/` has onBeforeCompile patching and ShaderMaterial patterns. New shaders should use clean ShaderMaterial (not fragile onBeforeCompile).
- State management: Zustand slices pattern with coordination store override (see DemoMapVisualization→MapVisualization)

### Integration Points
- `Demo3dSpatialView.tsx` line 67-96 — builds orderedSlices array, computes sliceKdes. Motion scaffolding must use this ordering.
- `Stkde3DScene.tsx` — CameraControls instance is the target for GSAP camera fly-throughs
- `StkdeSliceStack.tsx` — Canvas2D texture creation per slice. Replace with ShaderMaterial GPU encoding.
- `DemoMapVisualization.tsx` — passes coordinationStoreOverride to MapVisualization. deck.gl integration point.

</code_context>

<specifics>
## Specific Ideas

- Interpolation and aging are the visual emphasis — no glow, no bloom, no post-processing effects
- GSAP is kept for macroscopic camera sequencing only (fly-throughs, pause, advance). Fine-grained per-frame updates stay in the R3F render loop
- deck.gl is kept for GPU heatmap density on the map because MapLibre's built-in heatmap is CPU-bound

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 76-foundation-cleanup-motion-scaffolding*
*Context gathered: 2026-05-26*
