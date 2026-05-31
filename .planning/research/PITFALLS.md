# Pitfalls Research — Visualization Level-Up

**Domain:** Three.js/R3F spatiotemporal crime visualization overlaying MapLibre
**Researched:** 2026-05-26
**Confidence:** HIGH
**Context:** Adding burst visibility, temporal evolution, spatial orientation, multi-scale inspection, and dense-data readability to an existing 8.5M-record crime analysis app (Next.js 16, DuckDB, Zustand, Web Workers, custom shaders).

---

## Critical Pitfalls

### Pitfall 1: GPU Memory Saturation from Instanced Point Geometry

**What goes wrong:**
The app renders 8.5M+ crime records as individual `InstancedMesh` spheres (0.5-unit radius, 8×8 segments). Each sphere is ~384 bytes of vertex data (24 vertices × 16 bytes). At 8.5M records, this is ~3.3 GB of GPU geometry data before instancing overhead, textures, uniforms, and the heatmap FBO. On a typical GPU with 4–6 GB VRAM, this leaves almost no headroom for the MapLibre texture, post-processing, or the heatmap render target.

**Why it happens:**
- Each crime record becomes a persistent 3D sphere in the instanced mesh; developers naturally assume instancing is "free" but instance count still drives vertex shader invocation cost
- The `frustumCulled={false}` setting on `DataPoints` forces the GPU to process all 8.5M instances every frame regardless of visibility
- Columnar data mode keeps ALL points loaded; there is no LOD mechanism that reduces geometry for distant/zoomed-out views
- The shader's LOD dithering (`uLodFactor`) only affects fragment discard, not vertex processing — the GPU still transforms every instance's 24 vertices per frame

**Warning signs:**
- Frame rate drops below 30fps when zoomed out (full dataset visible)
- Chrome DevTools `about:gpu` shows VRAM usage > 80% of available
- Map interactions become sluggish (both MapLibre and R3F share GPU)
- Browser tab crashes on dataset reload after navigation (VRAM leak from texture disposal gaps)

**Prevention strategy:**
1. **Implement true geometry LOD:** Use `@react-three/drei`'s `<Detailed>` or manual multi-mesh replacement. At zoomed-out levels, render aggregated bins (2D density) instead of individual spheres. Kill the "frustumCulled={false}" antipattern — enable culling and verify it works (the `-50 to 50` coordinate system should allow frustum culling with a moderately sized scene).
2. **Downsample distant data:** Beyond a camera distance threshold, switch from instanced sphere geometry to a sprite-based approach or render to a density texture and discard individual points.
3. **Texture lifecycle discipline:** Every `useMemo` that creates a DataTexture needs a paired `useEffect` dispose. The existing code has `useEffect(() => () => warpTexture.dispose(), [warpTexture])` — good pattern, but verify every texture path.
4. **VRAM budget tracking:** Add a dev-only overlay that shows current VRAM usage, texture count, and geometry buffer sizes. Establish a hard budget (e.g., 2 GB for geometry, 500 MB for textures).

**Phase to address:**
Phase 1 (Burst Visibility Foundation) — burst visibility introduces additional visual channels (opacity, density amplification) that increase the cost of full-resolution rendering. LOD structures must be in place before adding these channels.

---

### Pitfall 2: Draw-Call Explosion from Per-Slice Rendering

**What goes wrong:**
Each time slice (`SlicePlane`, `SliceCrimePoints`, `SliceClusterOverlay`, `BurstEvolutionOverlay`, `EvolutionFlowOverlay`) adds its own mesh or line geometry. With N slices (potentially 10–20), the scene accumulates: N × SlicePlane meshes + N × SliceClusterOverlay meshes + N × SliceCrimePoints meshes + N × BurstEvolution lines. This creates dozens of draw calls per frame, each with its own material, geometry, and state change.

**Why it happens:**
- The component model encourages per-slice React components (each slice is a `<group>` with child components) — natural in R3F but expensive with many slices
- Lines (`BurstEvolutionOverlay`) create new `BufferGeometry` per segment (see `buildLinePoints` called per-segment with `new Float32Array`)
- `SliceCrimePoints` renders points per-slice even though the main `DataPoints` already renders ALL points — duplicating geometry in the scene
- `BurstEvolutionOverlay` creates separate `<line>` elements for each connector segment, each with its own material

**Warning signs:**
- DevTools `three.js` inspector shows >50 renderable objects
- Adding a new slice causes visible frame latency spike
- `BurstEvolutionOverlay` connector lines cause frame drops when many slices exist

**Prevention strategy:**
1. **Merge static geometry:** Use `THREE.BufferGeometryUtils.mergeGeometries()` for secondary overlays. If overlays change infrequently, merge them into single geometries.
2. **Reuse materials across slices:** All `SlicePlane` meshes can share a single `ShaderMaterial` instance. Create materials once, not per-slice component.
3. **Eliminate redundant rendering:** `SliceCrimePoints` duplicates rendering done by `DataPoints` — replace with shader-based slice highlighting (already partially done via `uSliceRanges` uniforms). Remove `SliceCrimePoints` and rely on the uniform approach.
4. **Line batching:** Replace per-segment `<line>` elements in `BurstEvolutionOverlay` with a single `<lineSegments>` mesh that batches all connectors.

**Phase to address:**
Phase 1 (Burst Visibility) — the evolution overlay and per-slice highlights are core burst-visibility features. Refactoring to batched geometry should be done when implementing these features, not retrofitted.

---

### Pitfall 3: Shader Compilation Stalls from Dynamic Uniform Reload

