# Phase 76: Foundation Cleanup + Motion Scaffolding - Research

**Researched:** 2026-05-26
**Domain:** Three.js/R3F spatiotemporal visualization with GPU heatmap, GSAP animation sequencing, Web Worker computation, shader optimization
**Confidence:** HIGH (Context7-verified for deck.gl/GSAP patterns, codebase-verified for all existing files)

## Summary

Phase 76 delivers the rendering foundation and motion primitives for the v3.2 Visualization Level Up. This research covers all seven requirements: motion scaffolding primitives for the 3D STKDE widget, deck.gl GPU heatmap integration, GSAP installation scoped to camera fly-throughs, store consolidation analysis, KDE worker offloading, shader program caching fixes, and frustum culling/LOD for the 8.5M instanced point cloud.

The codebase analysis revealed well-organized but drift-prone patterns. The dashboard-demo 3D pipeline (`Demo3dSpatialView → Stkde3DScene → StkdeSliceStack`) uses Canvas2D CPU textures and has `frustumCulled={false}` on all instanced geometry (7 files). The ghosting shader uses `onBeforeCompile` with template literals that trigger WebGL recompilation on every filter change. KDE computation (`computeSliceKde`) runs synchronously on the main thread in `Demo3dSpatialView.tsx`. Three dashboard-demo stores are drift-prone and can consolidate into the central coordination store.

**Primary recommendation:** Install deck.gl + GSAP as new packages, offload KDE to a Web Worker following the existing `adaptiveTime.worker.ts` pattern, enable frustum culling on all instanced geometry, replace `onBeforeCompile` template literals with static shader source, and build motion scaffolding as three pure-function primitives in `src/lib/motion/`.

## Standard Stack

### Core Additions

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| deck.gl | ^9.3.2 | GPU heatmap density on MapLibre map | HeatmapLayer uses GPU Gaussian KDE; ~48KB gzip for core+aggregation-layers |
| @deck.gl/aggregation-layers | ^9.3.2 | HeatmapLayer, ScreenGridLayer | Required by HeatmapLayer; pulls luma.gl for WebGL2 |
| @deck.gl/mapbox | ^9.3.2 | MapboxOverlay for interleaved rendering | Renders deck.gl layers inside MapLibre's GL context; compatible with maplibre-gl |
| GSAP | ^3.15.0 | Camera fly-through sequencing | Framework-agnostic; targets Three.js objects via refs without React reconciliation |

### Existing (Already Installed)

| Library | Version | Purpose |
|---------|---------|---------|
| three | ^0.182.0 | 3D rendering; ShaderMaterial, InstancedMesh, Points, BufferGeometry |
| @react-three/fiber | ^9.5.0 | React renderer for Three.js; useFrame for per-frame animation |
| @react-three/drei | ^10.7.7 | CameraControls, Instances, Stats, adaptive quality |
| zustand | ^5.0.10 | State management; getState() for frame-synchronous reads |
| maplibre-gl | ^5.17.0 | 2D map rendering |
| react-map-gl | ^8.1.0 | React wrapper for MapLibre |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| deck.gl | MapLibre built-in heatmap | MapLibre heatmap is CPU-bound, no GPU KDE control. Not viable for 8.5M records. |
| GSAP | @react-spring/three | Spring physics overkill; adds 30KB+; animated wrapper causes re-renders. GSAP targets Three.js refs directly. |
| GSAP | useFrame for everything | useFrame is right for per-frame micro-updates but can't sequence camera fly-throughs with pause/advance semantics. |
| deck.gl react | Deeper integration | The project uses react-map-gl, not @deck.gl/react. MapboxOverlay via useControl is the correct integration pattern. |

**Installation:**
```bash
pnpm add deck.gl@^9.3.2 @deck.gl/aggregation-layers@^9.3.2 @deck.gl/mapbox@^9.3.2
pnpm add gsap@^3.15.0
# No @deck.gl/react — use MapboxOverlay with react-map-gl useControl
```

## Architecture Patterns

### Pattern 1: KDE Worker Offload (FND-05)

**What:** Move `computeSliceKde()` from main-thread `useMemo` in `Demo3dSpatialView.tsx` to a new Web Worker using the existing zero-copy transferable buffer pattern from `adaptiveTime.worker.ts`.

**Target files to change:**
- **NEW:** `src/workers/kdeSlice.worker.ts` — Worker that receives point arrays, computes KDE, returns cells
- **MODIFY:** `src/components/dashboard-demo/Demo3dSpatialView.tsx` — Replace synchronous `useMemo(sliceKdes)` with worker dispatch
- **NO CHANGE:** `src/lib/kde/compute-slice-kde.ts` — Pure function, stays as-is, imported by worker

