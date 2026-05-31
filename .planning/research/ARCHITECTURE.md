# Architecture Research — Visualization Level-Up

**Domain:** Spatiotemporal crime visualization with adaptive space-time cube
**Researched:** 2026-05-26
**Confidence:** HIGH (sourced from existing codebase analysis, verified via Context7 for R3F/post-processing capabilities)

## System Overview

### Current Architecture (v3.1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DashboardDemoShell                              │
│  ┌──────────────────────────────────────┐  ┌──────────────────────┐  │
│  │          Shared Viewport              │  │   Rail Tabs (5)      │  │
│  │  ┌──────────┐  ┌──────────────────┐   │  │  ┌──────────────┐   │  │
│  │  │ Map OR   │  │ Timeline Panel    │   │  │  │Scan         │   │  │
│  │  │ 3D View  │  │ (DualTimeline)    │   │  │  │Detect       │   │  │
│  │  │ (toggle) │  │ SVG + @visx       │   │  │  │Slices       │   │  │
│  │  └──────────┘  └──────────────────┘   │  │  │Inspect      │   │  │
│  └──────────────────────────────────────┘  │  │Configure    │   │  │
│                                            │  └──────────────┘   │  │
│                                            └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

3D Pipeline (current):
┌─────────────────────────────────────────────────────────────┐
│ Demo3dSpatialView                                            │
│  ├─ Fetches crime data per slice via /api/crimes/range       │
│  ├─ Computes KDE in main thread (computeSliceKde)           │
│  └─ Stkde3DScene (R3F Canvas)                                │
│      ├─ MapTileSource (hidden MapLibre → CanvasTexture)     │
│      ├─ StkdeSliceStack                                     │
│      │   └─ Canvas2D → texture → planeMesh (no shaders)     │
│      ├─ RawEventPoints (THREE.Points)                       │
│      └─ CameraControls (static position)                    │
└─────────────────────────────────────────────────────────────┘

Map Pipeline (current):
┌─────────────────────────────────────────────────────────────┐
│ DemoMapVisualization                                         │
│  └─ MapVisualization (MapLibre GL + react-map-gl)            │
│      ├─ MapBase (map container)                              │
│      ├─ MapEventLayer (points)                               │
│      ├─ MapHeatmapOverlay (heatmap)                          │
│      ├─ MapStkdeHeatmapLayer (STKDE from API)                │
│      ├─ MapClusterHighlights / MapTrajectoryLayer            │
│      └─ MapSelectionOverlay / MapSelectionMarker             │
└─────────────────────────────────────────────────────────────┘

Timeline Pipeline (current):
┌─────────────────────────────────────────────────────────────┐
│ DemoDualTimeline                                             │
│  └─ DualTimelineSurface (SVG via @visx/brush, @visx/shape)   │
│      ├─ DensityHeatStrip                                     │
│      ├─ Overview track (brush-zoom)                          │
│      ├─ Detail track (slice geometries)                      │
│      └─ Burst windows overlay                                │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (post-viz-level-up)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DashboardDemoShell                              │
│  ┌──────────────────────────────────────┐  ┌──────────────────────┐  │
│  │          Shared Viewport              │  │   Rail Tabs (5)      │  │
│  │  ┌──────────┐  ┌──────────────────┐   │  │  + CameraPreset     │  │
│  │  │ MAP OR   │  │ Timeline Panel    │   │  │  + VizControls      │  │
│  │  │ 3D View  │  │ +MultiScaleBand   │   │  │                     │  │
│  │  │          │  │ (dynamic aggreg.)  │   │  │                     │  │
│  │  │ 3D View: │  └──────────────────┘   │  │                     │  │
│  │  │ PostFX   │                         │  │                     │  │
│  │  │ Burst    │                         │  │                     │  │
│  │  │ Temporal │                         │  │                     │  │
│  │  └──────────┘                         │  └──────────────────────┘  │
│  └──────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘

3D Pipeline (target):
┌──────────────────────────────────────────────────────────────────────┐
│ Demo3dSpatialView (extended)                                          │
│  ├─ Fetches crime data (same, but parallelized, streaming)           │
│  ├─ Computes KDE in Worker (NEW: offloaded from main thread)         │
│  ├─ Applies burst amplification data from store (NEW)                │
│  └─ Stkde3DScene (R3F Canvas)                                         │
│      ├─ MapTileSource (same)                                          │
│      ├─ EffectComposer (NEW: @react-three/postprocessing)             │
│      │   ├─ DepthOfField (NEW)                                        │
│      │   ├─ Bloom (NEW, selective)                                    │
│      │   └─ Custom burst pass (NEW: shader)                           │
│      ├─ StkdeSliceStack_Extended (NEW: shader-based rendering)        │
│      │   ├─ ShaderMaterial per slice (replaces Canvas2D textures)     │
│      │   └─ Burst amplification via uniforms                           │
│      ├─ TemporalTrailLayer (NEW: frame accumulation)                  │
│      ├─ AxisHelper3D + Grid (NEW: spatial orientation)                │
│      ├─ CameraControls (extended: presets, constrained, map-synced)   │
│      └─ RawEventPoints (same)                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## Current Architecture Deep-Dive

