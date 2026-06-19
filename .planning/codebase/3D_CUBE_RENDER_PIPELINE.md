# 3D Cube Rendering Pipeline — Deep Dive

**Analysis Date:** 2026-06-09  
**Focus:** Volumetric adaptive time slice integration points  
**Prerequisite:** Read `VIZ_ANALYSIS.md` for broader visualization context

---

## 1. Coordinate System

### Axis Convention
| Axis | Meaning | Range | Notes |
|------|---------|-------|-------|
| **X** | Spatial (Easting / Longitude) | `[-50, +50]` | Centered at 0; 100-unit cube |
| **Y** | **Time** (vertical axis, UP) | `[-50, +50]` | Normalized time mapped to Y |
| **Z** | Spatial (Northing / Latitude) | `[-50, +50]` | Centered at 0; 100-unit cube |

### Camera Setup (`src/components/viz/Scene.tsx`)
```typescript
camera={{ position: [50, 50, 50], fov: 45 }}
```
- PerspectiveCamera at (50, 50, 50) looking at origin (0,0,0)
- Fog: background color, near=10, far=500
- `CameraControls` from `@react-three/drei`: smoothTime=0.25, minDist=1, maxDist=500, maxPolarAngle=π/2

### Time → Y Mapping (Two Modes)

**Linear Mode:**  
Time is normalized to `[0, 100]` then positioned at `(time_normalized - 50)` to center in the cube.  
A point at t=0% → Y=-50 (bottom), t=100% → Y=+50 (top).

**Adaptive Mode:**  
The Web Worker (`src/workers/adaptiveTime.worker.ts`) computes a warp map — a 1D texture of `binCount` samples mapping normalised time percent → warped Y position.  
The vertex shader samples this texture and mixes:
```glsl
float currentY = mix(linearY, adaptiveY, uWarpFactor);
```
- `uWarpFactor = 0` → fully linear (no warp)
- `uWarpFactor = 1` → fully adaptive (density-proportional spacing)

### Coordinate Normalization Pipeline

**For columnar (Apache Arrow) mode** (`DataPoints.tsx` lines 464-467):
```typescript
x = ((colX[i] - minX) / xRange * 100) - 50;  // Project to [-50, +50]
z = ((colZ[i] - minZ) / zRange * 100) - 50;  // Project to [-50, +50]
```
Same logic in vertex shader (`ghosting.ts` lines 110-113):
```glsl
float wx = ((colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x) * 100.0) - 50.0;
float wz = ((colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y) * 100.0) - 50.0;
```

**For point data mode**: `point.x`, `point.y`, `point.z` are used directly — assumed to already be in the [-50, +50] range.

---

## 2. R3F Canvas / Component Tree

```
<Scene transparent={mode === 'map'}>                    // R3F Canvas (camera @ [50,50,50], FOV 45)
  <color attach="background" />                         // Theme background (only if transparent=false)
  <fog attach="fog" />                                  // Fog for depth cues
  <Grid />                                              // gridHelper(200, 20, 'cyan', 'gray') + axesHelper(10)
  <TimePlane />                                         // Cyan plane at Y=0 (ground/cut plane)
  <TimeGrid />                                          // Horizontal grid lines along Y axis
  <DataPoints data={filteredCrimes} />                  // InstancedMesh crime points (ghosting shader)
  <AggregatedBars />                                    // InstancedMesh 3D bars (LOD-aware)
  <HeatmapOverlay />                                    // Two-pass GPGPU density heatmap on ground
  <TimeSlices>                                          // Interactive time slice planes + cluster overlays
    <SlicePlane slice={s} y={scale(s.time)} />          // Point slice (plane) or Range slice (box)
    <SliceClusterOverlay />                             // Cluster rectangles on slice plane
    <SliceCrimePoints />                                // Points within slice
  </TimeSlices>
  <BurstEvolutionOverlay />                             // Burst window overlays
  <EvolutionFlowOverlay />                              // Evolution flow arrows
  <ClusterHighlights />                                 // Cluster volume boxes (wireframe + fill)
  <ClusterLabels />                                     // Cluster text labels (HTML)
  <SpatialConstraintOverlay />                          // Spatial constraint boxes
  <SelectedWarpSliceOverlay />                          // Highlighted warp slice band
  <LODController />                                     // Updates LOD factor based on camera distance
  <CameraControls />                                    // Orbit controls
  <Controls />                                          // Floating toolbar (re-exported)
</Scene>
```