**Worker input/output contract:**
```typescript
// Input
interface KdeWorkerInput {
  requestId: number;
  sliceIndex: number;
  points: { x: number; z: number }[];
  params?: Partial<KdeParams>;
}

// Output (transferable Float32Array.buffer)
interface KdeWorkerOutput {
  requestId: number;
  sliceIndex: number;
  cells: { x: number; z: number; intensity: number; support: number }[];
  maxIntensity: number;
}
```

**Worker implementation strategy:**
- Single worker instance (not pool — sequential slice KD is naturally ordered)
- Use `postMessage(data, [buffer])` with transferable ownership only when shipping `Float32Array` point coordinates
- KDE cell output is small (32×32 grid = max 1024 cells per slice), so copy is fine
- Follow the `adaptiveTime.worker.ts` structure: `self.onmessage` handler, self-contained computation

**Integration in Demo3dSpatialView:**
```typescript
// Replace the useMemo sliceKdes block (lines 161-188) with:
const workerRef = useRef<Worker | null>(null);
const [sliceKdes, setSliceKdes] = useState<KdeCell[][]>([]);
const [kdeComputing, setKdeComputing] = useState(false);

useEffect(() => {
  if (crimesBySlice.length === 0) return;
  
  // Lazily create worker
  if (!workerRef.current) {
    workerRef.current = new Worker(
      new URL('@/workers/kdeSlice.worker.ts', import.meta.url)
    );
  }

  setKdeComputing(true);
  let completed = 0;
  const results: (KdeCell[] | undefined)[] = new Array(crimesBySlice.length);

  workerRef.current.onmessage = (e: MessageEvent<KdeWorkerOutput>) => {
    const { sliceIndex, cells } = e.data;
    results[sliceIndex] = cells;
    completed += 1;

    if (completed === crimesBySlice.length) {
      setSliceKdes(results.map(r => r ?? []));
      setKdeComputing(false);
    }
  };

  // Submit all slices in batch
  crimesBySlice.forEach((sliceCrimes, i) => {
    const pts = sliceCrimes.map(c => ({ x: c.x, z: c.z }));
    workerRef.current!.postMessage({
      requestId: i,
      sliceIndex: i,
      points: pts,
    });
  });

  return () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };
}, [crimesBySlice]);
```

### Pattern 2: Shader Caching Fix (FND-06)

**What:** Replace `onBeforeCompile` template literals in `ghosting.ts` with static shader source (hardcoded `36` constants) and add `material.customProgramCacheKey()`.

**Target files to change:**
- **MODIFY:** `src/components/viz/shaders/ghosting.ts` — Replace template literal `${typeMapSize}` / `${districtMapSize}` with literal `36`
- **MODIFY:** `src/components/viz/DataPoints.tsx` — Add `material.customProgramCacheKey()` in `onBeforeCompile`; consolidate 10+ `useEffect` hooks

**Root cause analysis:**
- `applyGhostingShader()` receives `typeMapSize: TYPE_MAP_SIZE` and `districtMapSize: DISTRICT_MAP_SIZE` — both are constants (36)
- These are injected into fragment shader via template literals: `uniform float uTypeMap[${typeMapSize}]`
- Even though the values never change at runtime, the `onBeforeCompile` pattern invalidates the WebGL program cache because Three.js can't know the source didn't change
- **Fix:** Hardcode `36` in the shader source string. No template literals anywhere in shader source.

**Specific changes to ghosting.ts:**
```typescript
// BEFORE (fragile — triggers recompilation):
shader.fragmentShader = shader.fragmentShader.replace(
  '#include <common>',
  `
  #include <common>
  uniform float uTypeMap[${typeMapSize}];
  uniform float uDistrictMap[${districtMapSize}];
  // ...
  `
);

// AFTER (stable — no template literals, never recompiles):
shader.fragmentShader = shader.fragmentShader.replace(
  '#include <common>',
  `
  #include <common>
  uniform float uTypeMap[36];
  uniform float uDistrictMap[36];
  // ...
  `
);
```

**Add customProgramCacheKey in DataPoints.tsx:**
```typescript
const onBeforeCompile = (shader: any) => {
  if (meshRef.current) {
    const material = meshRef.current.material as THREE.Material;
    material.userData.shader = shader;
    // Stable cache key — only recompile if shader source changes
    material.customProgramCacheKey = () => 'ghosting-v2';
  }
  applyGhostingShader(shader, { useColumns: Boolean(columns), typeMapSize: 36, districtMapSize: 36 });
};
```

**Consolidate 10+ useEffect hooks into useFrame:**
- Move all uniform updates from individual `useEffect` blocks (lines 201-367 of DataPoints.tsx) into the existing `useFrame` (line 370)
- Read all store values via `store.getState()` at frame start for a consistent snapshot
- This eliminates React re-render overhead for uniform-only changes

