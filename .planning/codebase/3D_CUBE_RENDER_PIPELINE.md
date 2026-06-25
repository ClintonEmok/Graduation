# 3D Cube Render Pipeline

**Analysis Date:** 2026-06-25

## Pipeline Overview

The 3D space-time cube uses a dual-mode rendering pipeline: **columnar data mode** (GPU-optimized, production) and **data object mode** (fallback for mock/test data). Both modes render into a single `<Canvas>` managed by React Three Fiber (R3F).

**Scene container:** `src/components/viz/Scene.tsx`
**Main scene orchestrator:** `src/components/viz/MainScene.tsx`
**Canvas dimensions:** Full viewport, `gl={{ alpha: true }}` for map overlay mode

## Coordinate System

- **Y-axis:** Time (vertical, 0-100 normalized range)
- **X-axis:** Longitude/East-West (-50 to +50 normalized range)
- **Z-axis:** Latitude/North-South (-50 to +50 normalized range)
- **Cube volume:** 100x100x100 world units centered at origin

### Normalization

Crime coordinates are normalized in `src/lib/coordinate-normalization.ts`:

```
Chicago bounds: lon [-87.9, -87.5], lat [41.6, 42.1]
Normalized range: -50 to +50 on both X and Z axes
```

SQL-level normalization in `buildNormalizedSqlExpression()`:
```typescript
// src/lib/coordinate-normalization.ts
(((${column} - ${min}) / ${span}) * ${normalizedSpan}) + ${normalizedMin}
```

### Projection

Geographic-to-scene projection in `src/lib/projection.ts`:
- Uses `@math.gl/web-mercator` with Chicago center `[-87.6298, 41.8781]` at zoom 12
- `project(lat, lon)` → `[x, z]` in scene units (pixels at zoom 12)
- `unproject(x, z)` → `[lat, lon]`

## Rendering Modes

### Mode 1: Columnar Data (Production)

Used when `columns` is available from `useTimelineDataStore`. Data is stored in typed arrays:
- `columns.x` (`Float32Array`), `columns.z` (`Float32Array`), `columns.timestamp` (`Float32Array`)
- `columns.type` (`Uint8Array`), `columns.district` (`Uint8Array`)
- `columns.lat`, `columns.lon` (optional `Float32Array`)

**Rendering:** Single `InstancedMesh` with a `SphereGeometry` of radius 0.5 (8 segments). Each crime is an instance with:
- `instanceMatrix` positioned via shader (no CPU matrix update per frame)
- `instanceColor` for per-instance vertex coloring
- Custom `instancedBufferAttribute` for `filterType`, `filterDistrict`, `colX`, `colZ`, `colLinearY`

### Mode 2: Data Objects (Fallback)

Used when `columns` is null (mock/test data from `data: DataPoint[]`). Each point has `{ x, y, z, type, block }`.

**Rendering:** Same `InstancedMesh` but CPU-updating `instanceMatrix` in `useLayoutEffect`:
```typescript
// src/components/viz/DataPoints.tsx (lines 224-238)
data.forEach((point, i) => {
  tempObject.position.set(point.x, point.y, point.z);
  tempObject.updateMatrix();
  meshRef.current!.setMatrixAt(i, tempObject.matrix);
  tempColor.set(colorHex);
  meshRef.current!.setColorAt(i, tempColor);
});
```

## Shader System

### Ghosting Shader (Points)

**File:** `src/components/viz/shaders/ghosting.ts`

Applied via custom `onBeforeCompile` hook on `meshStandardMaterial`. The shader is injected by replacing `#include <common>` and `#include <project_vertex>` and `#include <dithering_fragment>`.

**Vertex shader modifications:**

1. **Coordinate projection** — Maps columnar data to world space:
   ```glsl
   float wx = ((colX - uDataBoundsMin.x) / (uDataBoundsMax.x - uDataBoundsMin.x) * 100.0) - 50.0;
   float wz = ((colZ - uDataBoundsMin.y) / (uDataBoundsMax.y - uDataBoundsMin.y) * 100.0) - 50.0;
   worldPos = vec3(wx, currentY, wz);
   ```

2. **Adaptive time warping** — Samples a 1D data texture for warped Y position:
   ```glsl
   float normalizedTime = clamp((linearY - uWarpDomainMin) / warpSpan, 0.0, 1.0);
   float adaptiveY = texture2D(uWarpTexture, vec2(normalizedTime, 0.5)).r;
   float currentY = mix(linearY, adaptiveY, uWarpFactor);
   ```

3. **LOD scaling** — Shrinks points at zoom-out:
   ```glsl
   vec3 transformedCopy = transformed * (1.0 - uLodFactor);
   ```

**Fragment shader modifications:**

1. **Focus+Context** — Points near `uTimePlane` get brighter; far points get dimmer
2. **Filter gating** — Type, district, spatial bounds, and time range filtering via discard
3. **Context dithering** — Points outside filters get dithered based on `uContextOpacity`:
   ```glsl
   float ditherValue = mod(gl_FragCoord.x * 0.37 + gl_FragCoord.y * 0.73, 1.0);
   if (ditherValue < threshold) discard;
   ```
4. **Burst highlighting** — Orange overlay when `burstDensity >= uBurstThreshold`
5. **Selection highlight** — Brightens the specific `vInstanceId` matching `uSelectedIndex`
6. **Slice highlighting** — Whitens points within any active slice range

