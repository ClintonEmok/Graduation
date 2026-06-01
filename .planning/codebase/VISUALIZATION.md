# Visualization Strategies and Techniques

## Overview

The Adaptive Space-Time Cube prototype employs a coordinated multi-view visualization system for exploratory analysis of spatiotemporal crime patterns. Three views (3D cube, 2D map, timeline) are synchronized through a shared state model, allowing users to brush, filter, and inspect crime events across space and time.

The system processes ~8.5M crime records from the Chicago Police Department via a local DuckDB database, rendering aggregated views at interactive frame rates through GPU-accelerated techniques.

---

## 1. 3D Rendering Pipeline

### Stack
- **Three.js 0.182** via **React Three Fiber (R3F) 9.5**
- **drei 10.7** — CameraControls, shaderMaterial, Html labels, PerformanceMonitor
- Custom **ShaderMaterial** for burst-emphasized heatmap rendering

### Scene Composition
- One shared `<Canvas>` per 3D widget
- Orthographic-like composition with constrained perspective camera (fov: 38)
- CameraControls with polar angle limits (minPolarAngle, maxPolarAngle) for analytical orientation
- Ambient + two directional lights for consistent slab/volume illumination
- Map tile substrate as a textured plane at `y = -38`, captured from a hidden MapLibre instance

### Slice Rendering (StkdeSliceStack)
- **Depth-aware volumetric slabs** — each slice renders as a box geometry whose thickness encodes the slice's temporal duration (normalized across the visible window)
- **Surface heatmap** — KDE intensity is accumulated on the GPU via a `DataTexture` passed to a custom `ShaderMaterial`. The GLSL fragment shader loops over KDE cells (`texelFetch`), applies a Gaussian kernel with burst-confidence-weighted sigma, and maps accumulated intensity through a 6-stop color ramp (blue → cyan → green → yellow → orange → red)
- **Overlap handling** — volumetric falloff tapers slab width when durations vary between adjacent slices
- **Active slice emphasis** — brighter surface, white ring, reduced opacity on non-adjacent slices
- **GPU KDE** — `BurstSliceShaderMaterial` accumulates KDE cells on-device rather than via CPU Canvas2D → texture upload

### Temporal Evolution
- **Playback loop** — cycles `activeSliceIndex` through ordered slices with adjustable speed
- **Interpolation** — opt-in linear cell-wise morph between consecutive slices (`interpolateKdeCells` from `easing.ts`) using `easeInOutCubic` over `TRANSITION_DURATION_MS = 400ms`
- **Aging trails** — ghosted layers with short-lived persistence, opacity decays exponentially with temporal distance from the active slice (`agingOpacity` from `aging.ts`)

### Point Rendering (DataPoints)
- InstancedMesh with custom `onBeforeCompile` shader patching for:
  - Per-instance type color mapping (`uTypeMap[36]`)
  - Per-instance district filtering (`uDistrictMap[36]`)
  - Burst score ghosting (opacity modulation, checkerboard dither at distance)
  - Adaptive time warp (Y-position lerp between linear and warped positions)
- LOD factor driven by camera distance via `useFrame` uniform update
- Frustum culling enabled (removed `frustumCulled={false}` from all 8.5M points)

---

## 2. Map Visualization

### Stack
- **MapLibre GL 5.17** via **react-map-gl 8.1**
- **deck.gl 9.3** HeatmapLayer via `MapboxOverlay` for GPU-accelerated density
- MapLibre's built-in CPU heatmap was replaced to avoid bottleneck at scale

### Layers
- **Base map** — CartoDB dark-matter style (tile server)
- **Deck.gl heatmap** — GPU-accumulated density from crime positions (`lon, lat`), with `getWeight` driven by `burstScore` or uniform weight
- **Event points** — circle layer (MapLibre) with type-based color coding, filtered by viewport bounds and active slice time range
- **STKDE hotspot overlay** — clustered hotspot polygons rendered via MapLibre fill-extrusion layer, colored by intensity score
- **Active slice label** — temporal extent annotation when a slice is active ("Slice: [name]")