### Rendering Order (stacked in scene):
1. **Grid** — spatial reference on ground (XZ plane at Y=0)
2. **TimePlane** — ground plane (Y=0)
3. **TimeGrid** — temporal grid lines at various Y levels
4. **AggregatedBars** — 3D bins (histogram)
5. **DataPoints** — crime event points (instanced with shader)
6. **HeatmapOverlay** — density overlay on ground
7. **ClusterHighlights** — cluster volume boxes
8. **TimeSlices** — interactive slice planes (from separate group)
9. **SpatialConstraintOverlay** — spatial boundary boxes
10. **SelectedWarpSliceOverlay** — warp band highlight
11. **LODController** — pure logic (returns null)
12. **CameraControls** — user input handling

---

## 3. "Floor" / Ground of the Cube

There is **no explicit cubic bounding box** with walls. The scene is a free-floating point cloud.

### Ground Elements

| Element | File | Details |
|---------|------|---------|
| **gridHelper** | `Grid.tsx` | 200×200 grid with 20 divisions, cyan/gray lines. Positioned at origin Y=0. |
| **axesHelper** | `Grid.tsx` | Small 10-unit axis indicator at origin |
| **TimePlane (cyan)** | `TimePlane.tsx` | 100×100 plane at Y=0, rot X:-90°, 20% cyan, DoubleSide |
| **HeatmapOverlay** | `HeatmapOverlay.tsx` | Two-pass GPGPU heatmap rendered onto a 100×100 plane at Y=0.015 (just above ground) |

### Missing Visual Elements
- No cube edges/wireframe bounding the 100×100×100 volume
- No cube face labels (X, Y, Z axis labels)
- No grid on the time axis (only horizontal lines at discrete time intervals)
- The scene is "floating" — no explicit bottom/top visual boundary

---

## 4. Time-Related Visual Elements

### TimeGrid (`src/components/viz/TimeGrid.tsx`)

Renders **horizontal ring lines** at specific Y levels (time intervals):
- Each ring is a square perimeter: `(-50, y, -50) → (50, y, -50) → (50, y, 50) → (-50, y, 50) → (-50, y, -50)`
- Line color: `#94a3b8` (slate), 20% opacity
- **Interval selection** based on `timeResolution`:
  - `hours` → 6-hour intervals (`timeHour.every(6)`)
  - `days` → daily (`timeDay.every(1)`)
  - `weeks` → weekly (`timeWeek.every(1)`)
  - `months` → monthly (`timeMonth.every(1)`)
  - `years` → yearly (`timeYear.every(1)`)
- Max 40 lines pruned via modulo
- Y positions computed from `epochSecondsToNormalized()` using `minTimestampSec` / `maxTimestampSec`

**Burst bands** (orange highlights):
- Computed from densityMap or burstinessMap
- Shows horizontal orange rings at Y positions where burst metric exceeds `burstCutoff`
- Color: `#f97316` at 60% opacity

### TimePlane (`src/components/viz/TimePlane.tsx`)
- Static ground plane at Y=0
- Cyan (`#00FFFF`), 20% opacity, DoubleSide
- Used as a visual "cut plane" reference at the bottom

### SlicePlane (`src/components/viz/SlicePlane.tsx`)
**Point slices:** Thin cyan plane (100×100) at the slice's Y position, rotated flat (X:-90°).
**Range slices:** Purple box (100 × height × 100) spanning the Y range.
- Drag handle sphere at edge for vertical repositioning
- STKDE heatmap texture can be overlaid (when `stkdeSurface` is provided)

