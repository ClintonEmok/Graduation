# Frontend Visualization Analysis

**Analysis Date:** 2026-06-09
**Context:** Mapping thesis Section 4.4 requirements to actual implementation

---

## 1. Dashboard Layout (`src/app/dashboard/page.tsx`)

**What it renders:**
- Full-screen layout (h-screen w-screen) with black background
- `DashboardHeader` (top bar, suspense-wrapped)
- `DashboardLayout` with three resizable panels (via `react-resizable-panels`):
  - **Left panel** → `MapVisualization` (2D map)
  - **Top-right panel** → `CubeVisualization` (3D scene)
  - **Bottom-right panel** → `TimelinePanel` (dual timeline + temporal controls)
- Overlays: `StudyControls` + `ContextualSlicePanel`

**Layout config** (`src/components/layout/DashboardLayout.tsx`):
- Outer group: vertical split (top area ≈70% / bottom panel ≈30%)
- Inner group: horizontal split (map ≈50% / cube ≈50%)
- Resizable panels with drag separators
- Uses `useLayoutStore` for persisted layout

---

## 2. 3D Cube (`src/components/viz/`)

### Main Entry: `CubeVisualization.tsx`
- Wraps `MainScene` inside a `div` with a reset button and debug overlay
- Debug overlay shows: warp source, warp factor, active constraint, linked selection, proposal story, cluster info
- Crime type legend (`SimpleCrimeLegend`) in bottom-left corner
- "No slices active" empty state shown when no slices or clusters exist
- Filter indicator badge in bottom-right

### `MainScene.tsx`
- Creates `Scene` (R3F Canvas) with transparent background support (for overlay on map)
- Contains key 3D elements:
  - `TimeSlices` — renders slice planes in 3D
  - `ClusterManager`, `ClusterHighlights`, `ClusterLabels` — cluster analysis
  - `SpatialConstraintOverlay` — spatial bounds visualization
  - `SelectedWarpSliceOverlay` — warp slice visualization in 3D
  - `CameraControls` — orbit controls (orbit, zoom, pan)
- **Adaptive map computation**: Two modes:
  - `viewport` scope: computes maps from current viewport crime data
  - `global` scope: fetches from `/api/adaptive/global` or falls back to local CPU compute
- Uses `useSelectionSync()` hook to coordinate cross-view selections

### `Scene.tsx`
- Three.js `Canvas` with camera at `(50, 50, 50)`, FOV 45
- Background color from theme palette, fog for depth cues

### `DataPoints.tsx` (692 lines) — Core 3D point rendering
- **GPU-instanced rendering** via `instancedMesh` with `sphereGeometry` (radius 0.5)
- **Custom `ghosting` shader** applied via `onBeforeCompile`
- **Adaptive Y positioning**: Vertex shader samples a 1D warp texture (`uWarpTexture`) and mixes `linearY` ↔ `adaptiveY` based on `uWarpFactor` (0=linear, 1=adaptive)
- **Time on vertical axis**: YES — Y-axis is time (normalized 0-100%). Points positioned at `(x, y, z)` where `y` = time.
- **Columnar data support**: Separate code path for `columns` (Apache Arrow) vs `data` arrays
- **Color per point**: By crime type via palette (or white in dark mode)
- **Raycasting**: Pointer events for point selection with drag/click discrimination
- **CPU matrix sync**: Debounced 500ms — recomputes matrix positions using warp map sampling for accurate raycasting

### Ghosting Shader (`src/components/viz/shaders/ghosting.ts`, 297 lines)
**Advanced GPU fragment-level rendering with multiple effects:**

1. **Time-plane focus**: Points near `uTimePlane` get brighter, farther points get dimmer (smoothstep)
2. **Type/District filtering**: Array-based lookup to mask out non-selected types/districts
3. **Spatial bounds culling**: Points outside spatial bounds can be hidden
4. **Opacity modulation (focus+context)**:
   - Context points (outside filter) get: desaturation (70%), dimming (0.3-0.7×), and dither discarding
   - Brush-range dimming: points outside brush range get extra 0.1× opacity multiplier
   - Hash-based dithering masks points probabilistically based on opacity threshold