**What goes wrong:**
Every time filters change, time range adjusts, or slice data updates, the ghosting shader (`shaders/ghosting.ts`) recompiles because `onBeforeCompile` produces different shader code for different configuration states. The `applyGhostingShader` function injects template literal values (`${typeMapSize}`, `${districtMapSize}`) that change when filter config changes, triggering WebGL program recompilation. This causes visible 100–500ms hitches during interaction.

**Why it happens:**
- `onBeforeCompile` pattern (used in `DataPoints`) patches shader source at runtime — this invalidates the cached WebGL program
- Template literals in the shader source (`#include <common>` replacements) mean any dynamic value change triggers full recompilation
- The `useEffect` chain in `DataPoints` (10+ effects updating uniforms) frequently triggers material re-evaluation that leads to recompilation
- The existing code has 10 independent `useEffect` blocks in `DataPoints`, each updating different subsets of uniforms — this makes it hard to reason about when recompilation occurs

**Warning signs:**
- Frame time spikes (visible as "freeze then jump") when adjusting filter controls
- Chrome DevTools "Shader Compile" events appearing in Performance tab during normal interaction
- First interaction after page load is always slow (cold shader cache)

**Prevention strategy:**
1. **Eliminate dynamic shader patching:** Hard-code typeMapSize and districtMapSize (they're already fixed at 36 in practice). Remove template literals from shader source — use a fixed maximum and pass actual sizes via uniforms.
2. **Batch uniform updates:** Consolidate the 10+ individual `useEffect` blocks into a single `useFrame` or imperative update loop. The ghosting shader already has `useFrame` logic (lines 370–428 of DataPoints) but also has ~10 separate `useEffect` hooks for uniforms — consolidate.
3. **WebGLProgram caching:** Ensure the material's `needsUpdate` flag is only set when the shader source actually changes, not when uniforms change. Use `material.customProgramCacheKey()` to provide stable cache keys.
4. **Pre-warm shaders:** On app load, render a dummy pass that invokes the ghosting shader to populate the WebGL program cache before the user interacts.

**Phase to address:**
Phase 1 (Burst Visibility) — burst visibility requires new uniform channels for opacity, density amplification, etc. This is the right time to refactor the shader patch approach.

---

### Pitfall 4: MapLibre + R3F Double Rendering Overhead

**What goes wrong:**
When the app runs in map mode (`mode === 'map'` in `MainScene`), MapLibre renders the 2D map AND the R3F canvas renders the 3D space-time cube as a transparent overlay. Both use WebGL, both consume GPU resources, and both render at the same viewport size. This halves the effective GPU budget for each renderer.

**Why it happens:**
- The architecture splits map and 3D cube into separate layers: MapLibre is a full-screen `<Map>` component, R3F is a full-screen transparent `<Canvas>` overlay on top
- Both renderers independently allocate framebuffers, textures, and GPU state
- R3F's transparent canvas means Three.js cannot use certain early-z optimizations
- The existing `MapTileSource` pattern (in `Stkde3DScene`) captures MapLibre output to a texture — this requires a `gl.readPixels` (or canvas-to-texture) round-trip that stalls the GPU pipeline
- In `MainScene`, the map and canvas are always layered but `showMapBackground` controls visibility — however toggling visibility doesn't release GPU resources from the hidden renderer

**Warning signs:**
- GPU utilization doubles when switching between map and 3d modes (visible in GPU profiling tools)
- Frame rate is consistently lower in map mode than 3d-only mode
- Dragging the map feels sluggish because both renderers compete for GPU time

**Prevention strategy:**
1. **Unmount inactive renderer:** When `mode === 'map'`, fully unmount the R3F `<Canvas>` or at minimum use `<Canvas gl={{ ... }}>` with `framebuffer` release on unmount. Don't just toggle opacity/pointer-events.
2. **Single renderer architecture:** Investigate using MapLibre's custom layer API to render Three.js content inside MapLibre's GL context (MapLibre supports `addLayer` with custom `render` functions in WebGL). This shares a single GL context and eliminates double-framebuffering.
3. **Texture capture optimization:** If capturing map tiles to a Three.js texture is needed (Stkde3DScene pattern), use `Map.getCanvas()` directly as an R3F texture source with `map.needsUpdate = true` on camera moves, rather than creating new CanvasTexture objects.
4. **Render budget split:** If dual renderers are unavoidable, reduce the R3F render resolution when overlaying the map (`const dpr = useThree(state => state.viewport.dpr)` → dynamically lower when in map mode).

**Phase to address:**
Phase 2 (Temporal Evolution / Aging Fading Trails) — temporal evolution features add more render passes (accumulation buffers, trail fading) that exacerbate the double-rendering problem. Address the architecture before adding these features.

---

### Pitfall 5: Camera Disorientation in Axis-Less 3D Space

**What goes wrong:**
Users in the 3D space-time cube lose spatial context. The cube renders crime points on X (space), Z (space), Y (time) axes, but without clear axis labels, grid lines, or reference markers, users cannot tell which direction corresponds to which geographic dimension. When the camera rotates (even slightly with `maxPolarAngle: Math.PI / 2` in `CameraControls`), the spatial reference is lost, and users can't relate 3D positions back to the 2D map.

**Why it happens:**
- The existing `Scene` has no axis helpers, no north indicator, no grid labels
- `CameraControls` allows free rotation within a hemisphere, which disorients users who expect north-up
- The coordinate system shifts between views: map uses geographic (lng/lat), 3D uses normalized (-50 to 50) — no visual mapping shows this relationship
- The 3D scene has `fog` but no reference plane or ground texture that would anchor spatial understanding
- Color encoding (crime type) is the only visual channel — there's no constant visual reference for geography

**Warning signs:**
- Users frequently toggle between map and 3D views (to reorient themselves)
- Test participants ask "which way is north?" in usability sessions
- Users rotate the camera then struggle to return to the default view
- The "Reset View" button is used excessively

**Prevention strategy:**
1. **Constrained camera for analysis tasks:** Default to orbit mode with restricted polar angle (like looking at a tilted table, not full 3D rotation). The existing `maxPolarAngle: Math.PI / 2` is too permissive — constrain to ~π/4 from horizontal for the default "desk" view.
2. **Persistent spatial anchors:** Render a semi-transparent basemap plane at Y=0 (or minimal elevation) that shows street outlines or neighborhood boundaries derived from MapLibre tiles. The `MapTileSource` pattern from `Stkde3DScene` is exactly right — use it consistently across all 3D views.
3. **Axis cues in the scene:** Add minimal axis helpers with labels (N/S, E/W) using `drei`'s `<Text>` component. A translucent ring or ground grid with compass directions provides constant spatial reference.
4. **North-up lock toggle:** Provide a snap-back button that resets camera to north-up orientation without full reset. Save the user's preferred azimuth as a store value.
5. **Eagle-eye minimap:** Add a small inset map (like a mini-map in games) that shows a north-up 2D view with the 3D camera's frustum overlaid. This gives constant orientation context.

**Phase to address:**
Phase 3 (Spatial Orientation) — this phase specifically targets spatial orientation improvements. The constrained camera, axis cues, and basemap plane are the core deliverables.

---

### Pitfall 6: Occlusion-Driven Information Loss in Dense Views

**What goes wrong:**
When 8.5M crime points are projected into a 100×100×100 unit cube with camera at [50, 50, 50], points naturally overlap and occlude each other. Higher points (later in time) obscure lower points (earlier in time). In dense crime areas (e.g., downtown Chicago), this can hide 60-80% of points behind a few visible layers. Users have no way to know they're missing data.

**Why it happens:**
- Three.js renders in painter's algorithm (farthest to nearest by default) or z-buffer — points with the same z-value fight for the same pixel
- The ghosting shader can discard context points (dithering), but the remaining visible points still occlude each other
- Opacity dithering creates a perceptual illusion of transparency but doesn't help with z-fighting between overlapping point instances
- The `sphereGeometry` with radius 0.5 in a 100-unit cube means each point occupies ~0.003% of one axis — the volume seems small but points cluster in geographic hotspots (downtown), creating dense vertical columns
- The `depthWrite: false` on overlay elements causes incorrect occlusion ordering between slices and points

**Warning signs:**
- A selected burst window shows a density spike, but the 3D view doesn't look meaningfully different
- Counts from data queries don't match visual density
- Users zoom into the cube but still can't make out individual points in dense areas
- Screenshots of burst windows look similar to screenshots of non-burst windows

**Prevention strategy:**
1. **Adaptive transparency:** When point density exceeds a threshold in a region, automatically reduce opacity and/or switch to a density heatmap overlay for that region. The shader's `uBurstThreshold` and density texture already enable burst highlighting — extend to occlusion detection.
2. **Depth-peel rendering:** For critical views (inspecting a specific slice), use a depth-peeling technique (multi-pass rendering with incremental depth comparison) to reveal occluded points. This is expensive but justified for the "inspect" workflow.
3. **Screen-space density visualization:** When zoomed out past a threshold, replace individual points with a 2D screen-space density heatmap (like a "perceived density" overlay that shows where points would be if you could see through the occlusion).
4. **Automatic slice inspection mode:** When the user selects a slice and enters inspect mode, temporarily hide non-slice points and show only points in the slice's time range with spatial density coloring. The existing `SliceCrimePoints` pattern hints at this — make it the default for inspection.
5. **Z-fighting mitigation:** Ensure `depthWrite` and `depthTest` settings are consistent across all materials in the scene. For overlay elements, use `polygonOffset` to nudge them above points in z-space without affecting appearance.

**Phase to address:**
Phase 4 (Dense Data Readability) — occlusion management is the primary challenge of readable dense data. Also feeds into Phase 2 (temporal accumulation buffers must handle occlusion).

---

### Pitfall 7: Animation Interpolation Jitter from React Re-Renders

**What goes wrong:**
Animated transitions (warp factor interpolation, temporal evolution trails, burst emphasis fading) stutter or jump because R3F's `useFrame` runs at 60fps but React state updates (filter changes, slice modifications) re-render components at unpredictable intervals. When a React state change triggers a re-render mid-animation, the animation loop's interpolated values reset or jump.

**Why it happens:**
- The ghosting shader's `uWarpFactor` is interpolated in `useFrame` via `MathUtils.damp` (line 381 of `DataPoints`), but the warp factor value comes from Zustand store — when the store updates mid-animation, the GPU uniform gets a discontinuous value
- `useFrame` in `DataPoints` reads from multiple Zustand stores (line 398: `useSliceStore.getState()`, line 394: `useAggregationStore.getState()`) — these reads don't trigger re-renders but they do read potentially stale values during animation frames
- React reconciliation can cause `<group>` and component unmount/remount during animation (state-driven overlay visibility), which destroys and recreates Three.js objects mid-frame
- The `BurstEvolutionOverlay` re-creates all connector lines whenever slices change — no animation interpolation at all, just immediate visual replacement

**Warning signs:**
- Warp factor transition looks smooth then suddenly jumps to the target value
- Evolution overlay lines appear/disappear without interpolation when slices update
- Burst emphasis highlights pop in instead of fading
- Filter changes cause visible "flash" where all points reset position before warping again

**Prevention strategy:**
1. **Animation state outside React:** Store interpolation targets and current values in React refs or a dedicated animation state object (not Zustand or React state). Update these in `useFrame` directly. Read target values from Zustand but write interpolated output to GPU uniforms — don't round-trip through React.
2. **Stable component identity:** Key Three.js objects by persistent IDs (not by render index). Use `useMemo` with stable dependencies for geometries and materials so React reconciliation doesn't destroy/recreate them when parent state changes.
3. **Animation completion callbacks:** When an animation reaches its target, fire a callback (not a React state transition) to advance to the next visual state. This decouples animation timing from React render cycle.
4. **Frame-synchronized state reads:** In `useFrame`, batch all Zustand store reads at the start of the frame using `getState()` (not hooks). This ensures a consistent snapshot for the entire frame and prevents mid-frame state changes from causing discontinuity.

**Phase to address:**
Phase 2 (Temporal Evolution) — evolution trails, aging, and interpolation are the main animation features. Get the animation architecture right here.

---

### Pitfall 8: Cross-Store Synchronization Deadlock

**What goes wrong:**
The app has 20+ Zustand stores (coordination, time, filter, adaptive, slice, cluster, STKDE, UI, heatmap, aggregation, layout, etc.) that all read from and write to each other. State updates can cascade: `FilterStore` → `CoordinationStore` → `TimeStore` → `DataPoints` (uniforms) → `AggregationStore` → `HeatmapOverlay` (FBO re-render). Each step triggers React re-renders in different components. Under rapid user interaction (brush scrubbing, filter toggling), this creates a domino effect where the UI freezes for 100-500ms while stores notify subscribers.

**Why it happens:**
- Zustand subscriptions are synchronous and trigger immediate React re-renders via `useStore` selectors
- The coordination store is supposed to be the "conductor" (`useSelectionSync`) but the actual synchronization is spread across multiple `useEffect` hooks in different components
- `DataPoints` subscribes to 10+ different store slices directly (lines 54–84), bypassing the coordination store entirely
- Each `useEffect` that calls `adaptiveStore.getState().computeMaps()` (in `MainScene`) triggers a new recomputation that writes back to the store, causing another cascade
- There's no rate limiting or batching for store mutations during continuous interaction (brush scrubbing sends events at 60fps)

**Warning signs:**
- Brush scrubbing on the timeline causes visible UI stutter
- Toggling a filter type produces a 200-400ms delay before the view updates
- Multiple "computing..." or "loading..." indicators flash simultaneously
- Chrome DevTools "Recalculating Style" frames take >50ms during interaction

**Prevention strategy:**
1. **Unidirectional data flow enforcement:** Make the CoordinationStore the SINGLE source of truth for interaction state (selection, brush range, active slice, workflow phase). Other stores read from CoordinationStore's output — they don't write back to it. Filter/Adaptive stores are inputs (they write to CoordinationStore, not vice versa).
2. **Debounce rapid mutations:** Use `debounce` (already available as `lodash.debounce` in the project) for store updates during continuous interactions. The brush change events should be debounced so the store sees at most 10 updates/second during scrubbing.
3. **Subscription optimization:** Replace `useStore(store, selector)` subscriptions in R3F components with `useStore(store).getState()` reads in `useFrame`. The `DataPoints` component doesn't need React re-renders for uniform updates — it needs frame-synchronous reads.
4. **Batch cascade writes:** When multiple stores need to update in response to a single user action, batch all writes into one microtask using `React.startTransition` or `queueMicrotask`. The CoordinationStore's `setSelectedIndex` already does this partly — extend to all cascade paths.
5. **Store dependency graph audit:** Document which stores depend on which. The current 58-store ecosystem (see `src/store/` listing) likely has circular or redundant dependencies. Remove any store that can be derived from another.

**Phase to address:**
Phase 1 (Burst Visibility Foundation) — burst visibility adds new visual channels that require new store interactions. This is the time to clean up the store architecture before adding more state.

---

### Pitfall 9: Web Worker Overcontribution for Real-Time Visualization

**What goes wrong:**
The app uses Web Workers for heavy computation (adaptive time warping, STKDE hotspot detection). Workers are correctly used for these batch operations. The pitfall is OVER-using workers for visualization work that should stay on the main thread — or, conversely, NOT using workers for work that should be offloaded. Specifically: per-frame computation (like the `computeMaps` call in `MainScene`'s `useEffect` that triggers on every viewport data change) blocks the main thread even though the result feeds a visualization pipeline.

**Why it happens:**
- The `computeMaps` call (line 71 of `MainScene`) runs on the main thread: `adaptiveStore.getState().computeMaps(timestamps, [minT, maxT])` — this is a synchronous computation on 8.5M records
- The `useEffect` that triggers `computeMaps` fires on every viewport data change (which happens frequently as zoom/pan changes)
- The existing workers (`adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`) are only used for the initial precomputation and for batch hotspot detection — they're not consulted for real-time visual updates
- There's no "is a computation already running" guard — rapid viewport changes can queue multiple `computeMaps` calls that all execute sequentially, each blocking the UI
- The `loadGlobalMaps` fetch request (line 129 of `MainScene`) runs in parallel but the fallback `computeMaps` on failure does not

**Warning signs:**
- Viewport changes during map navigation cause 100-300ms freezes
- Toggling between map and 3D views triggers visible computation lag
- Console logs show repeated "computeMaps" calls stacking up
- The main thread profile shows long (>50ms) synchronous JavaScript tasks

**Prevention strategy:**
1. **Worker-based incremental update:** For viewport-dependent adaptive maps, send computation to the adaptive time worker. The worker can compute the warp map incrementally and post back the result buffer. The main thread never blocks.
2. **Computation deduplication:** Before starting any computation, cancel any in-flight computation for the same key (viewport bounds + time range). Use an abort pattern: `let currentComputation = null; if (currentComputation) currentComputation.abort();`.
3. **Transferable buffers for worker results:** When the worker returns results (Float32Array for warp/density maps), use `postMessage(..., [buffer.buffer])` with transferable ownership. This avoids copying the array data between threads.
4. **Frame budget estimation:** Before dispatching worker work, estimate whether the computation will fit in the remaining frame budget (~12ms at 60fps). If not, defer to next frame or reduce computation scope (e.g., lower bin count for the warp map).
5. **Warm the worker pool:** Pre-allocate the adaptive-time worker on app load so there's no cold-start latency when computation is needed.

**Phase to address:**
Phase 1 (Burst Visibility Foundation) — burst computation is the primary consumer of viewport-triggered adaptive work. Offload it to workers before scaling up visualization features.

---

### Pitfall 10: Evaluation-Antipattern — Inconsistent Interactions Across Views

**What goes wrong:**
Users can select a crime point in the 3D cube (click → `setSelectedIndex`), brush on the timeline, and click on the map — but these interactions have subtly different behaviors. Clicking in the cube selects by instance ID, brushing on the timeline filters by time range, and clicking on the map selects by geographic location. These produce different coordination store states that downstream components interpret inconsistently.

**Why it happens:**
- `useSelectionSync` tries to reconcile these but only handles cube→timeline (scroll to point time) and cube→slices (activate containing slice). It does NOT handle timeline→cube or map→cube synchronization.
- The coordination store's `selectedIndex` and `selectedSource` track which view initiated the selection, but there's no logic to convert between representations (instance ID vs time range vs geographic point)
- `DemoMapVisualization` and `Demo3dSpatialView` use different store overrides (`useDashboardDemoCoordinationStore` vs `useCoordinationStore`) — they can drift apart
- The `brushRange` in coordination store (timeline brush) is completely independent of `selectedIndex` (cube click) — there's no code that says "when brush range changes, interpret selection differently"

**Warning signs:**
- Clicking a point in the cube scrolls the timeline but doesn't highlight the point on the map
- Brushing the timeline filters the 3D view but the map shows old filter state
- The coordination store's `syncStatus` frequently shows `'partial'` or `'syncing'`
- Usability test participants say "I clicked here but nothing changed there"

**Prevention strategy:**
1. **Interaction representation model:** Define a canonical interaction representation that all views can produce and consume — e.g., `{ timeRange: [number, number], spatialBounds: [number, number, number, number], instanceIds?: number[] }`. Each view maps its native interaction to this model. The coordination store broadcasts this model to all views.
2. **View-transformer pattern:** For each view, implement a transformer function that converts the canonical interaction to view-specific state: `cubeTransformer(canonical) → selectedIndex`, `mapTransformer(canonical) → featureId`, `timelineTransformer(canonical) → brushRange`.
3. **Sync status enforcement:** Any interaction that produces a `syncStatus: 'syncing'` must produce a matching `'synchronized'` within one animation frame. Implement a timeout that warns (in dev) if sync takes longer.
4. **Unified store for interactive views:** Use a SINGLE coordination store across all views in the demo shell. Currently `useCoordinationStore` and `useDashboardDemoCoordinationStore` are separate — this is the root cause of view drift.
5. **Interaction trace logger:** Add a dev-mode logger that records every interaction and its propagation through views. This makes synchronization bugs visible during development instead of discovered during evaluations.

**Phase to address:**
Phase 8 (Usability Evaluation Readiness) — this phase specifically targets evaluation readiness. However, the unified coordination store fix should be in Phase 1 since it affects all subsequent development.

---

### Pitfall 11: Hidden Visualization States That Confuse Evaluation

**What goes wrong:**
During usability evaluations, participants encounter visualization states that the evaluator cannot reproduce or understand. The warp factor slider is at 0.7, the density metric is "burstiness" with threshold 0.6, the time range is filtered to Q2 2023, and the camera has been freely rotated for 30 seconds. This exact state is almost impossible to reproduce for the next participant, making between-subject comparisons invalid.

**Why it happens:**
- Camera position, zoom, and rotation are not stored in any persistent state — they're local to the `CameraControls` ref
- The app has 20+ parameters controlling the visualization (warp factor, burst threshold, density metric, time range, type filter, district filter, spatial bounds, context opacity, show heatmap, slice opacity, view mode, etc.) — no single "state capture" mechanism
- The `CubeVisualization` component reads from multiple stores but writes a debug overlay that shows current state — this is helpful but doesn't allow replay or sharing
- `CameraControls.reset()` resets the camera but doesn't reset visualization parameters — so "reset view" means different things to different participants
- Non-deterministic elements: `lodash.debounce` timers, async data fetching, and `MathUtils.damp` interpolation mean the same settings can produce different visual states depending on timing

**Warning signs:**
- Evaluation notes say "participant saw X" but the evaluator can't reproduce X
- Different participants' sessions show different default visualization states
- Bug reports mention states that the developer can't reproduce
- The "export state" feature request comes up in every evaluation

**Prevention strategy:**
1. **Visualization state serialization:** Create a `VisualizationState` type that captures all parameters: camera position/target, warp factor, filters, time range, slice visibility, view mode, etc. Implement `serialize()` and `deserialize()` that produce a URL hash or query string.
2. **State replay in dev mode:** Add a keyboard shortcut (e.g., `Ctrl+Shift+E`) that copies the current state as a URL. Opening that URL reproduces the exact visualization state, including camera position.
3. **Evaluation parameter lock:** During evaluations, lock the visualization to a known set of parameters unless the participant specifically adjusts them. Log all adjustments with timestamps.
4. **Deterministic animation paths:** When `animate` is requested, always animate from the current state to the target state over a fixed duration (not frame-dependent delta). This makes timing more predictable.
5. **Reset-to-baseline function:** One click that resets ALL state (camera, filters, warp factor, slices, view mode) to the application default — not just camera position.

**Phase to address:**
Phase 8 (Usability Evaluation Readiness) — serialization and replay are evaluation-hardening features. However, the state capture architecture should be designed in Phase 1 to avoid retrofitting.

---

### Pitfall 12: Over-Animated Transitions That Obscure Data Changes

**What goes wrong:**
Smooth transitions (warp factor blending, slice fade-in/out, burst intensity ramp) create a visually appealing experience but make it harder for users to compare states. When the warp factor transitions from 0 to 1 over 500ms, the user cannot tell "is this point in this position because of the data or because of the transition?" Similarly, slice highlight fade-in can obscure when a new point enters the slice.

**Why it happens:**
- The `MathUtils.damp` interpolation (line 381-387 of `DataPoints`) continuously smooths the warp factor — it never arrives at the exact target until several frames later
- `BurstEvolutionOverlay` and `EvolutionFlowOverlay` have no explicit transition timing — they appear/disappear based on store state changes
- The `BurstEvolutionOverlay` uses a sphere mesh with `radius: Math.max(0.55, 0.55 + score * 0.55)` — this changes size based on burst score but without any interpolation, creating visual pops
- There's no visual indication that "the transition is still in progress" vs "the visualization is settled" — users assume what they see is the final state
- Cosine interpolation or custom easing functions could provide psychologically smoother transitions, but no easing is applied — just linear damp

**Warning signs:**
- Users make decisions based on intermediate animation states ("the point was in that cluster for a moment")
- Comparative analysis tasks take longer than expected because users wait for animations to settle
- Animation artifacts (e.g., points passing through each other during warp transition) are mistaken for data patterns
- The "warp transition makes spatial patterns illegible" feedback appears in evaluations

**Prevention strategy:**
1. **Settled-state indicator:** Change a visual cue (subtle halo, axis label color, or a small dot in the corner) when ALL animations have reached their target values. This tells users "this is the real view."
2. **Skip-animation mode:** Provide a toggle (e.g., holding Shift) that snaps directly to the target state without animation. This is critical for comparison tasks where animation would confuse the comparison.
3. **Animation policy:** Define a clear animation policy: transitions between analytical states should be ≤200ms (short enough to not confuse, long enough to avoid pop). Only orientation/decorative transitions get longer durations.
4. **Interpolation with constant-time arrival:** Replace `MathUtils.damp` (which asymptotically approaches the target) with a constant-time lerp that guarantees arrival at the target within a fixed number of frames. This prevents the "never quite settled" feel.
5. **Ease-out for analysis, ease-in-out for orientation:** Use `easeOutCubic` for analytical changes (quick start, slow finish so the user sees the final state soon) and `easeInOutCubic` for camera/orientation changes (smooth throughout).

**Phase to address:**
Phase 2 (Temporal Evolution) — the animation policy should be established when the first animated visualizations (evolution trails, aging) are built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `frustumCulled={false}` on DataPoints | Prevents points from disappearing when camera angles hide them | GPU processes all 8.5M points every frame | NEVER in production — fix culling calculation |
| Individual `useEffect` for each uniform | Easy to add new uniform during development | 10+ effects create unpredictable recompilation, hard to debug | Only during initial development; consolidate before milestone |
| Separate coordination stores per-demo (`useCoordinationStore` + `useDashboardDemoCoordinationStore`) | Isolates demo shell changes from legacy | View state drifts, inconsistent behavior, hard to reason about | Never — merge into single store |
| Per-segment `<line>` elements in BurstEvolutionOverlay | Simple to implement, easy to style individually | Each line is a separate draw call, creates 20+ geometries | Only if segment count is guaranteed <5; current code creates N per slice pair |
| Templates in shader source strings (`${typeMapSize}`) | Enables dynamic shader generation | Forces WebGL recompilation on every change | Never for runtime values — use uniforms for dynamic, compile-time only for hardware limits |
| React state for animation targets (`const [showOverlay, setShowOverlay]`) | Familiar React pattern | Animation bounces through React reconciliation, causes jitter | For UI chrome transitions only; not for in-scene animation |
| `computeMaps` on main thread for viewport changes | Simpler code, no worker communication overhead | Blocks main thread for 50-200ms during continuous interaction | Only when data size is <100K points; at 8.5M, must use worker |
| InstancedMesh with all 8.5M points always loaded | Single mesh, simple raycasting, uniform management | Full VRAM usage regardless of zoom level, no LOD | Acceptable for MVP target of specific zoom level; not for general exploration |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| R3F Canvas over MapLibre | Both renderers use WebGL context 0, causing context loss when switching | Use `gl={canvas => new THREE.WebGLRenderer({ canvas, context: mapLibre.getGLContext() })}` OR fully unmount Canvas when hidden |
| MapLibre tiles → R3F texture | Calling `map.getCanvas().toDataURL()` or `readPixels` synchronously on every frame | Use the canvas reference directly and set `texture.needsUpdate = true` on map `idle` events |
| Zustand store → `useFrame` uniform sync | Using `const value = useStore(store, s => s.value)` in component body, then accessing in `useFrame` | Use `store.getState().value` in `useFrame` to avoid React re-render costs |
| Web Worker → Float32Array transfer | `postMessage({ data: array })` copies the buffer (2x memory) | `postMessage({ data: array.buffer }, [array.buffer])` transfers ownership (zero-copy) |
| CameraControls → R3F Canvas | Creating new `CameraControls` on every state change (key changes re-mount component) | Create once, use `ref` to access, only call `.setLookAt()` on target changes |
| DuckDB → client visualization | Fetching full 8.5M records for every filter change | Use DuckDB's aggregation capabilities (GROUP BY, COUNT) to send pre-aggregated data; use Apache Arrow for streaming large results |
| Radix UI overlay → R3F Canvas | Radix dialog/popover mounted over Canvas blocks pointer events but Canvas still processes events | Set `pointerEvents: 'none'` on Canvas when a modal is open, restore on close |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 8.5M InstancedMesh spheres | VRAM > 3.5GB, frame rate < 15fps at full zoom-out | LOD: switch to aggregated density at camera distance > 100 units | Works at 100K, breaks at 1M+ points |
| Individual materials per slice | Chrome DevTools shows 30+ draw calls for slice overlays | Share one ShaderMaterial across all slices, pass per-slice data as uniforms | Works at 3 slices, breaks at 10+ |
| `onBeforeCompile` for shader patching | Visible 100ms pause when toggling filters (program recompile) | Eliminate dynamic templates in shader source; use uniforms for all config | Breaks as soon as a user changes any filter |
| FBO texture creation in `useMemo` per render | Frame rate drop from texture uploads, stale textures accumulate | Pool FBOs, reuse them, dispose explicitly in `useEffect` cleanup | Subtle at first, catastrophic after repeated view changes |
| MapLibre + R3F both rendering | GPU utilization 2× higher in map mode than 3D-only mode | Unmount inactive renderer, or share GL context | Always (structural — map mode always has this overhead) |
| Series-parallel `useEffect` cascade | 200-400ms delay after single filter toggle | Consolidate to one store mutation per user action, use `startTransition` | Gets worse as more stores are added |
| Per-frame `computeMaps` on viewport change | Main thread blocked for 50-200ms during zoom/pan | Move to Web Worker with transferable result buffers | Breaks with any zoom/pan interaction on full dataset |
| `depthWrite: false` on multiple overlays | Overlay z-fighting, disappearing slice planes, incorrect occlusion ordering | Set `polygonOffset` on overlay materials, keep `depthWrite: true` when possible | Subtle artifacts that compound with more overlays |
| `lodash.debounce` on store updates | Delayed visual feedback, state inconsistency with fast interactions | Use `requestAnimationFrame` throttle instead of time-based debounce for visual updates | Depends on debounce timeout vs frame rate mismatch |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Free-camera orbit in 3D cube | User loses spatial orientation, cannot relate 3D to map | Constrained pitch (±15° from horizontal), north-up snap button |
| Warp factor animation obscures pattern comparison | User can't tell which points moved due to warp vs which moved from different data | Settled-state indicator + skip-animation mode (hold Shift) |
| 20+ visualization parameters with no presets | Users get lost in configuration, cannot reproduce interesting views | Named presets (capture all state) + URL-based state sharing |
| Color encoding by crime type only | Dense areas show all colors blending to brown; legend has 36 categories | Combine type color with density encoding; limit legend to 8-10 categories maximum |
| Occluded points in dense areas | User thinks "this area has no data" when it actually has buried points | Automatic density overlay when occlusion is detected; depth-peeling in inspect mode |
| No spatial reference in 3D (no grid, no north, no basemap) | "Which way is north?" every session | Axis labels, translucent basemap texture, compass rose, eagle-eye minimap |
| Separate map and 3D views (toggle, not overlay) | User must mentally map between views, context-switch cost | Default to MapLibre as basemap under transparent 3D canvas (when GPU budget allows) |
| Animation never settles (asymptotic damp) | User waits for transition to finish before analyzing | Constant-time arrival animation with explicit completion signal |

---

## "Looks Done But Isn't" Checklist

- [ ] **LOD system:** The `uLodFactor` dither only affects fragment discard, not vertex count. Points still cost the same to transform. True LOD (switch from instances to aggregated view) is missing.
- [ ] **VRAM cleanup:** `useEffect(() => () => texture.dispose())` exists for warpTexture and densityTexture but NOT for the heatmap FBO, aggregation geometry, or per-slice textures.
- [ ] **R3F Canvas unmount:** When switching from 3D to map mode, the Canvas is hidden with CSS (`z-10 pointer-events-none`). The WebGL context is NOT released. GPU memory persists.
- [ ] **Shader recompilation guard:** The `onBeforeCompile` function has no `customProgramCacheKey` — every filter change can trigger recompilation. Needs a stable shader key.
- [ ] **Cross-store consistency:** `useCoordinationStore` and `useDashboardDemoCoordinationStore` both exist. They can have different `selectedIndex`, `brushRange`, or `syncStatus`. No reconciliation logic exists.
- [ ] **Worker result transfer:** `computeMaps` returns `Float32Array` from worker but it's copied, not transferred. For 8.5M records, this is 68MB of copying per call.
- [ ] **Animation completion callback:** `MathUtils.damp` never completes. The animation asymptotically approaches the target. No callback fires when "done enough" (e.g., within 0.5% of target).
- [ ] **State serialization:** No mechanism to capture and replay visualization state. Camera position, filter settings, warp factor, and slice state cannot be shared or reproduced.
- [ ] **Occlusion detection:** No code measures whether points are visually occluded. The view looks different from the data.
- [ ] **Reset-to-baseline:** `triggerReset` in `handleReset` only resets the camera (`controlsRef.current.reset(true)`). Filters, warp factor, and other state persist.
- [ ] **Map ↔ 3D sync:** When switching views, the 3D camera position does not correspond to the map's current viewport. No coordinate transformation exists between the two.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| GPU memory saturation | HIGH — requires tab reload, possible data loss | 1. Kill all Three.js geometries via `dispose()` 2. Release WebGL context 3. Reload only visualization module 4. Detect 80%+ VRAM usage and warn user proactively |
| Shader recompilation cascade | MEDIUM — causes UX jitter but no data loss | 1. Implement `material.customProgramCacheKey` 2. Warm shader cache at startup 3. Implement uniform batching to reduce per-frame recompile triggers |
| Cross-store state drift | MEDIUM — inconsistent views degrade usability | 1. Pause all view updates 2. Read canonical state from CoordinationStore 3. Push to each view one at a time 4. Verify all views show identical state |
| Worker computation pileup | LOW — wasted computation but auto-corrects | 1. Abort all in-flight worker tasks 2. Dispatch single consolidated computation 3. Implement debounce on future dispatches |
| Camera disorientation | LOW — user clicks "reset" button | 1. Implement smooth camera transition to north-up 2. Show compass overlay during transition 3. Save/restore camera state in store for "back to previous view" |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — GPU Memory from Instanced Geometry | Phase 1 (Burst Visibility) | VRAM monitoring shows 70%+ headroom with full dataset; `frustumCulled` enabled and verified |
| 2 — Draw-Call Explosion from Per-Slice | Phase 1 (Burst Visibility) | DevTools shows <30 render calls in scene with 10+ slices active |
| 3 — Shader Compilation Stalls | Phase 1 (Burst Visibility) | Performance tab shows zero "Shader Compile" events during normal filter interaction |
| 4 — MapLibre + R3F Double Rendering | Phase 2 (Temporal Evolution) | GPU utilization same in map mode as 3D-only mode; Canvas unmounts fully when hidden |
| 5 — Camera Disorientation | Phase 3 (Spatial Orientation) | Test users can identify north in 3D view without asking; camera resets to consistent default |
| 6 — Occlusion-Driven Info Loss | Phase 4 (Dense Data Readability) | Point count from query matches visually counted density in occluded regions |
| 7 — Animation Jitter from Re-renders | Phase 2 (Temporal Evolution) | `useFrame` stores all state in refs; animations reach target within 2% in constant time |
| 8 — Cross-Store Synchronization Deadlock | Phase 1 (Burst Visibility) | Filter change cascade completes within one frame (<16ms); no redundant store writes |
| 9 — Web Worker Overcontribution | Phase 1 (Burst Visibility) | `computeMaps` runs in worker; main thread shows no >16ms tasks during viewport change |
| 10 — Inconsistent Interactions | Phase 1 (design) + Phase 8 (verify) | Single CoordinationStore; all views produce identical canonical interaction model |
| 11 — Hidden Visualization States | Phase 8 (Evaluation Readiness) | State serialization captures all 20+ parameters; URL-based replay reproduces exact view |
| 12 — Over-Animated Transitions | Phase 2 (Temporal Evolution) | Animation duration <200ms for analytical state changes; skip-animation mode available |

---

## Sources

- The existing codebase (reverse-engineered from `src/` for current patterns): DataPoints (`src/components/viz/DataPoints.tsx`), ghosting shader (`src/components/viz/shaders/ghosting.ts`), heatmap pipeline (`src/components/viz/HeatmapOverlay.tsx`), MainScene (`src/components/viz/MainScene.tsx`), Scene (`src/components/viz/Scene.tsx`), TimeSlices (`src/components/viz/TimeSlices.tsx`), BurstEvolutionOverlay (`src/components/viz/BurstEvolutionOverlay.tsx`), DashboardDemoShell (`src/components/dashboard-demo/DashboardDemoShell.tsx`), Demo3dSpatialView (`src/components/dashboard-demo/Demo3dSpatialView.tsx`), Stkde3DScene (`src/app/stkde-3d/components/Stkde3DScene.tsx`), coordination store (`src/store/useCoordinationStore.ts`), selection sync (`src/hooks/useSelectionSync.ts`)
- Three.js performance best practices (official): https://threejs.org/manual/#en/optimize-lots-of-objects — instancing, merging, LOD
- React Three Fiber performance guide: https://docs.pmnd.rs/react-three-fiber/advanced/performance — avoiding re-renders, useFrame patterns, dispose
- MapLibre custom layer render (WebGL context sharing): https://maplibre.org/maplibre-gl-js/docs/API/ — `Map.addLayer` with custom `render` function
- Web Workers + Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers — zero-copy ArrayBuffer transfer
- Evaluate visualization spatial orientation: https://graphics.wikia.org/wiki/Occlusion_culling — depth-peel technique for dense point cloud rendering
- Shader compilation best practices: https://webglfundamentals.org/webgl/lessons/webgl-boilerplate.html — program caching, `getProgramParameter(ACTIVE_UNIFORMS)` for debug
- Zustand performance patterns: https://github.com/pmndrs/zustand — selector-based subscriptions, `getState()` vs hooks, `subscribeWithSelector`
- Lodash debounce vs RAF throttle: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame — for visual synchronization, RAF is frame-accurate

---

*Pitfalls research for: Visualization Level-Up — Burst Visibility, Temporal Evolution, Spatial Orientation, Dense Data Readability, Evaluation Readiness*
*Researched: 2026-05-26*