### Pattern 3: Frustum Culling + LOD (FND-07)

**What:** Remove `frustumCulled={false}` from all instanced geometry, verify scene bounds support culling, add distance-based geometry LOD.

**Target files to change (7 files with frustumCulled={false}):**

| File | Component | Geometry Type | Instance Count | Action |
|------|-----------|---------------|----------------|--------|
| `src/components/viz/DataPoints.tsx:648` | DataPoints | InstancedMesh spheres | 8.5M | REMOVE frustumCulled={false} — scene bounds [-50,50] fit camera frustum |
| `src/app/stkde-3d/components/Stkde3DScene.tsx:127` | RawEventPoints | Points | Variable | REMOVE — scene camera positioned at [105,175,105] looking at [0,0,0] covers bounds |
| `src/components/viz/SimpleCrimePoints.tsx:143` | SimpleCrimePoints | Points | Variable | REMOVE — same scene as DataPoints |
| `src/components/viz/SimpleCrimePoints.tsx:448` | SimpleCrimePoints | Points (2nd instance) | Variable | REMOVE |
| `src/app/timeline-test-3d/components/TimelineTest3DPoints.tsx:184` | TimelineTest3DPoints | Points | Variable | REMOVE — separate scene, verify camera covers bounds |
| `src/components/viz/AggregatedBars.tsx:111` | AggregatedBars | InstancedMesh bars | Variable | REMOVE — bars are in same scene bounds |

**Verification steps for each removal:**
1. Camera must have `fov` reasonable (38 in Stkde3DScene, check others)
2. Camera distance must be ≥ 30 (both Stkde3DScene and MainScene satisfy this)
3. Scene bounds [-50, 50] must be within camera frustum — verify in dev after removal

**LOD strategy for DataPoints (8.5M instances):**
- **Distance threshold:** When camera is beyond 80 world-units from a point, switch from sphere geometry (24 vertices) to simple points (1 vertex)
- **Implementation:** Add a second `THREE.Points` material rendered at far distance alongside the InstancedMesh
- **Alternatively (simpler, recommended):** Use the existing `uLodFactor` (already passed to shader) to control `gl_PointSize` and fragment discard. Add a second R3F `<Points>` component rendered only when zoomed out, controlled by `useFrame` distance check.
- **Priority:** Frustum culling removal first (zero-cost gain), then LOD as Phase 76 optional stretch.

### Pattern 4: Motion Scaffolding Primitives (FND-01)

**What:** Three shared motion primitives for the 3D widget path only, built as pure-function utilities + GSAP-driven camera transitions.

**File locations (all NEW):**
- `src/lib/motion/easing.ts` — Easing functions and lerp primitives
- `src/lib/motion/aging.ts` — Aging/opacity trail calculation utilities
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — Transition orchestration trigger (MODIFY)
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — GSAP camera fly-through integration (MODIFY)
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — Per-slice opacity aging integration (MODIFY)

**Primitive 1: Interpolation Pipeline (easing.ts)**

Pure helper functions for smooth slice-to-slice transitions:
```typescript
// src/lib/motion/easing.ts

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Easing functions for slice transitions */
export const Easing = {
  /** Analytical state changes — quick start, slow finish */
  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  },
  /** Camera/orientation transitions — smooth throughout */
  easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  /** Quick transitions for active slice emphasis */
  power2InOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
};

/** Interpolate between two arrays of KdeCell using CPU lerp */
export function interpolateKdeCells(
  from: KdeCell[],
  to: KdeCell[],
  t: number,
  threshold = 0.005
): KdeCell[] {
  // Build lookup map for 'to' cells
  const toMap = new Map<string, KdeCell>();
  for (const cell of to) {
    toMap.set(`${cell.x}_${cell.z}`, cell);
  }

  return from
    .map((fromCell): KdeCell => {
      const toCell = toMap.get(`${fromCell.x}_${fromCell.z}`);
      const intensity = toCell
        ? lerp(fromCell.intensity, toCell.intensity, t)
        : fromCell.intensity * (1 - t);
      return { ...fromCell, intensity: Number(intensity.toFixed(4)) };
    })
    .filter((cell) => cell.intensity > threshold);
}
```

**Primitive 2: Aging/Opacity Trails (aging.ts)**