5. **Burst highlighting**: Points in high-density regions (>= burst threshold) get orange tint
6. **Selection highlight**: Single selected point gets brightened
7. **Slice highlighting**: Points inside active slice ranges get white highlight
8. **LOD**: Checkerboard dithering on fragment based on `uLodFactor`, progressive point removal

### `SimpleCrimePoints.tsx` (485 lines)
- Alternative point rendering for dashboard demo / non-DuckDB scenarios
- Uses simple Points geometry vs instanced mesh
- Also supports adaptive Y via warp texture sampling in vertex transformation
- Slice-authored warp map support (user-defined density boosts)

### `SlicePlane.tsx` — Time slices in 3D
- Range slices: semi-transparent purple box (100×height×100)
- Point slices: cyan plane at Y position
- Drag handles (sphere) with labels showing time range
- STKDE heatmap texture overlaid on slice plane
- Evolution state: active/previous/next/distant with opacity multipliers

### `TimeSlices.tsx`
- Orchestrates `SlicePlane`, `SliceClusterOverlay`, `SliceCrimePoints`, `BurstEvolutionOverlay`, `EvolutionFlowOverlay`
- Scales time to Y position (linear or adaptive)
- Cluster analysis per slice via `analyzeClusters()` with DBSCAN-style clustering

### GPU Heatmap (`HeatmapOverlay.tsx`)
- Two-pass GPGPU engine:
  - Pass 1: Aggregates spatial density into Float RenderTarget (1024×1024)
  - Pass 2: Renders with logarithmic scaling + color mapping
- Configurable intensity, radius, opacity

### TimeGrid (`TimeGrid.tsx`)
- Grid lines on the Y-axis (time axis) in the 3D scene

### Trajectory in 3D (`Trajectory.tsx`, `TrajectoryLayer.tsx`)
- Lines connecting crime points grouped by block
- Color-coded by time progression, arrow markers
- Adaptive Y positioning support via `computeAdaptiveYColumnar()`
- Auto-focus camera on selected trajectory block (via `controls.fitToBox`)

---

## 3. 2D Map (`src/components/map/`)

### `MapVisualization.tsx` (271 lines)
- **Crime data query**: Uses `useCrimeData()` hook with viewport time range
- **Layers** (toggleable via `useMapLayerStore`):
  - `MapEventLayer` — circle markers for individual crime events
  - `MapHeatmapOverlay` — canvas heatmap
  - `DeckGlHeatmapOverlay` — Deck.gl GPU heatmap
  - `MapTrajectoryLayer` — trajectory line paths
  - `MapClusterHighlights` — cluster visualization
  - `MapStkdeHeatmapLayer` — STKDE hotspot heatmap
- **Interactions**: Click-to-select (projects lat/lon to scene coordinates, finds nearest point by index), spatial bounds selection (rectangle drag), type legend toggling
- **Filter passthrough**: Receives filter state (selected types, districts, time range, spatial bounds)
- **Slice time range filtering**: `sliceTimeRange` prop filters map events
- **'Clear' button** for spatial bounds
- Debug overlay showing click coordinates and selected point info

### `MapEventLayer.tsx` (295 lines)
- **Renders crime events as MapLibre circle layer**
- Uses GeoJSON source built from filtered crime records
- Supports up to 20,000 points (MAX_POINTS)
- **Filtering**: Time range, crime type, district, spatial bounds all applied in client-side filter pass
- Color-coded by crime type (via palette)
- Optional hovered type highlighting
- Supports both `records` prop and columnar data (`columns` from store)

### `MapTrajectoryLayer.tsx` (94 lines)
- Renders block-based crime trajectories as MapLibre `LineString` features
- Blue line (4px) with white circle markers at each point
- Visible only when a block is selected via `useTrajectoryStore`

### `MapStkdeHeatmapLayer.tsx`
- Renders STKDE heatmap cells as filled circles on the map
- Color-mapped by intensity, configurable opacity
- Supports active hotspot centroid highlight

### `DeckGlHeatmapOverlay.tsx`
- Deck.gl heatmap layer for smooth density visualization
- Wraps data as Deck.GeoJsonLayer-compatible points