### Component Boundaries (Current)

| Component | Responsibility | Key Files |
|-----------|---------------|-----------|
| DashboardDemoShell | Orchestrates viewport toggle, timeline, rail; triggers auto-switch on apply | `DashboardDemoShell.tsx` |
| Demo3dSpatialView | Fetches crime data per slice range, runs computeSliceKde, passes to Stkde3DScene | `Demo3dSpatialView.tsx` |
| Stkde3DScene | R3F Canvas, camera, lighting, hidden map tile source, renders slices | `Stkde3DScene.tsx` |
| StkdeSliceStack | Builds Canvas2D textures per-slice KDE, renders as planes with grid/labels | `StkdeSliceStack.tsx` |
| MapVisualization | MapLibre GL container with event layers, heatmap, STKDE, controls | `MapVisualization.tsx` |
| DemoDualTimeline | SVG timeline with overview/detail tracks, brush, burst windows | `DualTimelineSurface.tsx` |
| DemoInspectPanel | Slice scrubber, playback controls, opacity, comparison | `DemoInspectPanel.tsx` |
| DemoConfigurePanel | Warp factor, threshold, adaptive mode | `DemoConfigurePanel.tsx` |

### Data Flow (Current)

```
DuckDB → API Route (/api/crimes/range, /api/stkde/hotspots)
   ↓
TanStack Query / fetch() in components
   ↓
Demo3dSpatialView: crime data → computeSliceKde (main thread) → sliceKdes[]
   ↓
Stkde3DScene: sliceKdes[] → Canvas2D → texture → plane mesh

Timeline:
DuckDB → /api/crime/bins → useTimelineDataStore → DualTimelineSurface SVGs

STKDE:
DuckDB → /api/stkde/hotspots → useDemoStkde → DemoMapVisualization / MapStkdeHeatmapLayer
```

### State Management (Current)

| Store | State | Used By |
|-------|-------|---------|
| useDashboardDemoCoordinationStore | activeSliceIndex, viewMode, brushRange, comparison data, activeRailTab, crimeFetchStatus, inspectPlayback | Shell, 3D, Map, Timeline, all panels |
| useSliceDomainStore | slices array (core/creation/adjustment/selection) | Persisted, all views |
| useDashboardDemoTimeslicingModeStore | generation inputs, burst draft generation | Detect panel |
| useDashboardDemoAnalysisStore | STKDE params, response, districts, hotspots | Map, STKDE panel |
| useDashboardDemoFilterStore | Crime type, district filters | Map |
| useDashboardDemoAdaptiveStore | burstThreshold | Map, timeline |
| useDashboardDemoMapLayerStore | Layer visibility, opacity | Map |
| useDashboardDemoWarpStore | densityMap, warpMap | Detect panel |

### Rendering Gap Analysis

The dashboard-demo 3D pipeline (`StkdeSliceStack`) uses **zero custom shaders or post-processing**. All KDE heatmap textures are rendered via `Canvas2D` (CPU) with radial gradients, then uploaded as `THREE.CanvasTexture` to a basic `MeshBasicMaterial`. The main viz pipeline (`src/components/viz/`) has sophisticated shader infrastructure (GhostingShader, heatmap ShaderMaterial) but it's entirely separate — the dashboard-demo never touches it.

## Target Architecture — New Capabilities

### 1. Burst Visibility Rendering

**Where it lives:** `src/components/dashboard-demo/shaders/burst-amplify.ts`

**New dependency:** None (pure GLSL via `THREE.ShaderMaterial` or custom `shaderMaterial` from drei)

**Data flow:**
```
useDashboardDemoCoordinationStore (burst data)
   ↓
Demo3dSpatialView reads burstScore per slice, burstConfidence, burstClass
   ↓
Stkde3DScene passes as uniforms to BurstAmplifyShader
   ↓
Shader applies: color boost (hue shift toward amber/red), opacity ramp, glow intensity
```