### Performance Strategy
- Crime data fetched for viewport bounds + time range on every viewport change
- Data filtered to 50K row limit per request (`/api/crimes/range`)
- Deck.gl HeatmapLayer uses GPU for aggregation, staying responsive at ~8.5M records

---

## 3. Timeline Visualization

### Stack
- **@visx** (SVG) — axis, brush, scale, shape, gradient, curve
- **d3** — brush, selection, zoom, time scale, array operations
- **date-fns** — date formatting

### DualTimeline Architecture
- **Overview timeline** — full temporal extent with aggregate crime count histogram
- **Detail timeline** — zoomed time window with per-burst bars and slice geometry overlays
- Both rendered as SVG, with Canvas overlay for brush selection

### Slice Encoding
- `burstScore` modulates bar/surface opacity in burst-emphasized mode
- Slice geometries rendered as colored rectangles with temporal extents
- Active slice highlighted via `activeSliceId` propagation (bridged from coordination store)
- Adaptive time warping drawn as non-linear time axis when warp mode is active

### Brushing
- D3 brush on overview timeline sets the detail window
- D3 brush on detail timeline selects a time range for burst detection
- Range propagated to coordination store → consumed by detect panel and map filters

---

## 4. Spatiotemporal Density Estimation (STKDE / KDE)

### Computation
- **KDE algorithm** (`src/lib/kde/compute.ts`): Gaussian kernel density estimation over 2D spatial grid cells
- Grid config: 256×256 cells over Chicago bounds, ~100m resolution
- Kernel bandwidth computed from median nearest-neighbor distance with adaptive scaling
- Support count per cell tracks how many crime events contribute

### STKDE Hotspot Detection
- Pipeline: crime data → grid binning → Gaussian smoothing → peak detection → hotspot clustering
- Peak detection: local maxima above `minSupport` threshold
- Hotspot polygons: DBSCAN clustering of high-intensity cell groups
- Time window: per-slice peak time computed from temporal distribution

### Rendering Strategy Evolution
1. **Phase 76 (before)**: CPU Canvas2D → `CanvasTexture` → `MeshBasicMaterial` per slice
2. **Phase 78 (now)**: GPU ShaderMaterial with `DataTexture` containing KDE cells, accumulated via GLSL fragment loop
3. **Worker offload**: `kdeSlice.worker.ts` runs `computeSliceKde()` off the main thread, returns transferable `Float32Array.buffer`

### Grid cell limitations
- MAX_CELLS = 256 in the shader (hardcoded `#define MAX_CELLS 256`)
- If cell count exceeds limit, only the first 256 cells contribute to the rendered surface
- Cells are serialized as flat `[x, z, intensity, support]` quads for zero-copy transfer

---

## 5. Burst Detection and Temporal Encoding

### Burst Taxonomy
- Defined in `src/lib/binning/burst-taxonomy.ts` — `classifyBurstWindow()` produces: `burstClass` (high, medium, low), `burstScore` (0–1 normalized), `burstConfidence` (0–1)
- BurstScore derived from crime count deviation from rolling baseline
- BurstConfidence reflects kernel tightness — high confidence → narrow kernel, low confidence → wider falloff

### Visual Encoding
- Not a spatial signal — burst is a temporal window classification (not rendered on the map per BVS-03)
- In the 3D cube: `burstScore` modulates surface opacity and color in burst-emphasized mode
- In the timeline: `burstScore` modulates bar/geometry opacity
- `burstViewMode` toggle switches between `'density'` (raw KDE) and `'burst-emphasized'` (burst-weighted)

### Color Scale
- Canonical 8-stop ramp in `src/lib/viz/burst-color-scale.ts`:
  - Blue → cyan → green → yellow → orange → red (shared across cube and timeline)
  - Legend renders as gradient bar with `BurstIntensityLegend` component

---

## 6. Adaptive Time Scaling

### Motivation
Crime events cluster in time (bursts) with long sparse intervals. A uniform timeline hides burst structure.

