# Research Summary: Visualization Level-Up

**Domain:** Spatiotemporal crime visualization — adaptive space-time cube, burst rendering, temporal evolution, multi-scale inspection
**Researched:** 2026-05-26
**Overall confidence:** HIGH

## Executive Summary

This research synthesizes four parallel investigations into a visualization level-up milestone for an existing Adaptive Space-Time Cube Prototype (v3.1 complete). The app already has working burst detection, slice generation, cross-view coordination, and a five-tab workflow (Scan → Detect → Slices → Inspect → Configure). The level-up targets **analytical effectiveness** — making bursts immediately visible, temporal evolution interpretable, 3D orientation clear, dense data readable, and the entire experience evaluation-ready for thesis usability testing.

**The core tension across all objectives is information density vs. cognitive clarity.** Crime datasets are large (8.5M+ records), the 3D cube is inherently complex, and the analyst's job requires rapid pattern recognition without visual overwhelm. Every decision in this milestone should be evaluated against this tension.

**Three strategic stack additions are justified:** `@react-three/postprocessing` (bloom/selective glow), `deck.gl` with `@deck.gl/aggregation-layers` (GPU-based heatmap density), and `GSAP` (sequenced temporal animations that avoid React reconciliation). No other new libraries are needed — the existing Three.js/R3F/drei/MapLibre stack covers the remaining needs with configuration and shader work. Six new packages total, adding ~147 KB gzip to the bundle.

**The recommended build order is a 6-phase sequence:** (1) Shader infrastructure + architecture cleanup, (2) Spatial orientation + cognitive foundation, (3) Burst visibility + visual consistency, (4) Temporal evolution + post-processing, (5) Multi-scale temporal + workflow support, (6) Evaluation readiness. Each phase builds on the previous, with spatial orientation early as a "quick win" and evaluation readiness last as the measurement layer.

**The top risks are:** GPU memory saturation from 8.5M instanced points (must implement LOD before adding visual channels), shader compilation stalls from dynamic `onBeforeCompile` patching (must refactor to stable uniforms), cross-store synchronization deadlock from 20+ Zustand stores (must consolidate coordination store), and camera disorientation in axis-less 3D space (must add persistent spatial anchors). All have documented prevention strategies.

---

## Key Findings

### From STACK.md

