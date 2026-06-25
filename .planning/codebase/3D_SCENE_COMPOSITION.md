# 3D Scene Composition

**Analysis Date:** 2026-06-25

## Scene Graph

### Root Canvas

**File:** `src/components/viz/Scene.tsx`

```typescript
<Canvas
  gl={{ alpha: true }}  // Transparent for map overlay mode
  camera={{ position: [50, 50, 50], fov: 45 }}
>
  {!transparent && <color attach="background" args={[palette.background]} />}
  {!transparent && <fog attach="fog" args={[palette.background, 10, 500]} />}
  {children}
</Canvas>
```

- Background and fog colors sourced from `PALETTES[theme]` in `src/lib/palettes.ts`
- Alpha enabled for map overlay mode (`mode === 'map'`)
- Fog range: 10 to 500 units (fades to background color)

### Main Scene Composition (Layer Order)

**File:** `src/components/viz/MainScene.tsx`

Layer stack (bottom to top):

1. **Map Layer (optional):** `<MapBase />` — Only in map mode, rendered behind the transparent canvas
2. **ClusterManager:** Logic-only component (returns null) — Performs DBSCAN clustering of filtered points
3. **TimeSlices:** Slice planes, STKDE overlay, burst/evolution flow, slice cluster overlays
4. **ClusterHighlights:** 3D bounding boxes and wireframes for detected clusters
5. **ClusterLabels:** HTML labels for top 5 clusters with interaction
6. **SpatialConstraintOverlay:** User-defined spatial constraint boxes
7. **SelectedWarpSliceOverlay:** Highlighted band for selected warp slice
8. **CameraControls:** `@react-three/drei` CameraControls for orbit/fit

### Component Tree

```
Scene (Canvas)
├── [Background color]
├── [Fog]
├── Ambient / Directional Lights (implicit in R3F default)
├── DataPoints (instancedMesh - the core crime point cloud)
│   ├── sphereGeometry (0.5 radius, 8x8 segments)
│   ├── instancedBufferAttribute (filterType, filterDistrict, colX, colZ, colLinearY)
│   ├── instancedBufferAttribute (instanceColor)
│   ├── meshStandardMaterial (vertexColors, custom onBeforeCompile for ghosting)
│   └── Event handlers (onPointerDown, onPointerUp, onPointerMove, onPointerMissed)
├── HeatmapOverlay (optional, GPGPU two-pass)
│   ├── [Pass 1] Points → offscreen FBO (AdditiveBlending)
│   └── [Pass 2] Plane mesh → screen (NormalBlending)
├── TrajectoryLayer (optional)
│   └── Trajectory[] (Line + coneGeometry arrowhead)
├── TimeSlices
│   ├── [Hit box] boxGeometry(100,100,100) for double-click slice creation
│   ├── SlicePlane[] per slice (planeGeometry/boxGeometry + gridHelper)
│   │   ├── STKDE heatmap texture (optional)
│   │   └── Drag handle + HTML label
│   ├── SliceClusterOverlay[] per slice (plane/Line clusters)
│   ├── SliceCrimePoints[] per slice (Points renderer)
│   ├── BurstEvolutionOverlay (Line + sphereGeometry nodes)
│   └── EvolutionFlowOverlay (Line + coneGeometry arrowheads)
├── ClusterHighlights (boxGeometry fill + wireframe)
├── ClusterLabels (Html labels)
├── SpatialConstraintOverlay (boxGeometry + Edges + Html labels)
├── SelectedWarpSliceOverlay (boxGeometry + Edges + Html label)
├── RaycastLine (temporary debug visualization)
└── CameraControls (drei, makeDefault)
```

## Camera

- **Type:** `@react-three/drei` CameraControls (an OrbitControls wrapper)
- **Initial position:** `[50, 50, 50]` (isometric view of 100x100x100 cube)
- **FOV:** 45 degrees
- **Config:**
  - `smoothTime: 0.25` (smooth damping)
  - `minDistance: 1`
  - `maxDistance: 500`
  - `maxPolarAngle: Math.PI / 2` (prevents going below ground plane)
  - `makeDefault: true`

### Camera Reset

Triggered by `useUIStore.resetVersion` increment (e.g., from reset button in `CubeVisualization.tsx`):
```typescript
// src/components/viz/MainScene.tsx (lines 164-168)
useEffect(() => {
  if (controlsRef.current) controlsRef.current.reset(true);
}, [resetVersion]);
```