**Architecture decision:**
- **Option A: Replace Canvas2D textures with ShaderMaterial** — Eliminates CPU texture generation entirely. KDE data passed as float32 texture or uniform array. Burst amplification is a uniform mix. **Recommended.**
- **Option B: Post-process bloom on active burst slices** — Keep Canvas2D, add selective bloom via EffectComposer. Simpler but less visual control.

**Recommendation:** Option A for the core rendering, with Option B's selective bloom as an additive enhancement. Phase 1 = A, Phase X = combine with B.

**Implementation sketch:**
```typescript
// src/components/dashboard-demo/shaders/burst-amplify.ts
// ShaderMaterial that renders KDE cells directly from data textures
// with burst amplification uniforms:
//   uBurstScore: float (0-1) → controls intensity boost
//   uBurstClass: int → style selection (spike/peak/valley)
//   uActiveIntensity: float → active slice glow
```

**New files:**
- `src/shaders/burst-amplify.ts` — shared burst shader logic
- `src/components/dashboard-demo/shaders/slice-kde-material.tsx` — R3F wrapper component

### 2. Temporal Evolution

**Where it lives:** `src/components/dashboard-demo/TemporalTrailLayer.tsx`

**New data needed:**
- Per-slice: frame position, duration, interpolation target
- Accumulation: blend factor between consecutive slices
- Trail: decay rate, max trail length

**Data flow:**
```
useDashboardDemoCoordinationStore (inspectIsPlaying, inspectPlaybackSpeed)
   ↓
TemporalTrailLayer reads activeSliceIndex, play state
   ↓
useFrame interpolates between slice[i] and slice[i+1]
   ↓
Custom ShaderMaterial with:
  - uFrameAlpha: current interpolation mix
  - uAccumTexture: frame buffer for trail accumulation
  - uDecayRate: trail fade speed
```

**Architecture decision:**
- **CPU interpolation:** Simple to implement, interpolate KDE cells in JS, re-upload texture each frame. Fine for ≤30 slices.
- **GPU interpolation:** Upload start/end KDE data as textures, interpolate in fragment shader. More performant, more complex.
- **Recommendation:** CPU first (MVP), GPU as optimization if frame rate drops below 30fps.

**New files:**
- `src/components/dashboard-demo/TemporalTrailLayer.tsx` — trail accumulation
- `src/components/dashboard-demo/effects/InterpolationEffect.ts` — R3F post-processing effect for frame blending

### 3. Spatial Orientation

**Where it lives:** `src/components/dashboard-demo/SpatialOrientation.tsx`

**New components:**
- `AxisHelper3D.tsx` — annotated X/Z axes with crime-type labels, scale bar
- `CameraPresetsManager.tsx` — preset views (overhead = STKDE view, oblique = standard, side = temporal profile)
- `ConstrainedCamera.tsx` — wrapper around CameraControls with configurable bounds

**Data flow:**
```
New store: useCameraStore
  ├─ presets: CameraPreset[] (defined, user-saved)
  ├─ activePresetId: string | null
  ├─ constraints: { minDistance, maxDistance, minPolarAngle, maxPolarAngle, bounds }
  └─ followMap: boolean (sync with map on pan/zoom)
   ↓
ConstrainedCamera component applies limits to CameraControls
   ↓
CameraPresetsManager triggers setLookAt with saved position/target
```

**Map + 3D camera sync approach:**
```
Map pan event → update cameraStore.mapCenter (lng/lat)
   ↓
project(mapCenter.lng, mapCenter.lat) → 3D scene coords (x, z)
   ↓
CameraControls.setTarget(x, 0, z)   // keep current pitch/zoom
   ↓
Reverse: 3D camera move → update map center?
   ⚠️ Only if followMap is active — bidirectional sync can be disorienting.
   Recommendation: Unidirectional (Map → 3D) by default. Bidirectional as opt-in.
```

**Key insight:** The existing `project()` function in `src/lib/projection.ts` already converts lat/lng to x/z scene coordinates. The map uses normalized `[0, 100]` time for Y, while 3D uses slice-stack Y positions. These coordinate systems are compatible — the bridge just needs to transform map viewport center to 3D scene coordinates.

**New files:**
- `src/store/useCameraStore.ts`
- `src/components/dashboard-demo/CameraPresetsManager.tsx`
- `src/components/dashboard-demo/ConstrainedCamera.tsx`
- `src/components/dashboard-demo/AxisHelper3D.tsx`

### 4. 3D Cognitive Load — Depth of Field & Occlusion Management

**Where it lives:** `src/components/dashboard-demo/effects/`

**New dependency:** `@react-three/postprocessing` + `postprocessing` (peer dep)