---

## 5. Shader Architecture

### Ghosting Shader (`src/components/viz/shaders/ghosting.ts`)

Applied to `DataPoints`'s `meshStandardMaterial` via `onBeforeCompile`.

**Vertex shader modifications:**
1. Position computation via warp texture sampling
2. Columnar data projection (X,Z from colX/colZ)
3. Adaptive Y mixing based on `uWarpFactor`
4. LOD scaling of point size
5. Varyings for fragment (vWorldX/Y/Z, vLinearY, vFilterType, vFilterDistrict, vInstanceId)

**Fragment shader modifications:**
1. Time-plane focus glow (smoothstep near `uTimePlane`)
2. Filter masking (type + district via selection maps)
3. Spatial bounds culling
4. Focus+Context dimming (desaturation, dither discard, brush-range extra dimming)
5. Burst highlighting (orange tint)
6. Selection highlight (brighten single point)
7. Slice highlighting (white tint for points within any active slice range)
8. LOD checkerboard dithering

**Key uniforms for volumetric time slices:**
```glsl
uniform vec2 uSliceRanges[20];   // 20 slice ranges (flat float32[40])
uniform int uSliceCount;         // Number of active slices
uniform float uWarpFactor;       // 0=linear, 1=adaptive
uniform sampler2D uWarpTexture;  // 1D warp map (N×1)
uniform float uTimeMin;          // Filter time range min
uniform float uTimeMax;          // Filter time range max
```

### Heatmap Shaders (`src/components/viz/shaders/heatmap.ts`)

Two-pass GPGPU:
- **Pass 1 (aggregation):** Renders crime points as Gaussian splats into a Float32 RenderTarget (1024×1024). Accumulates density in additive blending.
- **Pass 2 (rendering):** Maps density values through logarithmic scale → cyan-white gradient → overlays on ground plane.

---

## 6. Volumetric Adaptive Time Slice Integration Points

### Where Volumes Would Render

**Option A — Box geometry in the TimeSlices group** (recommended):
Currently `SlicePlane.tsx` already renders range slices as box geometries:
```typescript
// SlicePlane.tsx lines 178-181
<mesh>
  <boxGeometry args={[100, height, 100]} />
  <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
</mesh>
```
A volumetric adaptive time slice could use a similar `boxGeometry` spanning the full XZ extent (100×100) with Y-dependent opacity or color mapped from a 3D density texture.

**Option B — Custom mesh with volumetric shader:**
A new component could render a volume using a custom shader with ray-marching or 3D texture lookup. This would sit at the TimeSlices level or alongside DataPoints, using the same warp/uniform infrastructure.

### Data Flow for Volumetric Slices

The existing pipeline already provides:
1. **Warp map** (Float32Array from adaptive worker) — provides the Y↔time mapping
2. **Slice ranges** (from `useSliceStore`) — defines time intervals
3. **Density/burstiness maps** — per-bin density values that could drive volume opacity
4. **Ghosting shader uniforms** — the infrastructure for passing slice data to the GPU

To add volumetric rendering, you would need:
1. A **3D density texture** (or 2D slices at discrete Y intervals)
2. A **volume rendering component** that samples this texture
3. **Uniforms** for the new shader (volume opacity, transfer function, etc.)
4. **Integration** with the existing adaptive pipeline (warp map, slice ranges)

### Specific Integration Points

| Hook Point | File | What to add |
|------------|------|-------------|
| Main Scene | `MainScene.tsx` | Mount new `VolumetricSlice` component inside the `<Scene>` |
| Slice data | `useSliceStore` | Add `volumetricEnabled`, `volumeOpacity` fields to `TimeSlice` |
| Density data | `useAdaptiveStore` | The existing `densityMap`/`burstinessMap` can drive volume opacity per-bin |
| Shader uniforms | `ghosting.ts` | Could reuse or create a new material for volume rendering |
| Camera interaction | `CameraControls` | Ensure volume meshes don't block orbit controls (set `renderOrder` appropriately) |
| LOD | `LODController` / `uLodFactor` | Volumes should simplify or hide at far distances |

