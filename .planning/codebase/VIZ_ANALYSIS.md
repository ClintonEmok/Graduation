# Visualization Analysis

**Analysis Date:** 2026-06-25

## Component Inventory

All visualization components in `src/components/viz/`:

| Component | File | Type | Purpose |
|-----------|------|------|---------|
| Scene | `Scene.tsx` | Container | R3F Canvas setup (camera, fog, background) |
| MainScene | `MainScene.tsx` | Orchestrator | Composes all 3D layers, manages data loading |
| CubeVisualization | `CubeVisualization.tsx` | Layout | Dashboard wrapper with legend, reset, info overlay |
| DataPoints | `DataPoints.tsx` | Core | InstancedMesh crime point cloud with ghosting shader |
| HeatmapOverlay | `HeatmapOverlay.tsx` | Overlay | GPGPU two-pass density heatmap |
| TimeSlices | `TimeSlices.tsx` | Group | Slice planes + cluster/evolution overlays |
| SlicePlane | `SlicePlane.tsx` | Element | Individual slice with drag, label, STKDE surface |
| SliceCrimePoints | `SliceCrimePoints.tsx` | Element | Points renderer for slice-local crime dots |
| ClusterHighlights | `ClusterHighlights.tsx` | Overlay | 3D cluster bounding boxes |
| ClusterLabels | `ClusterLabels.tsx` | Overlay | HTML labels for clusters |
| ClusterManager | `ClusterManager.tsx` | Logic | DBSCAN clustering engine (returns null) |
| SliceClusterOverlay | `SliceClusterOverlay.tsx` | Overlay | Per-slice cluster rectangles |
| BurstEvolutionOverlay | `BurstEvolutionOverlay.tsx` | Overlay | Burst connector lines + nodes |
| EvolutionFlowOverlay | `EvolutionFlowOverlay.tsx` | Overlay | Evolution flow lines + arrows |
| TrajectoryLayer | `TrajectoryLayer.tsx` | Group | Trajectory management |
| Trajectory | `Trajectory.tsx` | Element | Individual trajectory line with animation |
| TrajectoryTooltip | `TrajectoryTooltip.tsx` | Overlay | Tooltip for trajectory hover |
| RaycastLine | `RaycastLine.tsx` | Debug | Temporary raycast visualization |
| SpatialConstraintOverlay | `SpatialConstraintOverlay.tsx` | Overlay | Spatial constraint boxes |
| SpatialConstraintGeometry | `spatialConstraintGeometry.ts` | Utility | Constraint box geometry computation |
| SelectedWarpSliceOverlay | `SelectedWarpSliceOverlay.tsx` | Overlay | Warp slice highlight band |
| Grid | `Grid.tsx` | Element | Grid helper + axes |
| FilterOverlay | `FilterOverlay.tsx` | UI | Filter controls (portal) |
| FloatingToolbar | `FloatingToolbar.tsx` | UI | Floating toolbar with actions |
| SimpleCrimeLegend | `SimpleCrimeLegend.tsx` | UI | Crime type color legend |
| PointInspector | `PointInspector.tsx` | UI | Point detail inspector |
| BurstList | `BurstList.tsx` | UI | Burst window list panel |
| BurstDetails | `BurstDetails.tsx` | UI | Burst detail panel |
| PresetManager | `PresetManager.tsx` | UI | Filter preset management |
| SliceStats | `SliceStats.tsx` | UI | Slice statistics display |
| ContextualSlicePanel | `ContextualSlicePanel.tsx` | UI | Slice context panel |
| CrimeCategoryLegend | `CrimeCategoryLegend.tsx` | UI | Category legend |
| FilterOverlay | `FilterOverlay.tsx` | UI | Portal-based filter overlay |

## Rendering Performance Analysis

### Current Performance Characteristics

**GPU-bound operations:**
- Single `InstancedMesh` draw call for all crime points (potentially millions)
- Ghosting shader in fragment: per-pixel filtering, burst highlighting, slice highlighting, context dithering
- GPGPU heatmap: 1024x1024 FBO render per frame (768K fragments per pass, ~1.5M total with Gaussian falloff)
- Adaptive time warping texture lookup per vertex (negligible)

**CPU-bound operations:**
- Debounced (500ms) CPU matrix sync for raycasting — iterates all points, computes warp sampling
- Cluster re-analysis on filter changes (debounced 400ms)
- Trajectory per-frame vertex updates (animated lines)
- Per-frame uniform updates for slices, warp, LOD

### Bottlenecks

1. **CPU matrix sync** (`DataPoints.tsx` lines 430-497): Walking all crime points every 500ms to update instance matrices. At 500K+ points, this blocks main thread for 50-100ms.

2. **ClusterManager** (`src/components/viz/ClusterManager.tsx`): DBSCAN on main thread with O(n²) worst-case complexity. The `density-clustering` library runs synchronously on the render thread.

3. **Trajectory per-frame updates** (`Trajectory.tsx` lines 80-128): Rebuilding line geometry every frame with per-vertex colors. Uses `setPoints`/`setColors` which triggers geometry re-upload.

4. **HeatmapOverlay per-frame FBO render** (`HeatmapOverlay.tsx` lines 137-146): Full 1024x1024 render every frame even when no data changes.