**Three strategic additions — and nothing else:**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@react-three/postprocessing` | ^3.0.4 | Bloom, SelectiveBloom, DepthOfField | Handles all GL state management for post-processing; tree-shakable ~12 KB gzip |
| `deck.gl` + `@deck.gl/aggregation-layers` + `@deck.gl/mapbox` | ^9.3.2 | GPU-accelerated heatmap density inside MapLibre | HeatmapLayer uses GPU-based Gaussian KDE — real-time density without CPU bottlenecks; replaces MapLibre's fixed heatmap |
| `GSAP` | ^3.15.0 | Animation sequencing (camera fly-throughs, transitions, fading trails) | Runs outside React render cycle — no reconciliation issues; ~12 KB tree-shaken core |

**Things explicitly NOT to add:**
- **GPU.js** — deprecated-feeling transpilation layer; deck.gl GPU aggregation is the correct replacement
- **@react-spring/three** — React 18-only (project uses React 19.2.3), adds 30KB+ for spring physics this use case doesn't need
- **WebGPU compute** — Chrome-only effectively; no Three.js integration layer yet
- **Custom camera library** — existing `drei CameraControls` can be constrained via `minPolarAngle`/`maxPolarAngle`/`minDistance`/`maxDistance`

**Total new deps:** 6 packages. Estimated bundle addition: ~147 KB gzipped (acceptable for desktop-first prototype).

**Version compatibility:** All verified against existing stack via npm registry + Context7. `@react-three/postprocessing@3.x` requires `@react-three/fiber >=9` (satisfied, we have 9.5.0). `deck.gl@9.x` integrates with `react-map-gl/maplibre >=8` (satisfied, we have 8.1.0).

---

### From FEATURES.md

**All 10 objectives analyzed with table stakes, differentiators, and anti-features:**

| # | Objective | Complexity | Key Table Stakes | Key Differentiators | Anti-Feature to Avoid |
|---|-----------|------------|------------------|---------------------|-----------------------|
| 1 | Burst Visibility | **LOW** | Opacity/color intensity mapping per burst | Multi-channel encoding (opacity+size+color) | Continuous pulsing/glowing (visual fatigue) |
| 2 | Temporal Evolution | **MEDIUM** | Jump-cut slice transitions, playback controls | Smooth KDE interpolation (opt-in), aging trails | Always-on smooth animation (obscures discrete boundaries) |
| 3 | Spatial Orientation | **LOW-MEDIUM** | Map substrate, axis labels, constrained camera | Eagle-eye preset, animated camera transitions | Free-flying camera as default (disorientation) |
| 4 | Cognitive Overload | **LOW-MEDIUM** | Height=time exclusively, 45° default, constrained orbit | Depth-based dimming, focus mode, 2D/3D toggle | VR headset, automatic rotation, multiple viewports |
| 5 | Multi-Scale Temporal | **MEDIUM** | Overview+detail timeline, adjustable bin count | Zoom-linked 3D cube, dynamic aggregation windows, "zoom to burst" | Unlimited zoom to individual days (sparse/unusable) |
| 6 | Workflow Support | **MEDIUM** | Default overview density, burst highlights, active slice context | Scan-mode density auto-legend, burst window map polygons, comparison presets | Fully automated pipeline (removes analyst judgment) |
| 7 | Visual Consistency | **MEDIUM** | Same color palette across views, synchronized active highlight | Single color scale with shared domain, cross-view hover sync | Identical rendering in all views (different purposes) |
| 8 | Dense Data Readability | **MEDIUM-HIGH** | Density-based point opacity, burst-emphasized color | Adaptive transparency per point, saliency map, LOD switching | Always show all 8.5M points (overplotting obscures patterns) |
| 9 | Analytical Clarity | **LOW** | Jump-cut as default, minimal chrome, optional animations | Explainable encoding panel, "why this is a burst" tooltip, visual diff mode | Cinematic transitions (prevents rapid comparison) |
| 10 | Usability Evaluation | **LOW-MEDIUM** | Consistent interactions, clear task paths, undo/redo | Task completion timing, interaction log, URL state sharing | Full analytics dashboard (privacy, maintenance overhead) |

**Critical dependency paths:**
- **Obj 1 (Burst) + Obj 7 (Consistency) must be implemented together** — burst encoding inconsistent across views creates confusion, not clarity
- **Obj 4 (Cognitive Overload) blocks all other 3D features** — if the 3D view is overwhelming, everything else is wasted
- **Obj 9 (Analytical Clarity) is the governing design principle** — every feature decision must be evaluated against whether it enhances or degrades clarity

**Key conflicts to manage:**
- Burst emphasis vs. full data fidelity → toggle between modes
- Smooth interpolation vs. analytical clarity → opt-in with "estimated" label
- Cognitive overload reduction vs. rich 3D interaction → default constrained + explicit unlock

---

### From ARCHITECTURE.md

**Current pipeline (dashboard-demo 3D):**
- Canvas2D → texture → plane mesh — zero custom shaders or post-processing
- KDE computed in main thread (`computeSliceKde()` in `Demo3dSpatialView`)
- Sequential per-slice fetch
- No camera sync between map and 3D
- Multiple coordination stores (`useCoordinationStore` + `useDashboardDemoCoordinationStore` — can drift)

**Target pipeline:**
- ShaderMaterial rendering (replaces Canvas2D CPU textures with GPU data textures)
- KDE computation offloaded to worker (`kde.worker.ts` or extended existing worker)
- Parallel per-slice fetch (Promise.all)
- EffectComposer wrapping R3F Canvas with selective DepthOfField + Bloom
- Unidirectional camera sync (Map → 3D) by default, bidirectional opt-in
- Single coordination store for all interactive views

**New stores needed (4 total):**

| Store | Purpose | Phase |
|-------|---------|-------|
| `useCameraStore` | 3D camera presets, constraints, map sync state | Spatial Orientation |
| `usePostProcessingStore` | DoF/Bloom toggle, intensity, effect presets | Post-Processing |
| `useMultiScaleStore` | Aggregation resolution, bins, computing state | Multi-Scale |
| `useVizAnimationStore` | Interpolation mode, trail decay, accumulated frames | Temporal Evolution |

**Extended stores:**
- `useDashboardDemoCoordinationStore` — add `burstAmplifyEnabled`, `burstAmplifyIntensity`, `temporalEvolutionMode`
- `useDashboardDemoMapLayerStore` — add `cameraSync` mode
- `useDashboardDemoAnalysisStore` — add `saliencyThreshold`, `saliencyEnabled`

**New components (~10):**
- `src/shaders/burst-amplify.ts` — shared burst shader logic
- `StkdeSliceStackExtended.tsx` — shader-based replacement for Canvas2D
- `VizPostProcessing.tsx` — EffectComposer wrapper
- `TemporalTrailLayer.tsx` — frame accumulation + interpolation
- `CameraPresetsManager.tsx` — camera preset switcher
- `ConstrainedCamera.tsx` — CameraControls with configurable bounds
- `AxisHelper3D.tsx` — annotated 3D axes, grid, scale bar
- `MultiScaleTimelineBand.tsx` — aggregation resolution band
- `VizControlsPanel.tsx` — unified viz toggles
- `src/lib/aggregation/multi-scale.ts` — worker-based multi-resolution aggregation

**Components NOT modified:** `DemoSlicePanel`, `DemoDetectPanel`, `DemoStkdePanel`, `DemoStatsPanel`, `DemoTimelineSettingsCard`, `DashboardDemoRailTabs`, `MapStkdeHeatmapLayer` — these are already stable.

**Performance strategy:**
- GPU work (free, no main thread impact): Shader-based burst amplification, post-processing (1-2 render targets), temporal trail accumulation
- CPU work offloaded to workers: KDE per slice (new `kde.worker.ts`), multi-scale aggregation (new `aggregation.worker.ts`), burst scoring (already in `adaptiveTime.worker.ts`)
- Optimization: only render effects when enabled, half-res bloom, debounce camera sync, dispose textures explicitly

---

### From PITFALLS.md

**Top 7 critical pitfalls with prevention strategies:**

| # | Pitfall | Phase to Address | Prevention Strategy |
|---|---------|------------------|---------------------|
| 1 | **GPU memory saturation** — 8.5M InstancedMesh spheres at ~3.3 GB VRAM, no LOD, `frustumCulled={false}` | Phase 1 | Implement true geometry LOD (`drei <Detailed>`), downsample distant data, texture lifecycle discipline, VRAM budget tracking |
| 2 | **Draw-call explosion** — N slices × (SlicePlane + SliceCrimePoints + BurstEvolution lines) = 50+ draw calls | Phase 1 | Merge static geometry (`BufferGeometryUtils`), reuse materials across slices, eliminate redundant `SliceCrimePoints`, batch lines into `<lineSegments>` |
| 3 | **Shader compilation stalls** — `onBeforeCompile` with template literals (`${typeMapSize}`) invalidates WebGL program cache on every filter change, causing 100-500ms hitches | Phase 1 | Eliminate dynamic shader patching (hard-code fixed sizes), batch uniform updates into single `useFrame`, add `customProgramCacheKey`, pre-warm shaders on load |
| 4 | **MapLibre + R3F double rendering** — both renderers use WebGL simultaneously in map mode, halving effective GPU budget | Phase 2 (Temporal) | Fully unmount inactive renderer (not just CSS hide), investigate single GL context via MapLibre custom layer API, reduce R3F resolution when overlaying |
| 5 | **Camera disorientation** — no axis labels, grid, or basemap in 3D; free rotation disorients users; coordinate system shifts between map (lng/lat) and 3D (normalized) | Phase 3 (Orientation) | Constrain polar angle (~π/4 from horizontal), persistent basemap plane at Y=0, axis helpers with `drei <Text>`, north-up lock toggle, eagle-eye minimap |
| 6 | **Occlusion-driven information loss** — points in dense areas hide 60-80% behind visible layers; user sees empty space where data exists | Phase 4 (Readability) | Adaptive transparency based on local density, depth-peel for inspect mode, screen-space density overlay when zoomed out, auto-hide non-slice points in inspection |
| 7 | **Animation interpolation jitter** — `useFrame` runs at 60fps but React state updates (filter/slice changes) re-render mid-animation, causing discontinuous GPU uniform values | Phase 2 (Temporal) | Store animation state in React refs (not Zustand/React state), use stable IDs for Three.js objects, batch store reads at frame start via `getState()`, constant-time lerp instead of asymptotic `damp` |

**Cross-cutting pattern:** Pitfalls 1, 2, 3, 8 (cross-store sync), and 9 (worker overcontribution) all need to be addressed in Phase 1 before any new visualization features are added. The existing architecture has accumulated technical debt (dual coordination stores, `frustumCulled={false}`, dynamic shader patching, main-thread `computeMaps`) that will cause compound failures if new features are layered on top.

**"Looks Done But Isn't" checklist items that must be verified:**
- [ ] LOD system: dither ≠ true LOD — points still cost vertex transform
- [ ] VRAM cleanup: heatmap FBO, aggregation geometry, per-slice textures are not disposed
- [ ] R3F Canvas unmount: switching view modes hides Canvas but doesn't release WebGL context
- [ ] Shader recompilation guard: no `customProgramCacheKey` exists
- [ ] Cross-store consistency: dual coordination stores can drift independently
- [ ] Worker result transfer: `Float32Array` is copied, not transferred (68MB per call at 8.5M records)
- [ ] Animation completion callback: `MathUtils.damp` never signals "done"
- [ ] State serialization: no way to capture/replay visualization state
- [ ] Reset-to-baseline: only resets camera, not filters or params
- [ ] Map ↔ 3D sync: no coordinate transformation when switching views

---

## Implications for Roadmap

### Recommended Build Order: 6 Phases

The following phase order reconciles dependency analysis from FEATURES.md (feature dependencies), ARCHITECTURE.md (component/module dependencies), and PITFALLS.md (technical debt prevention). Each phase has a clear rationale, deliverable, and pitfall avoidance strategy.

#### Phase 0: Shader Infrastructure & Architecture Cleanup
*Foundation — prerequisites for all GPU work*

**Rationale:** Every subsequent phase depends on having the shader pipeline, worker infrastructure, and clean store architecture in place. Attempting burst visibility or post-processing without fixing the existing pitfalls will compound technical debt.

**What it delivers:**
- Install all 6 new dependencies (`@react-three/postprocessing`, `deck.gl` + aggregation-layers + mapbox, `GSAP`)
- Create `src/shaders/` directory with shared `burst-amplify.ts` GLSL fragments/uniforms
- Consolidate dual coordination stores into single `useDashboardDemoCoordinationStore`
- Eliminate dynamic `onBeforeCompile` shader patching — replace with stable uniforms
- Enable `frustumCulled` on DataPoints and verify culling works
- Offload `computeMaps` to Web Worker with transferable result buffers
- Consolidate 10+ individual `useEffect` uniform updates into single `useFrame` batch
- Add VRAM tracking overlay (dev-only)
- Set up `kde.worker.ts` for parallel KDE computation

**Pitfalls avoided:** #1 (GPU memory), #2 (draw-call explosion), #3 (shader stalls), #8 (cross-store deadlock), #9 (worker overcontribution)

**Research flag:** Phase 0 is routine (standard R3F/deck.gl/GSAP installation patterns). No need for `/gsd/research-phase`. Confidence: HIGH.

---

#### Phase 1: Spatial Orientation & Cognitive Foundation
*Quick wins with high visual impact*

**Rationale:** Spatial orientation (Obj 3) and cognitive overload reduction (Obj 4) are the minimum viable conditions for 3D analysis. If users are disoriented or overwhelmed, no amount of burst highlighting or temporal animation will help. These also have LOW-MEDIUM complexity with no shader dependencies beyond Phase 0.

**What it delivers:**
- `useCameraStore` with presets, constraints, map sync state
- `ConstrainedCamera` wrapper with configurable polar/dist bounds (default: π/4 from horizontal)
- `CameraPresetsManager` with eagle-eye, 45° iso, side-view presets
- `AxisHelper3D` with N/S/E/W labels and geo-referenced ground grid
- Port `MapTileSource` pattern from STC-3D scene to main Scene for basemap substrate
- `usePostProcessingStore` (created but not wired to effects yet)
- Focus mode (active slice pops, others dim to 15-20%)
- Depth-based slice dimming (distance-based opacity modulation)
- 2D/3D toggle preserving active slice state
- Driver.js onboarding tour covering STC mental model

**Features delivered:** Obj 3 (all table stakes + eagle-eye preset + animated transitions + axis helpers + ground grid), Obj 4 (focus mode, depth-based dimming, 2D/3D toggle, onboarding), Obj 9 (minimal chrome enforcement)

**Pitfalls avoided:** #5 (camera disorientation)

**Research flag:** Standard patterns (CameraControls configuration, drei helpers, MapLibre texture capture). Confidence: HIGH.

---

#### Phase 2: Burst Visibility & Visual Consistency
*Core analytical encoding*

**Rationale:** Burst visibility (Obj 1) is the primary analytical encoding — everything else enhances it. Visual consistency (Obj 7) must be implemented alongside it because inconsistent burst encoding across views creates confusion. Phase 0's shader infrastructure and Phase 1's spatial stability make this feasible and interpretable.

**What it delivers:**
- `StkdeSliceStackExtended` — shader-based KDE rendering replacing Canvas2D (GPU data textures instead of CPU textures)
- Custom `ShaderMaterial` with `uBurstScore`, `uBurstClass`, `uActiveIntensity` uniforms
- Burst-score-to-opacity mapping in 3D cube
- Burst-score-to-color-intensity mapping on map heatmap
- Unified color scale with shared domain across map, cube, timeline
- Shared legend component
- SelectiveBloom from postprocessing for burst-highlighted meshes (`luminanceThreshold` + `selection` prop)
- Animated burst pulse on slice change (one-shot, not continuous)
- Toggle between "raw density" and "burst-emphasized" view
- Visual legend showing burst intensity scale

**Features delivered:** Obj 1 (all table stakes + multi-channel encoding + animated burst pulse), Obj 7 (unified color scale, shared legend, synchronized animation states, consistent opacity encoding)

**Dependencies:** This is the phase where KDE computation must be fully worker-offloaded (from Phase 0). Each slice's KDE grid feeds the shader — if KDE is still on main thread, 15+ slices × 2-5ms = 30-75ms blocked UI.

**Pitfalls avoided:** #6 (occlusion — partial, via burst-emphasized visibility)

**Research flag:** ShaderMaterial with data textures is well-documented (Three.js + R3F docs). SelectiveBloom integration needs care around render layers (exclude map tile plane). Confidence: HIGH. However, the kernel-size-scaling differentiator (tie bandwidth to burstScore) touches `src/lib/kde.ts` — this may need a focused research pass on KDE parameter modulation.

---

#### Phase 3: Temporal Evolution & Post-Processing
*Animation and depth effects*

**Rationale:** Temporal evolution (Obj 2) and post-processing effects (Obj 7) depend on the stable shader pipeline from Phase 0 and the burst rendering from Phase 2. EffectComposer wraps the existing scene — it must come after burst shaders are verified. Temporal evolution needs the animation architecture (ref-based, not React state) documented in Pitfall #7.

**What it delivers:**
- `VizPostProcessing` — EffectComposer wrapping Canvas with DepthOfField + Bloom
- DepthOfField focused on active slice Y position (bokehScale configurable, 0 = disabled)
- Bloom on burst-highlighted meshes (selective, via `selectionLayer`)
- GSAP integration for camera fly-throughs and slice transitions
- `TemporalTrailLayer` — aging trails on map (fixed-radius echo with opacity ∝ recency)
- Temporal accumulation overlay (semi-transparent prior-slice compositing)
- Smooth interpolation between KDE surfaces (CPU first, GPU optimization optional)
- Animation policy: ≤200ms for analytical state changes, ease-out for analysis, ease-in-out for orientation
- Animation architecture: store targets in refs, interpolate in useFrame, no React round-trips

**Features delivered:** Obj 2 (aging trails, temporal accumulation, smooth interpolation, blob size animation), plus post-processing polish across all views

**Dependencies:** Requires Phase 2 shader pipeline. The MapTileSource plane must render before EffectComposer (use `renderOrder` or `selectionLayer` to exclude from post-processing).

**Pitfalls avoided:** #4 (double rendering — ensure Canvas unmounts when hidden), #7 (animation jitter), #12 (over-animated transitions)

**Research flag:** EffectComposer with R3F is standard. GSAP + Three.js ref animation is straightforward. The KDE surface interpolation (vertex morphing between consecutive KDE grids) is less documented — this may need a focused `/gsd/research-phase` for the interpolation shader approach. Confidence: MEDIUM for interpolation component.

---

#### Phase 4: Multi-Scale Temporal & Workflow Support
*Navigation and process scaffolding*

**Rationale:** Multi-scale temporal inspection (Obj 5) and workflow support (Obj 6) are the highest-level features — they depend on stable visual encoding from Phases 1-3 working correctly. The zoom-linked 3D cube update needs the camera store (Phase 1) and slice rendering (Phase 2) to be stable. Workflow presets need all visual modes to exist.

**What it delivers:**
- `useMultiScaleStore` with resolution/aggregation state
- `aggregation.worker.ts` for multi-resolution temporal binning
- `MultiScaleTimelineBand` — additional timeline track showing aggregated bins
- Zoom-linked 3D cube update (timeline zoom controls which slices appear)
- Dynamic aggregation window (auto-suggest daily/weekly/monthly based on zoom level)
- Temporal resolution indicator
- "Zoom to burst" action (double-click burst window → zoom detail)
- Scan-mode density layer with auto-legend (dedicated rendering mode)
- Detect-mode burst window polygons on map
- Inspect-mode comparison presets (side-by-side, overlay, swipe)
- Workflow state machine with guided transitions ("You detected 3 bursts — review them?")
- "Hotspot → slice → inspect" jump (click hotspot → generate slice → auto-navigate)

**Features delivered:** Obj 5 (all table stakes + zoom-linked cube + dynamic aggregation + zoom-to-burst), Obj 6 (all table stakes + all differentiators)

**Dependencies:** Requires stable timeline (from Phase 1-2), burst rendering (Phase 2), camera presets (Phase 1). The multi-scale worker is new but follows established pattern.

**Pitfalls avoided:** N/A directly — this phase primarily adds features on top of stable infrastructure from previous phases.

**Research flag:** Comparison presets (side-by-side/overlay/swipe) have established patterns in geovisualization literature but less in R3F — may need `/gsd/research-phase`. Burst window map polygons (time-bounded spatial overlays) are novel and may need design iteration. Confidence: MEDIUM for comparison presets, HIGH for remaining items.

---

#### Phase 5: Dense Data Readability
*Polish and edge-case handling*

**Rationale:** Dense data readability (Obj 8) depends on the shader infrastructure from Phase 0 and the burst visibility pipeline from Phase 2 — it extends the same shader with adaptive transparency and saliency uniforms. This is pure polish that makes the system work at scale but has no new dependencies on Phases 3 or 4.

**What it delivers:**
- Adaptive transparency per point (inverse local density → opacity) — extends `burst-amplify.ts` with saliency uniforms
- Burst-emphasized rendering mode (non-burst regions desaturated/transparent)
- Saliency map overlay (burst score × density anomaly)
- Dynamic filtering sliders (density threshold, burst threshold, transparency)
- Level-of-detail switching (points → KDE surface → abstract markers based on zoom)
- `SliceCrimePoints` removal — replaced by shader-based slice highlighting via `uSliceRanges`

**Features delivered:** Obj 8 (all table stakes + all differentiators)

**Dependencies:** Extends Phase 0 shader infrastructure and Phase 2 burst pipeline. No dependency on Phases 3-4.

**Pitfalls avoided:** #6 (occlusion-driven information loss — fully addressed via adaptive transparency + depth-peel)

**Research flag:** Per-point adaptive transparency (KDE value at point location) requires per-point density estimation. This can be GPU-based (deck.gl approach) or CPU-based (worker). The GPU approach is already in stack via deck.gl HeatmapLayer. This is well-documented. Confidence: HIGH.

---

#### Phase 6: Evaluation Readiness
*Measurement and hardening*

**Rationale:** Usability evaluation (Obj 10) is the meta-objective that measures whether Phases 0-5 are working. It only makes sense once the visualization is stable. All features from Obj 10 are additive on top of existing infrastructure.

**What it delivers:**
- Interaction logging via existing LoggerService (capture all user actions)
- Task completion time tracking
- Visualization state serialization (all 20+ parameters → URL hash/query string)
- State replay in dev mode (Ctrl+Shift+E copies current state URL)
- Undo/redo for slice operations (history stack in slice domain store)
- Session state persistence (Zustand + localStorage)
- Evaluation parameter lock (known defaults, log all adjustments)
- Reset-to-baseline (one-click: camera + filters + params + slices)
- Interaction trace logger (dev-mode)
- Insight annotation export (PDF/CSV summary)

**Features delivered:** Obj 10 (all table stakes + all differentiators)

**Dependencies:** Requires all visualization features from Phases 0-5 to be stable. Undo/redo needs slice store immutability patterns.

**Pitfalls avoided:** #10 (inconsistent interactions — verify single coordination store), #11 (hidden visualization states — state serialization)

**Research flag:** Standard patterns (Zustand persistence, URL state, interaction logging). Confidence: HIGH.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack additions** | **HIGH** | All 3 additions verified via Context7 + npm registry + version compatibility matrix against existing stack. |
| **Feature landscape** | **HIGH** | Based on codebase analysis of 90+ components + established visualization HCI principles (Tufte, Ware, Andrienko). Implementation complexity estimates verified against existing patterns. |
| **Architecture changes** | **HIGH** | Derived from existing codebase analysis + Context7-verified R3F post-processing and deck.gl APIs. Component boundaries, store designs, and data flows are concrete. |
| **Pitfalls** | **HIGH** | All 12 pitfalls reverse-engineered from existing codebase (DataPoints, ghosting shader, MainScene, stores, workers). Prevention strategies reference specific files and patterns. **This is the strongest section of the research.** |
| **Overall** | **HIGH** | No critical gaps. The existing codebase is well-structured, and the additions use established, well-documented libraries. |

### Gaps to Address

1. **KDE kernel-size scaling (Obj 1 differentiator):** Tying bandwidth parameter to `burstScore` requires modifying `src/lib/kde.ts`. The current KDE uses a fixed bandwidth. Research into adaptive KDE bandwidth modulation is needed during implementation.

2. **Smooth KDE surface interpolation (Obj 2 differentiator):** Morphing between consecutive KDE grids via vertex interpolation has established GPU patterns but little React/Three.js documentation. May need a focused research pass.

3. **Comparison presets rendering (Obj 6 differentiator):** Side-by-side/overlay/swipe comparison modes for slices have established Geovisualization patterns but no direct R3F precedent. Design iteration expected.

4. **Burst window map polygons (Obj 6 differentiator):** Converting temporal burst windows to spatial overlay elements is a novel visualization — no existing pattern in the codebase.

5. **VRAM budget without real data testing:** Pitfall #1 estimates ~3.3 GB for the full 8.5M dataset, but actual GPU behavior depends on specific hardware, driver, and rendering configuration. VRAM tracking overlay is essential during development for real-world validation.

### Sources

**Primary (HIGH confidence — Context7 verified or codebase analysis):**
- `/pmndrs/react-postprocessing` — Bloom, SelectiveBloom, EffectComposer API
- `/pmndrs/react-three-fiber` (v9+) — useFrame, Canvas props, performance options
- `/pmndrs/drei` — Instances, CameraControls, Stats, PerformanceMonitor, AdaptiveDpr
- `/mrdoob/three.js` (r182+) — ShaderMaterial, InstancedMesh, BufferGeometry
- `/visgl/deck.gl` — HeatmapLayer GPU KDE, MapboxOverlay integration
- `/maplibre/maplibre-gl-js` — heatmap layer, custom layers, setData/setFilter
- Existing codebase analysis: 90+ component files, store definitions, API routes, workers
- `.planning/research/STACK.md` — version-verified stack additions
- `.planning/research/FEATURES.md` — feature landscape across 10 objectives
- `.planning/research/ARCHITECTURE.md` — component boundaries, data flows, store designs
- `.planning/research/PITFALLS.md` — 12 reverse-engineered pitfalls with prevention strategies

**Secondary (MEDIUM confidence — official docs fetched):**
- GSAP documentation (gsap.com/docs) — timeline/tween API
- @react-spring/three docs — React 18-only compatibility verified
- deck.gl v9 documentation — HeatmapLayer GPU aggregation
- Zustand performance patterns (pmndrs) — selector subscriptions, getState()

**All critical findings verified against primary sources. No tertiary (unverified) sources were needed.**

---

*Visualization level-up research synthesized for: Adaptive Space-Time Cube Prototype*
*Researched: 2026-05-26*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md — all HIGH confidence*
*Ready for: Roadmap creation*