### GPGPU Heatmap Shader

**File:** `src/components/viz/shaders/heatmap.ts`

**Component:** `src/components/viz/HeatmapOverlay.tsx`

**Two-pass architecture:**

1. **Pass 1 — Aggregation (Offscreen FBO):**
   - Renders all points as `THREE.Points` into a 1024x1024 `FloatType` `RedFormat` render target
   - Uses orthographic camera aligned to -50/+50 spatial grid
   - Vertex shader projects points spatially and gates them with filters
   - Fragment shader applies Gaussian falloff: `exp(-d * d * 20.0)` via `gl_PointCoord`
   - Uses `AdditiveBlending` for density accumulation

2. **Pass 2 — Heatmap rendering:**
   - Renders the FBO texture onto a flat plane at `y=0.015` with rotation `[-PI/2, 0, 0]`
   - Fragment shader applies logarithmic scaling: `log(1.0 + density) / log(1.0 + maxIntensity)`
   - Color mapping: cyan-to-white gradient based on log density
   - Controllable via `intensity` and `opacity` uniforms from `useHeatmapStore`
   - Blending mode configurable (default: `NormalBlending`)

### Warp Texture (1D Data Texture)

**Lifecycle in `src/components/viz/DataPoints.tsx`:**

```typescript
// Lines 89-97: Texture creation from Float32Array
const warpTexture = useMemo(
  () => createTexture(warpMap?.length > 0 ? warpMap : new Float32Array([0, 100])),
  [warpMap]
);
const densityTexture = useMemo(
  () => createTexture(selectedDensityMap?.length > 0 ? selectedDensityMap : new Float32Array([0, 0])),
  [selectedDensityMap]
);
```

Returns `THREE.DataTexture` with `RedFormat`, `FloatType`, `LinearFilter`. Automatically disposed via `useEffect` cleanup.

## Raycasting & Interaction Pipeline

**File:** `src/components/viz/DataPoints.tsx` (lines 514-633)

Uses R3F's built-in raycasting on `instancedMesh` events:
- `onPointerDown` — Tracks drag start position for click-vs-drag disambiguation (5px threshold)
- `onPointerUp` — On click (no drag): sets `selectedIndex` in coordination store, optionally activates slice panel
- `onPointerMove` — Tracks drag state
- `onPointerMissed` — Clears selection

**CPU matrix sync for raycasting:** A debounced (500ms) `useEffect` computes the final Y positions (linear + warp mix) and updates `instanceMatrix` so raycasting hits the correct locations. This is needed because the shader does the actual warping, but Three.js raycasting operates on CPU matrices.

## Slice Plane Rendering

**File:** `src/components/viz/SlicePlane.tsx`

Each slice is rendered as:
- **Point slice:** A `planeGeometry(100,100)` rotated to horizontal at Y position, with a `gridHelper` overlay
- **Range slice:** A `boxGeometry(100, height, 100)` spanning the time range
- **Opacity/color:** Based on `isLocked`, evolution state, and slice type
- **Drag handle:** A `sphereGeometry(1.5)` at corner for interactive repositioning
- **STKDE heatmap:** Optionally rendered as a `CanvasTexture` on an elevated plane at `y + 0.08`
- **HTML label:** Via `@react-three/drei` `<Html>` component for time label overlay

Drag interaction uses window-level pointer events with raycasting to a camera-facing plane:
```typescript
// src/components/viz/SlicePlane.tsx (lines 106-156)
const planeNormal = cameraDir.clone().negate();
const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, centerY, 0));
```

## Evolution Flow & Burst Lines

**File:** `src/components/viz/EvolutionFlowOverlay.tsx` — `THREE.Line` segments between slice centers with cone arrowheads

**File:** `src/components/viz/BurstEvolutionOverlay.tsx` — `THREE.Line` connectors with `sphereGeometry` nodes at endpoints, color-coded by burst class

**File:** `src/components/viz/Trajectory.tsx` — Uses `@react-three/drei` `<Line>` component with animated vertex colors and trail effect, plus coneGeometry arrowhead

## Spatial Constraint Overlays

**File:** `src/components/viz/SpatialConstraintOverlay.tsx`

Renders axis-aligned bounding boxes from `useCubeSpatialConstraintsStore` as `boxGeometry` meshes with `Edges` from drei. Color tokens support named colors (amber, blue, cyan, emerald, etc.) mapped to CSS-like hex values.

**File:** `src/components/viz/spatialConstraintGeometry.ts` — Normalizes bounds, computes center/size, handles degenerate axes with `MIN_AXIS_SIZE = 0.5`.

## Cluster Rendering

**File:** `src/components/viz/ClusterHighlights.tsx` — Each cluster rendered as a `boxGeometry` with `meshBasicMaterial` (fill + wireframe), color-coded by dominant crime type, opacity scales by selection/hover state.

**File:** `src/components/viz/ClusterLabels.tsx` — Top 5 clusters get `<Html>` labels with crime type, count, time range. Clicking sets spatial bounds filter and optionally fits camera to cluster bounding box via `controls.fitToBox()`.

**File:** `src/components/viz/SliceClusterOverlay.tsx` — Per-slice cluster overlay at `SLICE_CLUSTER_OVERLAY_ELEVATION` (0.16) above slice plane, using `planeGeometry` fills and `Line` borders.

---

*Pipeline analysis: 2026-06-25*