### Optimization Opportunities

1. **Matrix sync offloading:** Move the debounced CPU position computation to a Web Worker that returns updated matrices as `Float32Array` for direct buffer upload.

2. **Cluster computation in Worker:** Move `density-clustering` DBSCAN to a Web Worker (already pattern established with `adaptiveTime.worker.ts` and `stkdeHotspot.worker.ts`).

3. **Heatmap FBO throttling:** Gate the per-frame render on actual data changes (filter/time changes) using a dirty flag pattern. Currently renders every frame unconditionally.

4. **Trajectory optimized updates:** Use `BufferGeometry` with pre-allocated `Float32Array` and `needsUpdate` flags instead of `setPoints` which creates new arrays.

5. **InstancedMesh frustum culling:** Currently `frustumCulled` uses default. The sphere geometry with `radius=0.5` may cause incorrect frustum culling with the 100x100x100 spatial extent (all points in one mesh).

### Memory Considerations

- **Warp texture:** Two `DataTexture` instances (warp + density) with `RedFormat` + `FloatType`. Each is `N x 1` pixels (N = up to 1024 bin count). ~16KB total.
- **Columnar data:** Held in `useTimelineDataStore` as typed arrays. A full 8.5M crime dataset would use roughly:
  - `x`, `z`, `timestamp`: 3 × 8.5M × 4 bytes = ~100MB
  - `type`, `district`: 2 × 8.5M × 1 byte = ~17MB
  - `timestampSec`: 8.5M × 8 bytes = ~68MB
  - `block`: 8.5M string references (variable)
  - Total: ~200MB+ for full dataset
- **Downsampling:** `src/lib/downsample.ts` provides `downsampleByStride()` but it's not automatically applied before rendering.

## Tradeoffs

### InstancedMesh vs PointsMaterial

**Current:** `InstancedMesh` with `SphereGeometry` + custom shader
- Pros: Supports per-instance colors and custom attributes, onBeforeCompile hook for shader injection
- Cons: Sphere geometry overhead (8x8 segments = 64 triangles per point), CPU matrix sync needed for raycasting

**Alternative:** `THREE.Points` with `PointsMaterial`
- Pros: Native GPU instancing, no CPU matrix overhead, simpler setup
- Cons: Limited to 1-pixel or fixed-size sprites, no per-point color via custom attributes easily, no `onBeforeCompile` patching

**Verdict:** `InstancedMesh` is correct for this use case because of the complex shader injection needed for ghosting, warp, and filtering.

### GPGPU Heatmap vs CPU Density Grid

**Current:** GPU-accelerated density accumulation via FBO
- Pros: Real-time, leverages GPU parallelism, no data transfer
- Cons: Fixed resolution (1024x1024), per-frame render cost, blending artifacts at very high densities

**Alternative:** Compute density on CPU, upload as texture
- Pros: Precise control over accumulation, no GPU blending artifacts
- Cons: Data transfer overhead, CPU-bound on large datasets

**Verdict:** GPGPU approach is appropriate for this interactive prototype where real-time responsiveness is valued over pixel-perfect accuracy.

### Columnar Data vs Object Arrays

**Current:** Columnar typed arrays (`Float32Array`, `Uint8Array`) for data transfer between API, stores, and GPU
- Pros: Zero-copy transfer to GPU via `BufferAttribute`, efficient memory, compatible with Web Workers (transferable)
- Cons: Requires special handling for per-point lookups, more complex code

**Alternative:** Object arrays (`CrimeRecord[]`)
- Pros: Simpler code, natural JS patterns, easier to debug
- Cons: Higher memory overhead, no direct GPU upload, slower filter iteration

**Verdict:** Columnar format is essential for performance at scale. The API route (`/api/crime/stream`) returns columnar data directly from DuckDB+Arrow.

## Color Pipeline

**File:** `src/lib/palettes.ts`

Three theme palettes:
1. **Dark** (default): Vibrant colors on black, Earth tones for crime categories
2. **Light**: Muted, lower-contrast colors for white background
3. **Colorblind**: Okabe-Ito palette for accessibility

Colors assigned per crime category via uppercase key lookup:
```
'THEFT' → '#FFD700', 'BATTERY' → '#F59E0B', 'NARCOTICS' → '#38BDF8', etc.
```

In the 3D cube, colors are stored per-instance in `instanceColor` attribute. In dark mode, all points can be switched to white (`useWhitePoints`) for a minimalist aesthetic.

## STKDE Color Scale

**File:** `src/lib/stkde/heatmap-scale.ts`

6-stop color gradient for heatmap intensity:
```
0.0 → rgba(30, 64, 175, 0)    (transparent dark blue)
0.2 → rgba(59, 130, 246, 0.35)  (semi-transparent blue)
0.4 → rgba(16, 185, 129, 0.5)   (semi-transparent green)
0.6 → rgba(234, 179, 8, 0.7)    (yellow)
0.8 → rgba(249, 115, 22, 0.8)   (orange)
1.0 → rgba(239, 68, 68, 0.9)    (red)
```

---

*Visualization analysis: 2026-06-25*