Calculate per-slice opacity based on temporal distance from active:
```typescript
// src/lib/motion/aging.ts

/** Aging configuration — controls how non-active slices fade */
export interface AgingConfig {
  /** Max opacity drop-off per step away from active slice */
  decayPerStep: number; // default: 0.35
  /** Minimum opacity for visible but distant slices */
  floorOpacity: number; // default: 0.05
  /** Number of adjacent slices that get "near" treatment */
  adjacentRadius: number; // default: 1
}

export const DEFAULT_AGING_CONFIG: AgingConfig = {
  decayPerStep: 0.35,
  floorOpacity: 0.05,
  adjacentRadius: 1,
};

/** Calculate a slice's opacity multiplier based on distance from active */
export function agingOpacity(
  sliceIndex: number,
  activeIndex: number,
  config: AgingConfig = DEFAULT_AGING_CONFIG
): number {
  const distance = Math.abs(sliceIndex - activeIndex);

  if (distance === 0) return 1;
  if (distance <= config.adjacentRadius) return config.decayPerStep;
  if (distance === 2) return 0.1;

  // Exponential decay for distant slices
  const decayed = config.decayPerStep * Math.pow(0.3, distance - 1);
  return Math.max(config.floorOpacity, decayed);
}

/** Calculate aging trail intensity for accumulated frame blending */
export function trailIntensity(
  frameAge: number, // how many frames ago
  maxTrailLength: number = 8,
  decayRate: number = 0.15
): number {
  if (frameAge >= maxTrailLength) return 0;
  return Math.exp(-decayRate * frameAge);
}
```

**Primitive 3: GSAP Camera Fly-Throughs (in Stkde3DScene.tsx)**

GSAP sequences camera between slices:
```typescript
// In Stkde3DScene.tsx, use GSAP to fly camera to active slice:
import gsap from 'gsap';

function flyToSlice(
  controlsRef: React.RefObject<CameraControls>,
  targetY: number, // yForIndex(activeIndex)
) {
  const controls = controlsRef.current;
  if (!controls) return;

  // Current camera position
  const camPos = controls.camera.position.clone();
  const target = new THREE.Vector3(0, targetY, 0);

  gsap.to(camPos, {
    y: targetY + 175, // Maintain overview height offset
    duration: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => {
      controls.setLookAt(
        camPos.x,
        camPos.y,
        camPos.z,
        target.x,
        target.y,
        target.z,
        false
      );
    },
  });
}
```

### Pattern 5: Store Consolidation (FND-04)

**Analysis of dashboard-demo store ecosystem:**

| Store | State Count | Drift Risk | Consolidation Decision |
|-------|-------------|------------|----------------------|
| `useDashboardDemoCoordinationStore` | 22 fields, 22 actions | None (central) | KEEP — single source of truth |
| `useDashboardDemoTimeslicingModeStore` | 14 fields, 15 actions | Low | KEEP — distinct domain (slice generation pipeline); rarely read by views |
| `useDashboardDemoAnalysisStore` | 11 fields, 11 actions | MEDIUM | **MERGE INTO COORDINATION** — STKDE params/responses are coordination-level concern |
| `useDashboardDemoAdaptiveStore` | 1 field, 2 actions | LOW | **MERGE INTO COORDINATION** — trivial store (single burstThreshold value) |
| `useDashboardDemoWarpStore` | 8 fields, 7 actions | HIGH | **MERGE INTO COORDINATION** — warp state directly affects 3D rendering pipeline |
| `useDashboardDemoFilterStore` | 10 fields, 18 actions | Low | KEEP — distinct filter domain; presets persist; clean separation |
| `useDashboardDemoMapLayerStore` | 2 fields, 3 actions | Low | KEEP — persisted layer visibility; UI concern, not data concern |
| `useDashboardDemoTimeStore` | — | Low | KEEP — time orchestration; separate domain |
| `useSliceDomainStore` | — | None | KEEP — core domain model shared with non-demo routes |

**Consolidation plan — merge 3 stores into CoordinationStore:**

1. **useDashboardDemoAdaptiveStore → CoordinationStore** (trivial)
   - Merge `burstThreshold` field with `setBurstThreshold`, `resetBurstThreshold`

2. **useDashboardDemoWarpStore → CoordinationStore** (moderate)
   - Merge: `timeScaleMode`, `warpSource`, `warpFactor`, `densityMap`, `warpMap`, `mapDomain`, `isComputing`
   - Merge: `setTimeScaleMode`, `setWarpSource`, `setWarpFactor`, `setPrecomputedMaps`, `setIsComputing`, `resetWarp`
   - Keep the warp domain operations as state + setters (no business logic in store)

3. **useDashboardDemoAnalysisStore → CoordinationStore** (moderate)
   - Merge: `stkdeScopeMode`, `stkdeParams`, `selectedHotspotId`, `hoveredHotspotId`, `stkdeResponse`, `spatialFilter`, `temporalFilter`
   - Actions: `setStkdeScopeMode`, `setStkdeParams`, `setSelectedHotspot`, `setHoveredHotspot`, `setStkdeResponse`, `setSpatialFilter`, `setTemporalFilter`, `resetAnalysis`
   - Keep `selectedDistricts` and `timeRange` — these are analysis-level filters distinct from map-level filters