### `MapBase.tsx`
- MapLibre GL instance with Singapore-focused initial view
- Base map style (streets/vintage)

---

## 4. Timeline (`src/components/timeline/`)

### `DualTimeline.tsx` (725 lines) — Main timeline orchestrator
- **Two levels**: Overview (histogram bars, 42px) + Detail (point/bins view, 60px)
- **Density context**: `DensityHeatStrip` above both overview and detail
- **Brushing**: Overview has an SVG brush (d3-brush style) to select detail window
- **Zoom**: Pointer interactions on detail view for zoom/pan
- **Adaptive time scaling**:
  - When `timeScaleMode === 'adaptive'`, the detail scale is replaced with a warped scale
  - Warp mapping: linear seconds → warped display seconds via density warp map
  - Invert uses binary search (24 iterations) to convert display positions back to linear time
  - `tickLabelStrategy='span-aware'` adjusts label density based on visible span
- **Slice display**: 
  - `CommittedSliceLayer` — committed slices (generated-applied) as colored bands
  - `SliceBoundaryHandlesLayer` — drag handles for slice boundary adjustment
  - `SliceCreationLayer` — slice creation via drag interaction
  - `BurstList` hook provides burst windows
- **Interactions**:
  - Overview brush to set detail range
  - Detail pointer: click/drag to select time range
  - Slice creation: click/drag on detail panel
  - Slice boundary drag handles

### `DualTimelineSurface.tsx` (430 lines) — SVG rendering surface
- **Overview SVG**: Histogram bars, warp bands (slice-authored/proposal), brush, ticks
- **Detail SVG**: Points (circles) or histogram bins, slice geometries (colored bands by burst taxonomy), time cursor, hover state
- **Slice geometries**:
  - `prolonged-peak` → cyan fill
  - `isolated-spike` → purple fill
  - `valley` → green fill
  - `neutral` → slate fill
  - Generated drafts → amber outline
  - Applied slices → emerald outline
- **Hovered detail**: Shows timestamp tooltip
- **Empty state**: "No crimes in this range" fallback
- Overlap hatch pattern for overlapping slices

### `DensityHeatStrip.tsx`
- Canvas-based density strip with blue-to-red gradient interpolation
- Configurable height (default 12px overview, 10px detail)

### `DensityAreaChart.tsx`
- 72px SVG gradient-filled area chart
- Loading fade animation

### `TimelinePanel.tsx` (224 lines)
- Temporal controls: Play/Pause, Step Forward/Back, Speed selector (0.5x–5x)
- Time Scale toggle (Linear ↔ Adaptive)
- Current time display (formatted date)
- Active window label
- Resolution slider: seconds → minutes → hours → days → weeks → months → years
- Contains `DualTimeline` for the main timeline view

---

## 5. Timeslicing Route (`src/app/timeslicing/page.tsx`)

A full user-driven timeslicing workflow page:
- **Data loading**: Crime data via `useCrimeData()` with buffer support
- **Adaptive store hydration**: Computes density/warp maps from timestamps
- **`BinningControls`** component: Configurable bin generation with strategy, merge, split, delete
- **`SuggestionToolbar`**: Auto-suggestion panel for time scale profiles
- **Two timeline views**:
  1. Main timeline: With generated draft bins and applied slice overlays
  2. Selection timeline: Read-only detailed view of selected time range
- **Workflow state machine**: No result → Generating → Draft review → Applied
- **QA model**: `TimelineQaContextCard` shows data fidelity/domain alignment checks

---

## 6. Timeline Test Route (`src/app/timeline-test/page.tsx`)

Isolated development/testing route for timeline features:
- Mock density data generation (multi-modal Gaussian variants)
- `DensityAreaChart` + `DensityHeatStrip` comparison
- `DualTimeline` with adaptive warp map override
- Slice creation/debug tools: `SliceToolbar`, `WarpSliceEditor`, `SliceList`
- Slice creation layer, boundary handles, committed slice layer
- Debug info: density stats, computing status, snap intervals, boundary snap mode, preview validity

---

## 7. Timeline Test 3D Route (`src/app/timeline-test-3d/page.tsx`)