**Stack:**
```
EffectComposer (wraps existing Canvas children)
  ├─ DepthOfField (focus on active slice, blur inactive)
  │    → target: active slice Y position
  │    → bokehScale: configurable (0 = disabled)
  ├─ Bloom (selective: active slice glow)
  │    → luminanceThreshold: highlight burst cells
  │    → intensity: mild (subtle, not gaming-style)
  └─ Custom OcclusionPass (future: auto-dim occluded slices)
```

**Integration with existing Canvas:**
```typescript
// In Stkde3DScene.tsx, wrap SceneContent with EffectComposer:
import { EffectComposer, DepthOfField, Bloom } from '@react-three/postprocessing';

<Canvas ...>
  <EffectComposer>
    <DepthOfField
      target={[0, activeSliceY, 0]}
      focalLength={0.02}
      bokehScale={postProcessingParams.dofIntensity}
    />
    <Bloom
      luminanceThreshold={0.8}
      intensity={postProcessingParams.bloomIntensity}
      mipmapBlur
    />
  </EffectComposer>

  <SceneContent ... />
</Canvas>
```

**Key consideration:** EffectComposer introduces an additional render pass. For the dashboard-demo's use case (single Canvas, <200k triangles), this is negligible. But the `MapTileSource` texture (injected into scene via `group` at fixed position) must render before the EffectComposer to avoid post-processing the map tile plane. **Set `renderPriority` on map tile group or use a separate render layer for the map background.**

**New files:**
- `src/components/dashboard-demo/effects/VizPostProcessing.tsx` — effect composer controller
- `src/store/usePostProcessingStore.ts` — DoF/Bloom params with presets

### 5. Multi-Scale Temporal (Dynamic Aggregation Windows)

**Where it lives:** Integrated into timeline and 3D view

**Timeline integration:**
- Extend `DualTimelineSurface` with an additional band showing aggregated bins at multiple resolutions
- Add `MultiScaleTimelineBand.tsx` as a new track in the timeline

**3D integration:**
- Extend `StkdeSliceStack` to accept variable-width bins (currently all slices have uniform spacing via `SLICE_SPACING = 7.25`)
- Add uniform behavior via `yForIndex` that accounts for temporal duration

**Data flow:**
```
New store: useMultiScaleStore
  ├─ resolution: 'coarse' | 'medium' | 'fine'
  ├─ aggregationWindow: number (hours)
  ├─ binCount: number
  └─ bins: { start, end, crimeCount, density }[]
   ↓
Timeline: renders bands at current resolution
3D view: renders slice planes at variable Y positions proportional to temporal span
```

**New files:**
- `src/store/useMultiScaleStore.ts`
- `src/components/timeline/MultiScaleTimelineBand.tsx`
- `src/lib/aggregation/multi-scale.ts` — server-side or worker aggregation

### 6. Dense Data Readability — Adaptive Transparency & Saliency

**Where it lives:** In the slice rendering shader + new overlay components

**Approach:**
- **Adaptive transparency:** Shader computes local density from a low-res texture and adjusts opacity per cell. High-density cells get more opaque, low-density get more transparent. This replaces the current fixed `planeOpacity`.
- **Saliency highlighting:** Cells above a configurable density percentile get a color boost/halo effect in the shader.

**Shader integration:**
```
uSaliencyThreshold: float (percentile 0-1)
uDensityRamp: { lowOpacity, highOpacity }
Cells with intensity > threshold → amplified color + glow
Cells with intensity < threshold → reduced opacity (fade into background)
```

**New files:**
- Extends `src/shaders/burst-amplify.ts` with saliency uniforms (same shader, more parameters)

## State Management Changes

### New Stores

| Store | Purpose | Key State |
|-------|---------|-----------|
| `useCameraStore` | 3D camera state for presets and map sync | `presets`, `activePresetId`, `followMap`, `constraints`, `lastTarget` |
| `usePostProcessingStore` | Post-processing effect parameters | `dofEnabled`, `dofIntensity`, `bloomEnabled`, `bloomIntensity`, `effectPreset` |
| `useMultiScaleStore` | Multi-scale aggregation state | `resolution`, `aggregationWindow`, `bins`, `isComputing` |
| `useVizAnimationStore` | Temporal evolution animation state | `interpolationMode`, `trailDecay`, `accumulatedFrames`, `isPlaying` |

### Extended Stores