**Final store count after consolidation:**
- `useDashboardDemoCoordinationStore` — 22 + 1 + 8 + 11 = ~42 fields (central hub)
- `useDashboardDemoTimeslicingModeStore` — unchanged
- `useDashboardDemoFilterStore` — unchanged
- `useDashboardDemoMapLayerStore` — unchanged
- `useDashboardDemoTimeStore` — unchanged
- `useSliceDomainStore` — unchanged

**Migration strategy:**
1. Copy state + actions into CoordinationStore first
2. Update all imports across the codebase (grep for old store imports)
3. Delete old store files after verification
4. Update test files to reference CoordinationStore

**Files importing the drift-prone stores (grep targets):**

Files importing `useDashboardDemoAnalysisStore`:
- `DemoMapVisualization.tsx`
- `DemoStkdePanel.tsx`
- `DemoConfigurePanel.tsx`

Files importing `useDashboardDemoAdaptiveStore`:
- `DemoMapVisualization.tsx`
- `DemoDetectPanel.tsx`
- MainScene.tsx (may use base adaptive store instead)

Files importing `useDashboardDemoWarpStore`:
- `DemoTimeslicingModeStore` (via `useDashboardDemoWarpStore.getState()`)
- `DemoDetectPanel.tsx`
- `DemoConfigurePanel.tsx`

### Pattern 6: deck.gl Map Heatmap Integration (FND-02)

**Integration point:** `DemoMapVisualization.tsx` → `MapVisualization.tsx` (MapLibre GL)

**Approach:** Use `MapboxOverlay` via `react-map-gl`'s `useControl` hook. The `MapboxOverlay` renders deck.gl layers interleaved with MapLibre's map layers.

**Target files to change:**
- **MODIFY:** `src/components/dashboard-demo/DemoMapVisualization.tsx` — Add deck.gl HeatmapLayer with MapboxOverlay
- **POSSIBLY MODIFY:** `src/components/map/MapVisualization.tsx` — Accept `deckOverlay` prop for injection
- **NEW:** `src/components/map/DeckGlHeatmapOverlay.tsx` — Encapsulated deck.gl heatmap component

**Integration pattern (simplest approach — insert in DemoMapVisualization):**
```tsx
// src/components/map/DeckGlHeatmapOverlay.tsx
'use client';

import { useMemo } from 'react';
import { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { MapboxOverlayProps } from '@deck.gl/mapbox';

interface DeckGlHeatmapProps {
  data: Array<{ position: [number, number]; weight: number }>;
  visible: boolean;
  radiusPixels?: number;
  intensity?: number;
  threshold?: number;
}

function DeckGlOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

export function DeckGlHeatmapOverlay({
  data,
  visible,
  radiusPixels = 30,
  intensity = 1,
  threshold = 0.05,
}: DeckGlHeatmapProps) {
  const layers = useMemo(() => {
    if (!visible || data.length === 0) return [];
    return [
      new HeatmapLayer({
        id: 'deck-gl-crime-density',
        data,
        getPosition: (d) => d.position,
        getWeight: (d) => d.weight,
        aggregation: 'SUM',
        radiusPixels,
        intensity,
        threshold,
        colorRange: [
          [34, 76, 255],
          [0, 212, 255],
          [42, 255, 163],
          [255, 214, 64],
          [255, 122, 42],
          [255, 64, 96],
        ],
      }),
    ];
  }, [data, visible, radiusPixels, intensity, threshold]);

  return <DeckGlOverlay layers={layers} interleaved />;
}
```

**Data flow for heatmap:**
```
DuckDB → /api/crimes/range → CrimeRecord[]
  → map to [{ position: [lng, lat], weight: 1 }]
  → DeckGlHeatmapOverlay data prop
  → HeatmapLayer GPU KDE → interleaved rendering via MapboxOverlay
```

**Deck.gl + MapLibre compatibility note:**
- `@deck.gl/mapbox` v9 is compatible with maplibre-gl (the project uses maplibre-gl@5.17)
- MapboxOverlay's `useControl` integration requires `react-map-gl/maplibre` (already installed)
- No Mapbox access token needed — using Carto dark-matter basemap

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPU heatmap density on map | Custom WebGL density renderer | deck.gl HeatmapLayer with MapboxOverlay | HeatmapLayer handles GPU Gaussian KDE, aggregation, color ramps — reinventing would be ~500+ lines of fragile WebGL |
| Camera fly-through sequencing | useFrame with manual state machine | GSAP timeline | Sequencing with pause/advance/reverse is a solved problem; manual state machines are error-prone |
| KDE computation | Main thread computation | Web Worker with transferable Float32Array | Blocking main thread on 8.5M records causes 100-500ms UI freezes; the existing adaptiveTime.worker.ts pattern proves this |
| Shader variant management | Dynamic onBeforeCompile with template literals | Static shader source + uniforms | Template literals in shader source invalidate WebGL program cache on every call; Three.js ShaderMaterial with uniforms is the stable pattern |
| Lerp/easing for slice transitions | Custom animation helpers with requestAnimationFrame | Pure math functions + useFrame | Simple lerp/easing functions don't need a framework; they're 5-line pure functions |