### Approach
- `src/lib/adaptive/` computes a time-warp function that expands burst windows and compresses sparse intervals
- Density map: histogram of crime counts over time bins
- Warp map: cumulative density function mapped to output domain
- Two modes: `'linear'` (uniform time) and `'adaptive'` (density-driven warp)

### Integration
- Applied in the 3D cube: per-point Y-position is a lerp between linear and warped position (`transitionRef.current` in useFrame)
- Timeline axis optionally renders with adaptive spacing
- Stored in `useDashboardDemoCoordinationStore` as shared warp state

---

## 7. Data Processing Pipeline

### Offline Analytics
- **DuckDB 1.4.4** — local OLAP database, processes 8.5M+ crime records
- **Apache Arrow 21.1.0** — columnar data transport format
- Crime data from Chicago Police Department (CLEAR/CPD API source), loaded from local CSV files

### Server-Side Queries
- `/api/crimes/range` — filtered crime records by epoch range + buffer
- `/api/crime/bins` — time-binned crime counts
- `/api/stkde/hotspots` — full STKDE computation
- `/api/adaptive/global` — adaptive time scaling data

### Client-Side Workers
- `adaptiveTime.worker.ts` — adaptive time calculations off the main thread
- `kdeSlice.worker.ts` — per-slice KDE computation, returns transferable Float32Array

---

## 8. Interaction Model and Coordination

### State Management (Zustand)
- **`useDashboardDemoCoordinationStore`** — centralized cross-view state: `activeSliceIndex`, `selectedIndex`, `viewMode` (stack/focus), `burstViewMode`, temporal playback settings (`inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectInterpolation`, `inspectTrailEnabled`), volume settings, warp state, STKDE params
- **`useSliceDomainStore`** — slice lifecycle (add, remove, merge, split), `activeSliceId` for timeline sync
- **`useDashboardDemoTimeslicingModeStore`** — burst generation, draft bins, apply pipeline
- **`useDashboardDemoFilterStore`** — time range presets

### Cross-View Coordination
- **Bridge effect**: when `activeSliceIndex` changes in coordination store, an effect propagates it to `activeSliceId` in the domain store (enables timeline highlight)
- **Map filter**: map reads `activeSliceIndex` to compute `sliceTimeRange` and filter events
- **Playback loop**: setInterval-driven cycle of `activeSliceIndex` in `DemoInspectPanel`, with pause on scrub and brief pause on loop restart
- **Selection**: `selectedIndex` propagated to both 3D scene and map for point-level inspection

---

## 9. Motion and Animation

### Primitives (src/lib/motion/)
- **`easing.ts`** — `lerp`, `Easing.easeOutCubic`, `Easing.easeInOutCubic`, `Easing.power2InOut`, `interpolateKdeCells` (map-based cell merge with per-cell lerp)
- **`aging.ts`** — `agingOpacity` (exponential decay by slice distance), `trailIntensity` (frame-age decay), `AgingConfig`
- No GSAP used in the final implementation — all transitions are `lerp` + `useFrame` (Three.js frame loop)

### Temporal Transitions
- Active slice switch: GSAP-like camera fly-through was planned but removed — current implementation uses immediate camera lookAt for analytical clarity
- Interpolation: per-cell KDE intensity morph with `easeInOutCubic` easing, gated by playback + interpolate toggle
- Aging trails: per-slice opacity decays at `decayPerStep: 0.35` with floor at `0.05`

---

## 10. Volumetric Duration Encoding (Phase 77)

### Purpose
Make temporal duration (slice length in seconds) directly visible as spatial depth/thickness in the 3D widget.

### Implementation
- `src/app/stkde-3d/lib/volume-encoding.ts` — `buildDurationVolumeProfile()` computes per-slice:
  - `thickness`: normalized duration mapped to slab height (min 0.3, max based on window)
  - `opacity`: slab fill opacity proportional to relative duration
  - `falloff`: taper factor for surface plane size (shorter = more falloff = smaller surface)