Integration route connecting timeline + 3D cube:
- Loads real crime data via `useCrimeData()`
- Hydrates `useTimelineDataStore` and `useAdaptiveStore`
- Left panel: `DualTimeline` + `BurstList`
- Right panel: `TimelineTest3DScene` (3D visualization)
- **Full auto-acceptance workflow**: Accept warp profiles, interval boundaries, or full-auto packages via custom DOM events
- Suggestion panel integration

---

## Thesis Section 4.4 Mapping

### 4.4.1 Space-Time Cube (3D representation)
| Requirement | Status | Implementation |
|---|---|---|
| XZ plane = spatial coordinates | ✅ YES | Projected lat/lon to (x,z) via `src/lib/projection.ts`, normalized to [-50,50] |
| Y axis = time | ✅ YES | Time normalized to [0,100] range, Y position computed via shader |
| Points as visual elements | ✅ YES | Sphere instances via `instancedMesh` with custom shader |
| Volume visualization | ⚠️ PARTIAL | No explicit cube bounding box/walls, just free-floating point cloud with grid lines |
| Legend/labels | ✅ YES | `SimpleCrimeLegend`, debug overlay with metadata, `CrimeCategoryLegend` |

### 4.4.2 2D Density Projection
| Requirement | Status | Implementation |
|---|---|---|
| 2D density overlay on map | ✅ YES | `MapHeatmapOverlay` (canvas), `DeckGlHeatmapOverlay` (GPU) |
| 3D heatmap overlay | ✅ YES | `HeatmapOverlay` (two-pass GPGPU) in 3D scene |
| STKDE hotspot visualization | ✅ YES | `MapStkdeHeatmapLayer`, `SlicePlane` heatmap texture overlay |
| Dedicated density panel | ⚠️ PARTIAL | Density shown as `DensityHeatStrip` and histogram in timeline; no separate 2D density projection panel |
| Category shapes | ✅ YES | `SimpleCrimePoints` uses `resolveCategoryShape` for shape-coded points |

### 4.4.3 Opacity Modulation (Clutter Reduction)
| Requirement | Status | Implementation |
|---|---|---|
| Focus+Context dimming | ✅ YES | Ghosting shader: context points desaturated, dimmed, dithered |
| Brush-based dimming | ✅ YES | Points outside brush range get 0.1× extra opacity multiplier |
| Spatial filter ghosting | ✅ YES | Points outside spatial bounds get context dimming treatment |
| LOD progressive removal | ✅ YES | Checkerboard dithering based on LOD factor (0-1) |
| Burst highlighting | ✅ YES | Orange tint for points above burst threshold |
| Slice highlighting | ✅ YES | White tint for points inside active slices |
| Configurable context opacity | ✅ YES | `uContextOpacity` uniform (via `useUIStore.state.contextOpacity`) |

### 4.4.4 Trajectory Rendering
| Requirement | Status | Implementation |
|---|---|---|
| 3D trajectory lines | ✅ YES | `Trajectory.tsx` — Three.js Line with color-coded segments, arrow markers |
| 2D map trajectories | ✅ YES | `MapTrajectoryLayer.tsx` — MapLibre LineString + circle markers |
| Block-based grouping | ✅ YES | `groupToTrajectories()` in `src/lib/trajectories.ts` |
| Selection/focus on trajectory | ✅ YES | Click selects trajectory, camera auto-focuses via `fitToBox` |
| Adaptive Y on trajectories | ⚠️ PARTIAL | `adaptiveYValues` prop passed but computation uses `computeAdaptiveYColumnar` (may not match full warp pipeline) |
| Hover/selection states | ✅ YES | Hovered state (cursor), selected state (highlight + camera focus) |