**Key insight:** The existing codebase already has the right patterns hidden — `adaptiveTime.worker.ts` shows the transferable buffer approach, `useFrame` in DataPoints shows frame-synchronous store reads. The task is to apply these patterns to the dashboard-demo path, not invent new ones.

## Common Pitfalls

### Pitfall 1: KDE Worker Transfer Missed

**What goes wrong:** `postMessage({ cells })` copies the full KDE result array instead of transferring Float32Array buffers.
**Why it happens:** KDE cells are objects (`{ x, z, intensity, support }`), not flat arrays. The worker output format differs from the raw computation format.
**How to avoid:** Serialize cells to a flat `Float32Array` (4 floats per cell: x, z, intensity, support) and transfer the `.buffer`. Deserialize back on the main thread.
**Warning signs:** Large arrays being copied between threads (visible in Chrome DevTools Memory timeline).

### Pitfall 2: Frustum Culling Fail on Re-enabled Geometry

**What goes wrong:** After removing `frustumCulled={false}`, points disappear unexpectedly at certain camera angles.
**Why it happens:** The scene bounds may be larger than the camera frustum. The BoundingSphere computed by Three.js from the instanced geometry may not cover all instances.
**How to avoid:** After changing to `frustumCulled={true}`, explicitly compute bounding sphere: `meshRef.current.computeBoundingSphere()`. Verify the camera frustum covers the full [-50, 50] scene volume at all allowed positions.
**Warning signs:** Points vanishing when camera rotates past ~60° from default position.

### Pitfall 3: Shader Still Recompiling After Template Removal

**What goes wrong:** Even after removing template literals from shader source, recompilation still occurs on uniform changes.
**Why it happens:** `onBeforeCompile` is called every time the material is re-evaluated (not just when the program changes). Three.js may trigger it during certain state changes.
**How to avoid:** Add `material.customProgramCacheKey = () => 'ghosting-stable-v1'`. This tells Three.js the shader program is identical across all instances and should be cached.
**Warning signs:** Chrome DevTools Performance tab still showing "Compile Shader" events after the fix.

### Pitfall 4: GSAP Targeting CameraControls Ref Incorrectly

**What goes wrong:** GSAP tweens CameraControls ref but camera doesn't move smoothly.
**Why it happens:** CameraControls manages its own internal animation loop. GSAP setting `.position` directly may conflict with CameraControls' internal state.
**How to avoid:** Use the pattern from STACK.md research: animate a proxy `Vector3`, call `controls.setLookAt()` in `onUpdate`. Do NOT use GSAP's `gsap.to(controlsRef.current, ...)` directly on the controls object.
**Warning signs:** Camera jumps to final position instead of smooth interpolation; CameraControls internal state drifts from GSAP-driven position.

### Pitfall 5: Store Consolidation Breaking Reactive Subscriptions

**What goes wrong:** After merging stores, components lose reactivity because they subscribed to the old store key.
**Why it happens:** Zustand subscriptions are store-specific. Merging `useDashboardDemoAdaptiveStore` into `useDashboardDemoCoordinationStore` means components that did `useDashboardDemoAdaptiveStore(s => s.burstThreshold)` must change to `useDashboardDemoCoordinationStore(s => s.burstThreshold)`.
**How to avoid:** Use multi-file grep for old store imports before deletion. Update all references atomically. Run full typecheck after consolidation.
**Warning signs:** Components not re-rendering on value changes; stale values in `useFrame`.

## Code Examples

### Deck.gl HeatmapLayer + MapboxOverlay (Context7 Verified)

```tsx
// Source: deck.gl docs /visgl/deck.gl — MapboxOverlay with react-map-gl
// Verified via Context7 2026-05-26

import { useMemo } from 'react';
import { Map, useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

// Inside MapVisualization component:
const heatmapData = useMemo(() => 
  crimePoints.map(p => ({
    position: [p.lng, p.lat] as [number, number],
    weight: p.count ?? 1,
  })),
  [crimePoints]
);

<Map mapLib={maplibregl} ...>
  {heatmapVisible && (
    <DeckOverlay
      interleaved
      layers={[
        new HeatmapLayer({
          id: 'crime-density',
          data: heatmapData,
          getPosition: d => d.position,
          getWeight: d => d.weight,
          aggregation: 'SUM',
          radiusPixels: 30,
          intensity: 1,
          threshold: 0.05,
        }),
      ]}
    />
  )}
</Map>
```

### GSAP Camera Fly-Through (Context7 Verified)