- Normalization is relative to the currently visible slice set — same duration reads same across windows
- Settings stored in `useDashboardDemoCoordinationStore` (scale, exaggeration, normalization)
- Applied in `StkdeSliceStack` via `boxGeometry` (thickness) + `planeGeometry` (falloff-adjusted surface)

---

## 11. Rendering Performance Strategy

### Before (Phase 76 baseline)
- All 8.5M instanced points: `frustumCulled={false}` → every vertex processed every frame
- KDE heatmap: CPU Canvas2D → `CanvasTexture` upload per slice → main thread blocking
- Shader: template-literal array sizes → recompilation on every filter change
- Store state: 3 drift-prone stores with redundant selectors

### After (v3.2)
- Frustum culling enabled on all geometry
- KDE worker offload: main thread freed from slice density computation
- Stable `customProgramCacheKey` (`'ghosting-v3-stable'`) — no recompilation stalls
- Store consolidation: 8 → 6 stores, merged adaptive/warp/analysis into coordination store
- GPU heatmap (deck.gl) replaces CPU MapLibre heatmap on the map
- ShaderMaterial GPU KDE accumulation replaces CPU Canvas2D texture generation in the 3D widget

---

## 12. Color Encoding Strategy

| Channel | Map | 3D Cube | Timeline |
|---------|-----|---------|----------|
| Crime type | Circle color (MapLibre) | Per-instance color (uTypeMap) | Bar fill |
| KDE intensity | Heatmap (deck.gl) | ShaderMaterial ramp (blue→red) | Slice surface opacity |
| BurstScore | Not encoded (map is density-only) | Surface opacity/color boost | Bar/geo opacity modulation |
| Active slice | Temporal extent label | White ring, brighter surface | Highlighted geometry |
| Duration | Not encoded | Volumetric thickness | Slice geometry width |

---

## Key Files

### Core Pipeline
| File | Purpose |
|------|---------|
| `src/app/stkde-3d/components/StkdeSliceStack.tsx` | Depth-aware slice rendering, interpolation, aging trails |
| `src/app/stkde-3d/shaders/burst-slice-shader.ts` | GPU KDE accumulation ShaderMaterial |
| `src/components/viz/DataPoints.tsx` | Instanced 8.5M crime points with ghosting shader |
| `src/components/map/DeckGlHeatmapOverlay.tsx` | GPU heatmap overlay on MapLibre |
| `src/components/map/MapVisualization.tsx` | Map orchestration with event layers |
| `src/components/timeline/DualTimelineSurface.tsx` | SVG timeline with slice geometries |
| `src/lib/kde/compute.ts` | KDE algorithm |
| `src/lib/stkde/compute.ts` | STKDE hotspot detection pipeline |
| `src/lib/binning/burst-taxonomy.ts` | Burst classification (score, class, confidence) |

### State
| File | Purpose |
|------|---------|
| `src/store/useDashboardDemoCoordinationStore.ts` | Central coordination store |
| `src/store/useSliceDomainStore.ts` | Slice lifecycle and domain state |
| `src/store/useDashboardDemoTimeslicingModeStore.ts` | Burst generation and apply pipeline |

### Motion
| File | Purpose |
|------|---------|
| `src/lib/motion/easing.ts` | Easing functions and KDE cell interpolation |
| `src/lib/motion/aging.ts` | Slice opacity decay and trail intensity |
| `src/app/stkde-3d/lib/volume-encoding.ts` | Duration-to-volume normalization |

### Workers
| File | Purpose |
|------|---------|
| `src/workers/kdeSlice.worker.ts` | Off-main-thread KDE computation |
| `src/workers/adaptiveTime.worker.ts` | Off-main-thread adaptive time scaling |

### Orchestration
| File | Purpose |
|------|---------|
| `src/components/dashboard-demo/Demo3dSpatialView.tsx` | 3D widget entry point, playback wiring |
| `src/components/dashboard-demo/DemoInspectPanel.tsx` | Playback loop, scrubber, interpolation toggle |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | Layout, shell coordination, legend |