### 4.4.5 Interaction Mechanisms
| Requirement | Status | Implementation |
|---|---|---|
| **Timeline Brushing** | ✅ YES | Overview brush sets detail window → syncs to `useFilterStore.selectedTimeRange` |
| **Detail Zoom/Pan** | ✅ YES | Pointer interactions on `DualTimelineSurface` detail SVG |
| **Point Selection** | ✅ YES | Click on map points → `useCoordinationStore.selectedIndex` |
| **3D Orbit** | ✅ YES | `CameraControls` (orbit, pan, zoom, min/max distance, polar angle limit) |
| **Cross-view coordination** | ✅ YES | `useSelectionSync()` hook ties together map, cube, and timeline selections |
| **Filter Panels** | ✅ YES | `FilterOverlay`: type + district + time range + spatial bounds filtering |
| **Time Playback** | ✅ YES | Play/pause/step with configurable speed (0.5x-5x) |
| **Resolution Control** | ✅ YES | Temporal resolution slider (seconds → years) |
| **Slice Creation** | ✅ YES | Drag on timeline to create time slices, 3D double-click to create point slices |
| **Spatial Selection** | ✅ YES | Rectangle drag selection on map (`MapSelectionOverlay`) |
| **Slice Editing** | ✅ YES | Drag handles on timeline + 3D, merge/split/delete in `BinningControls` |

### 4.4.6 Adaptive Time Scaling
| Requirement | Status | Implementation |
|---|---|---|
| Density-based time warping | ✅ YES | Web Worker computes warp map; GPU shader applies adaptive Y; timeline scale adapts |
| Linear ↔ Adaptive toggle | ✅ YES | Toggle button in `TimelinePanel`, stored in `useTimeStore.timeScaleMode` |
| Web Worker computation | ✅ YES | `src/workers/adaptiveTime.worker.ts` — computes density, burstiness, and warp maps |
| Slice-authored warping | ✅ YES | User-defined warp slices with falloff weighting produce authored warp maps |
| STKDE hotspot detection | ✅ YES | `src/lib/stkde/` — density-clustering algorithms for hotspot detection |
| Adaptive timeline axis | ✅ YES | `DualTimeline` detail scale uses warped mapping with binary-search invert |
| Smooth transition | ✅ YES | `MathUtils.damp` in `useFrame` smoothly interpolates `uWarpFactor` uniform |
| Burst metrics | ✅ YES | Configurable: `density` or `burstiness` as burst metric |
| Precomputed maps | ✅ YES | `/api/adaptive/global` endpoint for server-computed maps |

---

## Known Issues & Incomplete Features

### `DataPoints.tsx`
1. **CPU matrix sync lag**: 500ms debounce on `warpFactor`/`warpMap` changes for CPU-side position sync means raycasting may hit wrong positions during animation
2. **Unused `uTransition` uniform**: Legacy uniform maintained in shader but replaced by `uWarpFactor` in vertex
3. **PointInspector integration**: Comment at line 593 indicates point inspection inside slice panel is TODO

### `Trajectory.tsx`
4. **Adaptive Y values**: `computeAdaptiveYColumnar()` (line 52 in TrajectoryLayer) is called but the full adaptive warp pipeline (density-based warp map) isn't applied — only the columnar adaptive scale
5. **LOD threshold commented out**: Lines 113-115 show commented LOD traversal threshold logic

### `SelectedWarpSliceOverlay.tsx`
6. **Overlay positioning**: Uses fixed `DATA_MIN_TIMESTAMP`/`DATA_MAX_TIMESTAMP` constants which may not align with actual data domain

### `SimpleCrimePoints.tsx`
7. **Two implementations of same concept**: `DataPoints.tsx` (instancedMesh + shader) and `SimpleCrimePoints.tsx` (Points geometry) — potential confusion over which is canonical
8. **Duplicate warp map logic**: `buildSliceAuthoredWarpMap` duplicated across at least 3 files (SimpleCrimePoints, SelectedWarpSliceOverlay, timeline-test page) — should be extracted to shared lib

### Timeline
9. **`detailPointsOverride` vs auto mode**: Timeline has multiple rendering paths that may produce inconsistent results
10. **Burst list integration**: `useBurstWindows` hook imports from `@/components/viz/BurstList` creating circular-ish dependency