```typescript
// Source: GSAP core docs /greensock/gsap-skills — timeline sequencing
// Adapted for Three.js CameraControls pattern

import gsap from 'gsap';
import * as THREE from 'three';
import type CameraControls from 'camera-controls';

function animateSliceTransition(
  controls: CameraControls,
  fromY: number,
  toY: number,
  duration = 0.6
): gsap.core.Timeline {
  const proxy = { y: fromY };
  const camPos = controls.camera.position.clone();
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
  });

  tl.to(proxy, {
    y: toY + 175, // maintain overview height
    duration,
    onUpdate: () => {
      controls.setLookAt(
        camPos.x,
        proxy.y,
        camPos.z,
        0, // target.x
        toY, // target.y — center on destination slice
        0, // target.z
        false,
      );
    },
  });

  return tl;
}

// Usage:
useEffect(() => {
  if (!controlsRef.current) return;
  flyToSlice(controlsRef.current, targetY);
}, [activeSliceIndex]);
```

### Worker with Transferable Buffer Pattern

```typescript
// Source: Existing adaptiveTime.worker.ts pattern + MDN Transferable docs
// Verified pattern from codebase + Context7

// Worker (kdeSlice.worker.ts):
self.onmessage = (e: MessageEvent<KdeWorkerInput>) => {
  const { requestId, sliceIndex, points, params } = e.data;
  const result = computeSliceKde(points, params);

  // Serialize cells to flat Float32Array for transfer
  const flat = new Float32Array(result.cells.length * 4);
  result.cells.forEach((cell, i) => {
    flat[i * 4] = cell.x;
    flat[i * 4 + 1] = cell.z;
    flat[i * 4 + 2] = cell.intensity;
    flat[i * 4 + 3] = cell.support;
  });

  // Transfer ownership — zero copy
  self.postMessage(
    {
      requestId,
      sliceIndex,
      cellsBuffer: flat.buffer,
      cellCount: result.cells.length,
      maxIntensity: result.maxIntensity,
    },
    [flat.buffer] // transferable
  );
};

// Main thread (deserialize):
worker.onmessage = (e: MessageEvent) => {
  const { sliceIndex, cellsBuffer, cellCount, maxIntensity } = e.data;
  const flat = new Float32Array(cellsBuffer);

  const cells: KdeCell[] = [];
  for (let i = 0; i < cellCount; i++) {
    cells.push({
      x: flat[i * 4],
      z: flat[i * 4 + 1],
      intensity: flat[i * 4 + 2],
      support: Math.round(flat[i * 4 + 3]),
    });
  }

  results[sliceIndex] = cells;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas2D CPU textures for KDE heatmap | ShaderMaterial GPU rendering (Phases 78-79, not 76) | Phase 78 | Phase 76 preps foundation by fixing shader caching and creating motion scaffolding |
| `frustumCulled={false}` everywhere | Frustum culling enabled | Phase 76 | Reduces per-frame GPU vertex processing from 204M vertices to ~50M (75% reduction at zoomed-in views) |
| `onBeforeCompile` with template literals | Static shader source + customProgramCacheKey | Phase 76 | Eliminates 100-500ms recompilation stalls during filter changes |
| KDE on main thread | Web Worker with transferable buffers | Phase 76 | Moves 2-5ms per slice off main thread; 8 slices = 16-40ms freed |
| 3 drift-prone stores | Single CoordinationStore | Phase 76 | Eliminates cross-store synchronization deadlock (Pitfall 8) |
| MapLibre CPU heatmap | deck.gl GPU HeatmapLayer | Phase 76 | GPU KDE density rendering; compatible with 8.5M point dataset |

**Deprecated/outdated:**
- **Canvas2D texture generation** (`StkdeSliceStack.buildHeatmapTexture`): CPU bottleneck, to be replaced in Phase 78 with ShaderMaterial. Phase 76 doesn't replace it but adds performance headroom (KDE worker + frustum culling) for the shader migration.
- **`onBeforeCompile` template literals**: This pattern is fragile and incompatible with stable WebGL program caching. Replace across all shader files.
- **Separate store overrides pattern** (`filterStoreOverride`, `adaptiveStoreOverride`, etc.): Consolidation in Phase 76 eliminates the need for 5+ store override props.

## Open Questions

1. **deck.gl version compatibility with maplibre-gl 5.17**
   - What we know: @deck.gl/mapbox@9.x officially supports mapbox-gl, but community reports confirm it works with maplibre-gl (same GL context API). The existing `react-map-gl/maplibre` already handles this bridge.
   - What's unclear: Whether @deck.gl/mapbox@9.3.2 has any breaking changes that require maplibre-gl@5.x-specific overrides.
   - Recommendation: Install and verify. If issues arise, pin @deck.gl/mapbox to the last known-compatible version. Fallback: use MapLibre's built-in heatmap (still CPU-bound but functional).

2. **Frustum culling safety for AggregatedBars (custom geometry)**
   - What we know: `AggregatedBars.tsx` uses custom InstancedMesh geometry for bar chart visualizations. Removing `frustumCulled={false}` may cause bars at scene edges to disappear.
   - What's unclear: Whether the computed bounding sphere covers all bar instances or only the first.
   - Recommendation: After removal, verify by rotating camera to extremes. If bars vanish unexpectedly, compute bounding sphere explicitly: `meshRef.current.computeBoundingSphere()` after all `setMatrixAt` calls.

3. **GSAP tree-shaking in Next.js build**
   - What we know: GSAP core (~12KB gzip) should tree-shake well. The project uses Next.js with webpack (no turbopack for builds).
   - What's unclear: Whether importing specific GSAP utilities (e.g., `gsap/core`) instead of the full `gsap` package provides meaningful savings.
   - Recommendation: Import from `gsap` directly (standard approach). If bundle analysis shows >15KB for GSAP, investigate selective imports.

## Sources

### Primary (HIGH confidence — Context7 verified)
- `/visgl/deck.gl` — MapboxOverlay API, HeatmapLayer GPU aggregation, react-map-gl integration, interleaved rendering mode
- `/greensock/gsap-skills` — GSAP timeline sequencing, gsap.to() API, useGSAP React hook, framework-agnostic targeting
- `/pmndrs/drei` — CameraControls API (already in codebase): setLookAt, smoothTime, minDistance/maxDistance
- `/pmndrs/react-three-fiber` — useFrame, Canvas gl config, ShaderMaterial pattern, frustumCulled property

### Primary (Codebase verified)
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — Lines 161-188: KDE on main thread; Lines 68-97: orderedSlices ordering
- `src/app/stkde-3d/components/Stkde3DScene.tsx` — Lines 127-128: frustumCulled={false} on RawEventPoints; Lines 152-160: CameraControls setup
- `src/app/stkde-3d/components/StkdeSliceStack.tsx` — Full Canvas2D texture pipeline; aging opacity logic (lines 139-148)
- `src/components/viz/DataPoints.tsx` — Lines 499-509: onBeforeCompile template literals; Line 648: frustumCulled={false}; Lines 370-428: useFrame pattern
- `src/components/viz/shaders/ghosting.ts` — Template literal `${typeMapSize}` at lines 148-149, 203-204
- `src/workers/adaptiveTime.worker.ts` — Transferable buffer pattern reference
- `src/lib/kde/compute-slice-kde.ts` — KDE algorithm: 32×32 grid, Gaussian kernel, threshold filtering
- `src/store/useDashboardDemoCoordinationStore.ts` — 22-field central store (consolidation target)
- `src/store/useDashboardDemoAdaptiveStore.ts` — Trivial 1-field store (merge target, 13 lines)
- `src/store/useDashboardDemoWarpStore.ts` — 8-field warp store (merge target, 47 lines)
- `src/store/useDashboardDemoAnalysisStore.ts` — 11-field analysis store (merge target, 155 lines)
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — 14-field generation store (keep, 544 lines)
- `src/store/useDashboardDemoFilterStore.ts` — 10-field filter store with presets (keep, 219 lines)

### Secondary (MEDIUM confidence — WebSearch verified with official docs)
- deck.gl documentation (deck.gl/docs) — GPU aggregation best practices for HeatmapLayer
- GSAP documentation (gsap.com/docs/v3) — npm install, timeline/tween API reference
- MDN Web Workers API — Transferable objects, postMessage with transfer list

### Tertiary (LOW confidence — planning assumptions)
- Estimated GPU savings from frustum culling: ~75% vertex reduction based on typical camera frustum coverage of [-50, 50] scene
- Estimated main thread savings from KDE worker: 16-40ms per full render (2-5ms per slice × 8 slices)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — deck.gl@9.3.2 and GSAP@3.15.0 versions verified via Context7; existing stack versions confirmed in package.json
- Architecture: HIGH — All target files read and analyzed; integration points verified against existing patterns
- Store consolidation: HIGH — All 8 dashboard-demo stores fully read and analyzed; dependency chains traced
- Pitfalls: HIGH — Based on existing PITFALLS.md research + codebase analysis of current anti-patterns
- Performance estimates: MEDIUM — Based on code analysis, not measured; actual savings depend on dataset size and camera position

**Research date:** 2026-05-26
**Valid until:** 2026-07-26 (60 days — deck.gl and GSAP are stable ecosystems; Three.js/R3F versions update more frequently but the project pins specific versions)

---

*Research for: Phase 76 — Foundation Cleanup + Motion Scaffolding*
*Prepared for: Phase 76 planning*