| Store | Additions | Rationale |
|-------|-----------|-----------|
| `useDashboardDemoCoordinationStore` | `burstAmplifyEnabled: boolean`, `burstAmplifyIntensity: number` | Burst rendering is a view-level toggle, belongs with other view settings |
| `useDashboardDemoCoordinationStore` | `temporalEvolutionMode: 'off' | 'interpolate' | 'trail' | 'accumulate'` | Temporal evolution mode is a coordination concern across views |
| `useDashboardDemoMapLayerStore` | `cameraSync: 'independent' | 'follow-3d' | 'bidirectional'` | Camera sync mode controls map behavior |
| `useDashboardDemoAnalysisStore` | `saliencyThreshold: number`, `saliencyEnabled: boolean` | Saliency is an analysis view parameter |

### Store Dependency Graph

```
useCameraStore ───→ ConstrainedCamera, CameraPresetsManager
     │
     ├──→ useDashboardDemoCoordinationStore (syncState)
     │
     └──→ DemoMapVisualization (when followMap)

usePostProcessingStore ───→ VizPostProcessing (EffectComposer params)

useVizAnimationStore ───→ TemporalTrailLayer, DemoInspectPanel

useMultiScaleStore ───→ MultiScaleTimelineBand, StkdeSliceStack (variable Y)
```

## Component Structure — New vs Modified

### New Components

| Component | Purpose | Phase |
|-----------|---------|-------|
| `src/shaders/burst-amplify.ts` | Shared burst amplification GLSL logic | 2 |
| `src/components/dashboard-demo/StkdeSliceStackExtended.tsx` | Shader-based replacement for Canvas2D stacks | 2 |
| `src/components/dashboard-demo/effects/VizPostProcessing.tsx` | EffectComposer + DoF + Bloom wrapper | 4 |
| `src/components/dashboard-demo/TemporalTrailLayer.tsx` | Frame accumulation and interpolation | 3 |
| `src/components/dashboard-demo/CameraPresetsManager.tsx` | Camera preset switcher UI + logic | 3 |
| `src/components/dashboard-demo/ConstrainedCamera.tsx` | CameraControls with configurable limits | 3 |
| `src/components/dashboard-demo/AxisHelper3D.tsx` | Annotated 3D axes, grid, scale bar | 3 |
| `src/components/timeline/MultiScaleTimelineBand.tsx` | Aggregation resolution band in timeline | 5 |
| `src/components/dashboard-demo/VizControlsPanel.tsx` | UI panel for viz toggles (burst, DoF, sync) | 4 |
| `src/lib/aggregation/multi-scale.ts` | Server/worker multi-resolution aggregation | 5 |

### Modified Components

| Component | Changes | Phase |
|-----------|---------|-------|
| `Demo3dSpatialView.tsx` | Add burst data passthrough, camera store integration, animation state, effect composer | 2-3-4 |
| `Stkde3DScene.tsx` | Wrap in EffectComposer, add post-processing, replace StkdeSliceStack with shader variant, add TemporalTrailLayer, add AxisHelper3D, add constrained camera | 2-3-4 |
| `StkdeSliceStack.tsx` | Keep as fallback (non-shader mode). Add burst uniform support if used | 2 |
| `DashboardDemoShell.tsx` | Add camera sync state bridge between map/3d toggle | 3 |
| `DemoInspectPanel.tsx` | Add temporal evolution mode controls, camera preset quick buttons | 3 |
| `DemoConfigurePanel.tsx` | Add visualization quality toggles (burst, DoF, bloom, saliency) | 4 |
| `DemoDualTimeline.tsx` | Accept multi-scale band data, new optional track | 5 |
| `MapVisualization.tsx` | Accept camera sync state from coordination store, update viewport on 3D changes | 3 |

### Components NOT Modified (unchanged)

| Component | Reason |
|-----------|--------|
| `DemoSlicePanel.tsx` | Slice review/apply workflow is already solid |
| `DemoDetectPanel.tsx` | Burst detection is complete |
| `DemoStkdePanel.tsx` | STKDE analysis flow is independent |
| `DemoStatsPanel.tsx` | Statistical summaries are separate concern |
| `DemoTimelineSettingsCard.tsx` | Already has adaptive controls |
| `DashboardDemoRailTabs.tsx` | Rail tab structure is stable |
| `MapStkdeHeatmapLayer.tsx` | Map heatmap works independently |

## Data Flow Changes

### New Data Pipelines

**Burst Visibility Pipeline:**
```
useSliceDomainStore (slices[].burstScore, burstClass)
   ↓
Demo3dSpatialView computes burst amplification params per slice
   ↓
{ burstAmplifyMap: Map<sliceId, { boost, color, glow }> }
   ↓
Stkde3DScene → shader uniforms per slice mesh
```

**Temporal Evolution Pipeline:**
```
useDashboardDemoCoordinationStore (inspectIsPlaying, playbackSpeed)
   ↓
TemporalTrailLayer (useFrame-based interpolation)
   ├─ startKDE: KDE cells for current slice
   ├─ endKDE: KDE cells for next slice
   └─ t: [0, 1] interpolant per frame
   ↓
Blended texture uploaded each frame → plane material
```