### Camera Fit-to-Cluster

Implemented in `src/components/viz/ClusterLabels.tsx` (lines 71-83):
```typescript
const box = new THREE.Box3(min, max);
controls.fitToBox(box, true, { paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 });
```

Also in `src/components/viz/TrajectoryLayer.tsx` for block selection.

## Modes

Two rendering modes controlled by `useUIStore.mode`:

1. **`abstract`** (default): 3D cube with dark background, fog, full scene
2. **`map`**: Canvas with `alpha: true`, MapLibre map behind, 3D points overlay

In map mode:
- `<Scene transparent={true}>` — No background/fog
- `<div className="absolute inset-0 z-0"><MapBase /></div>` renders before canvas
- Canvas has `z-10`, map layer has `z-0`
- Both have `pointer-events-none` parent; canvas children get `pointer-events-auto`

## Lighting

Uses R3F default lights (ambient + directional). No custom lighting setup in the codebase. The `meshStandardMaterial` on the point cloud relies on default lights for its shading.

## Animation Loop

**`useFrame` usage in `src/components/viz/DataPoints.tsx` (lines 370-428):**

Per-frame operations:
1. **Warp transition:** `MathUtils.damp()` on `uWarpFactor` toward target (0 for linear, `warpFactor` for adaptive) with speed factor 5
2. **LOD update:** Fetches `useAggregationStore.lodFactor` directly
3. **Slice range uniforms:** Updates `uSliceRanges` flat array (max 20 slices)

**`useFrame` in `src/components/viz/Trajectory.tsx` (lines 80-128):**

Per-frame operations:
1. **Warp transition:** `MathUtils.damp()` on transition ref
2. **Line geometry update:** Recomputes all vertex positions with linear↔adaptive lerp
3. **Trail effect:** Fades vertex colors by time distance from `currentTime`
4. **Arrowhead:** Updates position/orientation to follow last trajectory point

**`useFrame` in `src/components/viz/HeatmapOverlay.tsx` (lines 137-146):**

Per-frame operation:
1. **Aggregation render:** Switches render target to FBO, calls `gl.clear()` then `gl.render(aggregationScene, aggregationCamera)`, restores original target

### Animation Characteristics

- **Warp transitions:** Smoothed over multiple frames via `MathUtils.damp()` — smooths the abrupt change when switching between linear and adaptive time modes
- **Trajectory trail:** Exponential decay based on time distance from current playback position
- **Raycast line:** 500ms fade-out via `Date.now()` elapsed timer in `useFrame`
- **No requestAnimationFrame:** R3F manages the render loop; all animations hook into R3F's frame system

## Interaction Handling

### Point Cloud Interaction (DataPoints.tsx)

| Event | Handler | Behavior |
|-------|---------|----------|
| `pointerDown` | `handlePointerDown` | Records drag start coordinates |
| `pointerUp` | `handlePointerUp` | If click (drag < 5px): selects point index, shows raycast line, checks slice membership |
| `pointerMove` | `handlePointerMove` | Sets dragging flag |
| `pointerMissed` | `handlePointerMissed` | Clears selection |

### Slice Plane Interaction (SlicePlane.tsx)

| Event | Handler | Behavior |
|-------|---------|----------|
| `pointerDown` | Captures pointer, sets `isDragging` |
| Global `pointerMove` | Raycasts to camera-facing plane at slice height, updates slice position/range |
| Global `pointerUp` | Releases drag |

### Cluster Interaction (ClusterLabels.tsx)

| Event | Behavior |
|-------|----------|
| `pointerEnter` | Sets `hoveredClusterId` |
| `pointerLeave` | Clears `hoveredClusterId` |
| `click` | Toggles `selectedClusterId`, sets spatial bounds filter, fits camera to cluster |

### Trajectory Interaction (Trajectory.tsx)

| Event | Behavior |
|-------|----------|
| `pointerOver` | Sets `hoveredBlock` |
| `pointerOut` | Clears `hoveredBlock` |
| `click` | Toggles `selectedBlock`, selects first point in trajectory |

### Slice Creation

Double-clicking the hit box mesh (100x100x100 transparent box at origin) creates a point slice:
```typescript
// src/components/viz/TimeSlices.tsx (lines 121-131)
const y = e.point.y;
const time = yToTime(y);
addSlice({ type: 'point', time: clampedTime });
```

---

*Scene composition analysis: 2026-06-25*