### General
11. **No explicit cube volume boundary**: The 3D scene is a point cloud without visual cube edges/faces — hard to read spatial boundaries
12. **Adaptive axis labels on cube**: No visual indicator in the 3D scene showing whether time axis is linear or adaptive (the debug overlay text shows it but the visual grid doesn't reflect the warp)
13. **Dual point rendering paths**: `DataPoints` (instanced) vs `SimpleCrimePoints` (buffer geometry) vs `SliceCrimePoints` (within slices) — three ways to render crime points
14. **Demo/Test page duplication**: `timeline-test`, `timeline-test-3d`, `timeslicing` all contain overlapping orchestration logic for loading data and hydrating stores

---

## Component Interaction Map

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  FilterOverlay│────>│  useFilterStore  │────>│  DataPoints       │
│  (type,dist)  │     │  (selectedTypes, │     │  (GPU ghosting    │
│               │     │   selectedTime,  │     │   shader, adaptive│
│               │     │   spatialBounds) │     │   Y positioning)  │
└──────────────┘     └────────┬─────────┘     └───────────────────┘
                              │                       ▲
┌──────────────┐              │                       │
│ MapVisualize │<─────────────┤              ┌────────┴─────────┐
│ (MapLibre)   │              │              │ useSelectionSync │
│              │              │              │ (cross-view      │
│ Click select │──────────────┤              │  coordination)   │
└──────────────┘              │              └──────────────────┘
                              │
┌──────────────┐     ┌────────┴─────────┐     ┌──────────────────┐
│ TimelinePanel│────>│  useTimeStore     │     │  useAdaptiveStore│
│ (playback,   │     │  (timeScaleMode,  │     │  (warpFactor,    │
│  resolution, │     │   currentTime,    │     │   densityMap,    │
│  scale mode) │     │   timeRange)      │     │   warpMap)       │
└──────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │
                                              ┌────────┴─────────┐
                                              │ adaptiveTime.    │
                                              │ worker.ts        │
                                              │ (Web Worker:     │
                                              │  density + warp  │
                                              │  computation)    │
                                              └──────────────────┘
```

---

## Key File Index

| File | Lines | Purpose |
|---|---|---|
| `src/app/dashboard/page.tsx` | 32 | Main dashboard layout |
| `src/components/viz/CubeVisualization.tsx` | 225 | 3D cube container with debug overlay |
| `src/components/viz/MainScene.tsx` | 208 | 3D scene orchestration (adaptive compute, scene setup) |
| `src/components/viz/DataPoints.tsx` | 692 | GPU-instanced crime point rendering with ghosting shader |
| `src/components/viz/shaders/ghosting.ts` | 297 | Custom Three.js shader for adaptive Y + focus+context |
| `src/components/viz/SimpleCrimePoints.tsx` | 485 | Alternative point rendering (buffer geometry) |
| `src/components/viz/TimeSlices.tsx` | 173 | 3D time slice orchestration |
| `src/components/viz/SlicePlane.tsx` | 239 | Individual time slice plane in 3D |
| `src/components/viz/HeatmapOverlay.tsx` | 168 | Two-pass GPU heatmap |
| `src/components/viz/Trajectory.tsx` | 197 | 3D trajectory rendering |
| `src/components/viz/TrajectoryLayer.tsx` | 100 | Trajectory layer orchestration |
| `src/components/map/MapVisualization.tsx` | 271 | 2D map visualization container |
| `src/components/map/MapEventLayer.tsx` | 295 | MapLibre crime event circle layer |
| `src/components/map/MapTrajectoryLayer.tsx` | 94 | Map trajectory line layer |
| `src/components/map/MapStkdeHeatmapLayer.tsx` | — | STKDE hotspot heatmap on map |
| `src/components/timeline/DualTimeline.tsx` | 725 | Main dual timeline (overview + detail) |
| `src/components/timeline/DualTimelineSurface.tsx` | 430 | SVG rendering surface for timeline |
| `src/components/timeline/TimelinePanel.tsx` | 224 | Temporal controls panel |
| `src/components/timeline/DensityHeatStrip.tsx` | — | Canvas density strip |
| `src/components/timeline/DensityAreaChart.tsx` | — | SVG area chart for density |
| `src/store/useAdaptiveStore.ts` | 204 | Adaptive time state management |
| `src/store/useFilterStore.ts` | — | Filter state (types, districts, time, space) |
| `src/store/useCoordinationStore.ts` | — | Cross-view selection coordination |
| `src/store/useTimeStore.ts` | — | Playback/time mode state |
| `src/workers/adaptiveTime.worker.ts` | — | Web Worker for density/warp computation |