**Camera Sync Pipeline:**
```
MapLibre map.on('move') → { lng, lat, zoom }
   ↓
project(lat, lng) → { x, z } (scene coordinates)
   ↓
useCameraStore.setMapCenter({ x, z })
   ↓
ConstrainedCamera.setTarget(x, 0, z)
   (if followMap is enabled)
```

**Multi-Scale Aggregation Pipeline:**
```
Worker: adaptiveTime.worker.ts (extended)
   or NEW: aggregation.worker.ts
   ↓
Aggregates crime timestamps at multiple resolutions
   { coarse: binCount=12, medium: binCount=48, fine: binCount=192 }
   ↓
useMultiScaleStore.setBins(resolution, bins)
   ↓
MultiScaleTimelineBand re-renders
StkdeSliceStack adjusts Y positions
```

### Modified Data Flows

**Crime Data Fetch (Demo3dSpatialView):**
- Current: Sequential per-slice fetch → `crimesBySlice[]` → KDE main thread
- Target: **Parallel fetch** (Promise.all per slice batch) + **Worker KDE** via existing stkdeHotspot.worker extended pattern

**KDE Computation:**
- Current: `computeSliceKde()` directly in component, main thread
- Target: New `kde.worker.ts` or extend `stkdeHotspot.worker.ts` to accept point arrays and return KDE cell arrays

## Performance Strategy

### GPU Work (Free — no main thread impact)

| Feature | GPU Cost | Notes |
|---------|----------|-------|
| Shader-based burst amplification | ~0 (single uniform branch) | Replaces Canvas2D texture generation |
| Post-processing (DoF) | 1 render target | ~0.5-1ms on modern GPUs |
| Post-processing (Bloom) | 2 render targets (downsample) | ~0.5-2ms depending on resolution |
| Temporal trail accumulation | 1 render target | Same as bloom cost |
| Shader-based KDE rendering | ~0 (data texture sampling) | Eliminates CPU texture generation entirely |

### CPU Work (Offloaded to Workers)

| Computation | Current Location | Target Location | Worker |
|-------------|-----------------|-----------------|--------|
| KDE per slice | Main thread (Demo3dSpatialView) | Worker | NEW: `kde.worker.ts` |
| Multi-scale temporal aggregation | N/A | Worker | NEW: `aggregation.worker.ts` |
| Burst scoring (already in worker) | Worker | Worker (unchanged) | `adaptiveTime.worker.ts` |

### Optimization Strategy

```
1.  Canvas2D texture generation (current bottleneck for >5 slices)
    → ShaderMaterial rendering (GPU, free)
    
2.  KDE computation (current: main thread, blocks UI for >100k points)
    → Worker offloading (CPU, non-blocking)
    
3.  Post-processing overhead (new)
    → Only render effects when enabled (store toggle)
    → Reduce resolution for bloom (half-res)
    
4.  Camera sync recomputation (new)
    → Only on map pan/zoom end, not every frame
    → Debounce map move events
```

## Integration Points

### R3F Post-Processing Integration with Existing Canvas

**Current Canvas setup (Stkde3DScene.tsx):**
```typescript
<Canvas
  camera={{ position: CAMERA_POSITION, fov: 38 }}
  gl={{ alpha: true, antialias: true }}
>
```

**Target:**
```typescript
<Canvas
  camera={{ position: CAMERA_POSITION, fov: 38 }}
  gl={{ alpha: true, antialias: true, depth: true }}
>
  {postProcessingEnabled && (
    <EffectComposer>
      <DepthOfField
        target={activeSlicePosition}
        focalLength={postProcessingParams.dofFocalLength}
        bokehScale={postProcessingParams.dofIntensity}
      />
      <Bloom
        luminanceThreshold={0.6}
        intensity={postProcessingParams.bloomIntensity}
        mipmapBlur
      />
    </EffectComposer>
  )}

  <SceneContent ... />
</Canvas>
```