### Coordinate Mapping for Volumes

Time slices in the 3D cube use the same coordinate convention as everything else:
- X: `[-50, 50]` (spatial)
- Y: warped time (0–100 normalized, shifted to [-50, 50])
- Z: `[-50, 50]` (spatial)

For a volumetric slice spanning a time range `[t0, t1]`:
```typescript
const y0 = scale(t0) - 50;  // Convert time percent to cube Y coordinate
const y1 = scale(t1) - 50;
const height = Math.abs(y1 - y0);
const centerY = (y0 + y1) / 2;
// Box: position=[0, centerY, 0], size=[100, height, 100]
```

---

## 7. Performance Notes

- **DataPoints** uses a single `instancedMesh` with up to 8.5M crime records (typically limited to ~500K via LOD/tiling)
- **AggregatedBars** uses an instanced mesh with 20,000 max instances
- **Ghosting shader** handles all fragment-level effects in one pass — no post-processing
- **LODController** tracks camera distance (100–300 range) and applies progressive point removal via checkerboard dithering and fragment discarding
- **HeatmapOverlay** uses a 1024×1024 Float RenderTarget — resolution could be a bottleneck for very large datasets

---

## 8. Key Files Index

| File | Lines | Role in Pipeline |
|------|-------|------------------|
| `src/components/viz/Scene.tsx` | 30 | R3F Canvas + camera setup |
| `src/components/viz/MainScene.tsx` | 208 | Scene composition + adaptive data hydration |
| `src/components/viz/Grid.tsx` | 10 | gridHelper + axesHelper |
| `src/components/viz/TimePlane.tsx` | 23 | Ground plane (Y=0) |
| `src/components/viz/TimeGrid.tsx` | 145 | Temporal ring grid lines |
| `src/components/viz/DataPoints.tsx` | 692 | Core crime point rendering (instanced + shader) |
| `src/components/viz/SimpleCrimePoints.tsx` | 485 | Alternative point rendering (buffer geometry) |
| `src/components/viz/shaders/ghosting.ts` | 297 | Custom ghosting shader (adaptive Y, focus+context) |
| `src/components/viz/shaders/heatmap.ts` | 108 | Two-pass GPGPU heatmap shaders |
| `src/components/viz/AggregatedBars.tsx` | 116 | 3D histogram bars (instanced) |
| `src/components/viz/HeatmapOverlay.tsx` | 168 | GPGPU heatmap engine |
| `src/components/viz/TimeSlices.tsx` | 173 | Slice orchestration |
| `src/components/viz/SlicePlane.tsx` | 239 | Individual slice plane/box |
| `src/components/viz/SliceClusterOverlay.tsx` | 71 | Cluster rectangles on slice |
| `src/components/viz/ClusterHighlights.tsx` | 57 | Cluster volume boxes |
| `src/components/viz/SpatialConstraintOverlay.tsx` | 80 | Spatial constraint boxes |
| `src/components/viz/SelectedWarpSliceOverlay.tsx` | 242 | Warp slice band highlight |
| `src/components/viz/spatialConstraintGeometry.ts` | 77 | Constraint → overlay box conversion |
| `src/components/viz/LODController.tsx` | 34 | Level-of-detail based on camera distance |
| `src/components/viz/CubeVisualization.tsx` | 225 | Top-level container |
| `src/store/useAdaptiveStore.ts` | 204 | Adaptive state (warp maps, density, burstiness) |
| `src/store/useTimeStore.ts` | 83 | Time mode & playback state |
| `src/store/useSliceStore.ts` | — | Slice definitions (time, range, visibility) |
| `src/workers/adaptiveTime.worker.ts` | 246 | Web Worker: density + warp computation |