**Critical detail:** The `MapTileSource` texture (hidden MapLibre map captured to CanvasTexture) currently renders at `position={[0, MAP_PLANE_Y, 0]}` inside the scene with `renderOrder={-20}`. With EffectComposer:
- The map tile plane should render **before** post-processing (it's a reference background, should not have DoF/bloom applied)
- Solution: Wrap map tile in a `<layer/>` or use `EffectsScope` to exclude background meshes from post-processing
- Alternative: Render map tile as a separate `Scene` overlay (not recommended — would lose depth integration)

**Recommendation:** Use `selection` property on `EffectComposer` and `selectionLayer` to exclude the map plane mesh from effects:
```typescript
const mapPlaneRef = useRef<Mesh>(null);

<EffectComposer selectionLayer={1}>
  <Bloom selection={[mapPlaneRef]} ... />
</EffectComposer>
```
Or simply don't apply effects to `renderOrder` < 0 meshes via custom logic.

### Map + 3D Camera Sync

**Sync mechanism:**

```
Map Events ──→ Camera Store ──→ 3D Camera Controls
   (unidirectional by default)

Map pan/zoom:
  map.on('move') → debounce(100ms) →
    project(mapCenter.lat, mapCenter.lng) → (x, z) →
    cameraStore.setMapCenter(x, z) →
    if (followMap) → cameraControls.setTarget(x, 0, z, smooth=true)

Map → 3D projection bridge:
  project(lat, lng) → { x, z }
    // Already exists in src/lib/projection.ts
    // Uses Web Mercator projection → [-50, 50] scene coords

3D → Map (optional, bidirectional):
  3D camera orbit end → cameraStore.lastTarget →
    inverseProject(x, z) → { lat, lng } →
    mapRef.flyTo({ center: [lng, lat], duration: 200 })
```

**State management:**
```typescript
// useCameraStore
interface CameraState {
  // Current 3D camera state
  target: [number, number, number];   // [x, y, z] in scene coords
  position: [number, number, number]; // camera world position
  
  // Map sync
  followMap: boolean;
  mapCenter3D: { x: number; z: number } | null;  // projected map center
  
  // Presets
  presets: CameraPreset[];
  activePresetId: string | null;
  
  // Constraints
  constraints: {
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    bounds?: AxisAlignedCubeBounds;  // optional spatial bounds
  };
  
  // Actions
  setTarget: (x: number, y: number, z: number) => void;
  setMapCenter: (x: number, z: number) => void;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => void;
  setFollowMap: (enabled: boolean) => void;
}
```

## Build Order — Dependency Graph

```
Phase 1: Shader Infrastructure
  ├── Install @react-three/postprocessing + postprocessing (peer)
  ├── Create src/shaders/ directory structure
  ├── Create burst-amplify.ts (shareable GLSL fragments/uniforms)
  └── No visual change — foundation only

Phase 2: Burst Visibility Rendering (depends on Phase 1)
  ├── Create StkdeSliceStackExtended.tsx (shader-based, replaces Canvas2D)
  │   └── Uses burst-amplify shader
  ├── Demo3dSpatialView: pass burst data as uniforms
  ├── DemoConfigurePanel: burst toggles
  └── Phase 2a: Keep Canvas2D as fallback for non-shader mode

Phase 3: Spatial Orientation & Camera Sync (partially dependent on Phase 1)
  ├── Create useCameraStore
  ├── Create AxisHelper3D.tsx
  ├── Create CameraPresetsManager.tsx
  ├── Create ConstrainedCamera.tsx  
  ├── Demo3dSpatialView: integrate camera store
  ├── MapVisualization: add followMap mode
  ├── DemoInspectPanel: camera preset buttons
  └── Independent of Phase 2 — can build in parallel or before

Phase 4: Post-Processing & Temporal Evolution (depends on Phase 1)
  ├── Create VizPostProcessing.tsx (EffectComposer wrapper)
  ├── Create usePostProcessingStore
  ├── Create TemporalTrailLayer.tsx
  ├── Stkde3DScene: wrap in EffectComposer, add layers
  ├── DemoConfigurePanel: DoF/Bloom controls
  └── Depends on Phase 1 (needs postprocessing dependency)
       Independent of Phase 2,3

Phase 5: Multi-Scale Temporal (depends on Phase 3 timeline knowledge)
  ├── Create useMultiScaleStore
  ├── Create aggregation.worker.ts (or extend existing worker)
  ├── Create MultiScaleTimelineBand.tsx
  ├── StkdeSliceStack: variable Y positioning
  └── Partially depends on Phase 3 (timeline structure)

Phase 6: Dense Data Readability (depends on Phase 2 shader work)
  ├── Extend burst-amplify.ts with adaptive transparency + saliency
  ├── Add saliency controls to DemoConfigurePanel
  └── Pure shader extension — no new components needed
```

### Recommended Build Order

```
Phase 1 ──→ Phase 3 ──→ Phase 2 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
(Foundation)  (Orientation)  (Burst)    (PostFX +  (Multi-    (Readability)
                                        Temporal)  scale)
```

**Rationale:**
- **Phase 1 first** always — shader infrastructure + dependency install is prerequisite for any GPU work
- **Phase 3 early** — camera presets and spatial orientation are "quick wins" with high visual impact, no shader complexity
- **Phase 2 before 4** — burst shader is simpler than full post-processing, validates the shader pipeline
- **Phase 4 after 2** — EffectComposer builds on shader pipeline, temporal evolution needs stable slice rendering
- **Phase 5 later** — multi-scale depends on stable timeline + needs worker changes
- **Phase 6 last** — pure polish, requires all other rendering to be stable first

## Anti-Patterns to Avoid

### 1. Mixing shader pipelines across routes

**What:** Sharing custom shader code between `src/components/viz/shaders/` (main route) and the new dashboard-demo shaders.
**Problem:** The main route uses `onBeforeCompile` patching of Three.js built-in shaders (fragile, version-specific). Dashboard-demo should use clean `ShaderMaterial` instances.
**Instead:** Keep dashboard-demo shaders separate in `src/shaders/` using `ShaderMaterial` from Three.js or `shaderMaterial` from drei. Don't reuse the fragile `onBeforeCompile` pattern.

### 2. Over-processing canvas texture map tiles

**What:** Applying bloom/DoF to the captured map tile texture.
**Problem:** The map tile is a static reference image — blurring it or blooming it creates visual confusion (blurred streets).
**Instead:** Exclude the map plane from post-processing via `selection`, `renderOrder`, or separate render layers.

### 3. Bidirectional camera sync without guardrails

**What:** Mirroring every 3D camera move back to the map and every map move to 3D.
**Problem:** Infinite feedback loop, disorienting when zooming in 3D (map zoom level doesn't map 1:1 to 3D camera distance).
**Instead:** Use unidirectional sync by default (map → 3D only). Bidirectional only when user explicitly enables it, with hysteresis/debounce.

### 4. Recomputing KDE on the main thread for many slices

**What:** Running `computeSliceKde()` in `Demo3dSpatialView` for 15+ slices.
**Problem:** Each call is ~2-5ms for 32x32 grid. 15 slices = 30-75ms of blocked main thread.
**Instead:** Offload to `kde.worker.ts`. The worker pattern is already established (`adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`).

### 5. Adding post-processing without toggles

**What:** Always rendering DepthOfField or Bloom.
**Problem:** On integrated GPUs (common in laptops), even simple post-processing adds 1-3ms per frame. Always-on effects degrade interactivity.
**Instead:** All post-processing effects must be toggleable. Default to off for DoF (subtle enhancement), on for Bloom (mild, low cost). Store preferences in `usePostProcessingStore`.

## Scaling Considerations

| Concern | Current (v3.1) | Post-Level-Up | 
|---------|----------------|---------------|
| **Shader complexity** | None in dashboard-demo 3D | 2-3 ShaderMaterials + 1-2 post effects |
| **Render passes** | 1 (forward) | 2-3 (forward + 1-2 post) |
| **KDE computation** | Main thread, sequential | Worker, parallel per slice batch |
| **Canvas texture upload** | 1 per slice (CPU) | 0 (GPU data textures) |
| **Camera state** | Local state in Stkde3DScene | Shared store, presets, constraints |
| **Timeline aggregation** | Fixed bins | Dynamic multi-resolution |
| **Map-3D sync** | None (independent toggle) | Unidirectional, opt-in bidirectional |

### Bottleneck Analysis

| Bottleneck | Where | Mitigation |
|------------|-------|------------|
| KDE computation | CPU (main thread) | Worker offloading (Phase 0 of this milestone) |
| Canvas2D texture generation | CPU (main thread) | ShaderMaterial rendering (Phase 2) |
| Post-processing passes | GPU | Toggleable, low-res bloom |
| Camera sync frequency | JS main thread | Debounce, event-driven not frame-driven |

## Sources

- Existing codebase analysis: `src/components/dashboard-demo/*`, `src/app/stkde-3d/*`, `src/store/*`, `src/workers/*`
- `@react-three/postprocessing` — verified via Context7 for API surface: EffectComposer, DepthOfField, Bloom, Selection
- Three.js ShaderMaterial — verified via Context7 for texture sampling uniforms, onBeforeCompile alternatives
- `src/lib/projection.ts` — existing coordinate projection bridge (verified in codebase)
- `src/components/viz/shaders/ghosting.ts` — existing shader pattern reference (separate pipeline, not reusable)
- `src/components/viz/shaders/heatmap.ts` — existing ShaderMaterial reference pattern

---

*Architecture research for: Adaptive Space-Time Cube Visualization Level-Up*
*Researched: 2026-05-26*
