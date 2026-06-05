# 3D Scene Composition

**Analysis Date:** 2026-06-01

## Overview

There are two independent 3D scene entry paths in the codebase:

### Path A: Main Cube (Dashboard, Cube Sandbox)

```
Page (dashboard, dashboard-v2, cube-sandbox)
  → CubeVisualization (UI shell, overlays, store orchestration)
    → MainScene (R3F children assembly, store overrides, map control)
      → Scene (R3F Canvas wrapper)
        → R3F children (Three.js objects via React Three Fiber)
```

### Path B: Demo 3D STKDE Widget (Dashboard Demo)

```
DashboardDemoShell
  → Demo3dSpatialView (slice orchestration, crime fetching, KDE computation)
    → Stkde3DScene (R3F Canvas + MapTileSource + camera)
      → StkdeSliceStack (depth-aware slice rendering with ShaderMaterial)
      → SliceScrubber (playback UI — not R3F, HTML overlay)
```

---

## Path A: Main Cube Render Tree

### Page → CubeVisualization

**Pages that mount `CubeVisualization`:**

| Page | Usage |
|------|-------|
| `src/app/dashboard/page.tsx` | `<CubeVisualization />` — no overrides |
| `src/app/dashboard-v2/page.tsx` | `<CubeVisualization />` — no overrides |
| `src/app/cube-sandbox/components/SandboxShell.tsx` | `<CubeVisualization />` — no overrides |

**DashboardDemoShell no longer uses CubeVisualization.** As of Phase 76, the demo shell renders `Demo3dSpatialView` directly (see Path B).

---

### CubeVisualization

**File:** `src/components/viz/CubeVisualization.tsx` (225 lines)

**Purpose:**
Full-page shell that wraps `MainScene` and renders all HUD/status overlays outside the R3F canvas.

**Props:**
```typescript
interface CubeVisualizationProps {
  selectionStory?: DashboardDemoSelectionStory | null;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}
```

**Stores Consumed (via `useStore` pattern with override support):**

| Store | Purpose |
|-------|---------|
| `useUIStore` | `triggerReset`, mode |
| `useTimelineDataStore` | `loadRealData`, `isLoading`, `columns` |
| `useFilterStore` | selectedTypes, selectedDistricts, selectedTimeRange, selectedSpatialBounds |
| `useCubeSpatialConstraintsStore` | constraints, activeConstraintId |
| `useAdaptiveStore` | warpFactor, warpSource, mapDomain |
| `useCoordinationStore` | (read via coordinationStoreOverride in demo) |
| `useIntervalProposalStore` | proposals, selectedProposalId, appliedProposalId, previewProposalId |
| `useWarpProposalStore` | proposals, selectedProposalId, appliedProposalId |
| `useStkdeStore` | response, selectedHotspotId, runMeta |
| `useClusterStore` | clusters, selectedClusterId, hoveredClusterId |
| `useWarpSliceStore` | (read via sliceStoreOverride in demo) |

**Overrides Flow:**
```typescript
const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;
```

Then selectors are called on the resolved store:
```typescript
const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
```

**Overlays Rendered (HTML outside Canvas):**

1. **Top-right Reset Button** — calls `triggerReset()` on UIStore

2. **Adaptive Status Panel** — shows when `mode === 'cube'` (always true):
   - Relational mode + warp factor
   - Active constraint label
   - Linked selection label
   - Proposal story label
   - Comparison cue
   - Applied interval label
   - Slice confidence
   - **Cluster context block** (violet border) — shows when `activeCluster` exists
   - **Selection story block** (cyan border) — shows when `selectionStory` prop is provided

3. **STKDE Relational Context Panel** — shows when `stkdeResponse` exists:
   - Selected hotspot details (intensity score, support count, time window)
   - Run metadata (requested/effective compute mode, truncated, fallback applied)

4. **Filters Badge** — bottom-right, shows active filter counts

5. **SimpleCrimeLegend** — bottom-left

6. **"No slices active" placeholder** — shown when both `slices` and `clusters` are empty

7. **MainScene** — passed with overrides:
```typescript
<MainScene
  showMapBackground={false}
  filterStoreOverride={filterStore}
  coordinationStoreOverride={coordinationStore}
  adaptiveStoreOverride={adaptiveStore}
  timeStoreOverride={timeStore}
  sliceStoreOverride={sliceStore}
/>
```

---

### MainScene

**File:** `src/components/viz/MainScene.tsx` (208 lines)

**Purpose:**
Assembles the R3F children (TimeSlices, overlays, controls) and manages the dual-layer composition of map background + 3D scene. Handles the `densityScope` computation effects for viewport/global modes.

**Props:**
```typescript
interface MainSceneProps {
  showMapBackground?: boolean;  // default: true
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}
```

**Layout Structure:**
```
<div className="relative h-full w-full">
  {mode === 'map' && showMapBackground && (
    <div className="absolute inset-0 z-0">
      <MapBase />          ← Map layer (z-0)
    </div>
  )}
  <div className="absolute inset-0 z-10 pointer-events-none">
    <div className="h-full w-full pointer-events-auto">
      <Scene transparent={mode === 'map'}>   ← Scene layer (z-10)
        <ClusterManager />
        <TimeSlices sliceStoreOverride={sliceStoreOverride} timeStoreOverride={timeStoreOverride} />
        <ClusterHighlights />
        <ClusterLabels />
        <SpatialConstraintOverlay />
        <SelectedWarpSliceOverlay
          adaptiveStoreOverride={adaptiveStoreOverride}
          timeStoreOverride={timeStoreOverride}
          sliceStoreOverride={sliceStoreOverride}
        />
        <CameraControls ... />
      </Scene>
    </div>
  </div>
</div>
```

**Note:** `TimeSlices` IS included in `MainScene` (contradicts earlier analysis that said it wasn't — it has been present since at least Phase 76).

**Override Propagation:**
| Prop | Passed To |
|------|-----------|
| `adaptiveStoreOverride` | `SelectedWarpSliceOverlay` |
| `timeStoreOverride` | `TimeSlices`, `SelectedWarpSliceOverlay` |
| `sliceStoreOverride` | `TimeSlices`, `SelectedWarpSliceOverlay` |

**Effects:**
1. **`useSelectionSync()`** — coordinates all views (timeline, map, cube)
2. **`densityScope === 'viewport'`** effect: computes relational maps from viewport crime data via `adaptiveStore.getState().computeMaps()`
3. **`densityScope === 'global'`** effect: fetches `/api/adaptive/global?binningMode=X`, falls back to local compute
4. **Camera reset** effect: resets `CameraControls` when `resetVersion` changes

---

### Scene

**File:** `src/components/viz/Scene.tsx` (30 lines)

**Purpose:**
Wraps R3F `Canvas` with theme-aware background/fog and transparent mode support.

**Props:**
```typescript
interface SceneProps {
  children?: ReactNode;
  transparent?: boolean;  // default: false
}
```

**R3F Canvas Configuration:**
```tsx
<Canvas
  gl={{ alpha: true }}
  camera={{ position: [50, 50, 50], fov: 45 }}
>
  {!transparent && <color attach="background" args={[palette.background]} />}
  {!transparent && <fog attach="fog" args={[palette.background, 10, 500]} />}
  {children}
</Canvas>
```

**Transparent Mode:** When `transparent={true}` (i.e., `mode === 'map'`), background color and fog are not attached, allowing the WebGL canvas to render with alpha over the map layer.

**Theme Integration:** Reads `useThemeStore` for the palette. No explicit lighting — relies on R3F defaults.

---

### R3F Children (inside Scene)

**ClusterManager:** `src/components/viz/ClusterManager.tsx` — logic-only, returns null. Debounced clustering via `analyzeClusters` at 400ms. Reads `useClusterStore`, `useFilterStore`, `useTimelineDataStore`, `useTimeStore` directly.

**TimeSlices:** `src/components/viz/TimeSlices.tsx` (159 lines) — manages slice creation via double-click hitbox. Renders `SlicePlane` per slice, `SliceClusterOverlay`, `BurstEvolutionOverlay`, `EvolutionFlowOverlay`. Supports `sliceStoreOverride` and `timeStoreOverride`.

**ClusterHighlights:** `src/components/viz/ClusterHighlights.tsx` (57 lines) — renders wireframe + transparent boxes per cluster. Reads `useClusterStore` directly.

**ClusterLabels:** `src/components/viz/ClusterLabels.tsx` (107 lines) — renders `Html` labels at top of each cluster box. Click sets spatial bounds on `useFilterStore`.

**SpatialConstraintOverlay:** `src/components/viz/SpatialConstraintOverlay.tsx` (80 lines) — renders colored transparent boxes with `Edges` for each enabled constraint. Reads `useCubeSpatialConstraintsStore` directly.

**SelectedWarpSliceOverlay:** `src/components/viz/SelectedWarpSliceOverlay.tsx` (242 lines) — renders transparent box + HTML label for selected slice band. Supports all three override props.

**CameraControls:**
```tsx
<CameraControls
  ref={controlsRef} makeDefault smoothTime={0.25}
  minDistance={1} maxDistance={500} maxPolarAngle={Math.PI / 2}
/>
```

---

## Path B: Demo 3D STKDE Widget

### DashboardDemoShell

**File:** `src/components/dashboard-demo/DashboardDemoShell.tsx` (178 lines)

**Purpose:** Full-page demo shell with tab-based viewport switching (map/3d).

The shell no longer passes store overrides to `CubeVisualization`. Instead, it conditionally renders `DemoMapVisualization` or `Demo3dSpatialView` based on `activeViewport` state:

```typescript
{activeViewport === 'map' ? <DemoMapVisualization /> : <Demo3dSpatialView />}
```

**Stores used directly:**
- `useDashboardDemoFilterStore` — selectedTimeRange, selectedDistricts
- `useTimelineDataStore` — loadSummaryData, minTimestampSec, maxTimestampSec
- `useViewportStore` — setViewport
- `useDashboardDemoCoordinationStore` — setActiveRailTab, brushRange
- `useDashboardDemoTimeslicingModeStore` — lastAppliedAt
- `useSliceDomainStore` — slices (for auto-switch to 3D on apply)

**Auto-switch behavior:** When `appliedSliceCount > 0` and slices have just been applied, the shell automatically switches to 3D viewport and sets rail tab to 'inspect'.

---

### Demo3dSpatialView

**File:** `src/components/dashboard-demo/Demo3dSpatialView.tsx` (323 lines)

**Purpose:** Orchestrates the demo's 3D STKDE widget. Owns slice ordering, crime fetching, KDE computation, and playback stepping.

**Data flow:**
1. Reads `slices` from `useSliceDomainStore`, filters visible range slices, resolves epoch ranges
2. Sorts slices by `startEpoch` (stable sort with tie-breaking)
3. Fetches per-slice crime data from `/api/crimes/range` (sequential fetches with cancellation)
4. Computes per-slice KDE via `kdeSlice.worker.ts`
5. Builds `volumeProfile` via `buildDurationVolumeProfile()` from volume-encoding
6. Manages playback: `setInterval`-based stepping through `activeIndex`, respecting `inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectIsScrubbing`
7. Passes `slices`, `sliceKdes`, `volumeProfile`, `activeIndex`, `viewMode`, `sliceOpacity` to `Stkde3DScene`

**KDE Worker:**
- Created once (singleton via ref), reused across computations
- Worker lifecycle: created on first KDE request, terminated on unmount
- Uses `kdeSlice.worker.ts` which wraps `computeSliceKde` from `src/lib/kde/compute-slice-kde.ts`
- Worker response includes `Float32Array` cells (flat: x, z, intensity, support × N)

---

### Stkde3DScene

**File:** `src/app/stkde-3d/components/Stkde3DScene.tsx` (270 lines)

**Purpose:** Owns the R3F scene setup for the 3D STKDE widget. Sets camera position, `CameraControls`, lighting, map substrate plane, and composes the stack view.

**Props:**
```typescript
interface Stkde3DSceneProps {
  slices: EvolvingSlice[];
  sliceKdes: KdeCell[][];
  volumeProfile?: DurationVolumeProfileEntry[];
  sliceEvents?: MockCrimeEvent[][];
  activeIndex: number;
  viewMode?: 'stack' | 'focus';
  showRawEvents?: boolean;
  sliceOpacity?: number;
}
```

**Lighting (present, unlike MainScene/Scene chain):**
```tsx
<ambientLight intensity={0.4} />
<directionalLight position={[30, 50, 20]} intensity={0.7} />
<directionalLight position={[-30, 30, -20]} intensity={0.3} />
```

**Camera:** Position `[105, 175, 105]`, target `[0, 0, 0]`, FOV 38. `CameraControls` with `smoothTime={0.3}`, `minDistance={30}`, `maxDistance={500}`.

**MapTileSource:** Renders a hidden MapLibre GL map that captures its canvas to an `THREE.CanvasTexture` after loading, then places it as a flat plane at `y = -38`.

**View Modes:**
- `'stack'`: All slices rendered at calculated Y positions
- `'focus'`: Only the active slice is rendered (at index 0)

**RawEventPoints:** Optional overlay of individual crime event points for the active slice.

---

### StkdeSliceStack

**File:** `src/app/stkde-3d/components/StkdeSliceStack.tsx` (485 lines)

**Purpose:** Per-slice rendering of heatmap planes, opacity logic, adjacent-slice emphasis, volume encoding, aging trails, and transition interpolation.

**Key features:**
- **Volume encoding:** Each slice gets thickness, opacity, and falloff from `volumeProfile`
- **Active/adjacent/distant opacity:** Active = 1.0, adjacent = 0.35, distant = 0.1
- **Grid helpers:** Subtle grid lines per slice, opacity varies with activity
- **Active ring:** Double ring geometry at active slice
- **Adjacent ring:** Single faint ring at adjacent slices
- **Aging trails:** Uses `buildAgingOpacityMap` and `computeTrailIntensity` from `src/lib/motion/aging.ts`. Trail entries stored in state history (max 4). Trail opacity decays with `trailDecay` parameter.
- **Interpolation:** When `inspectInterpolation` is enabled during playback, transition textures are computed via `interpolateKdeCells` from `src/lib/motion/easing.ts` and rendered as a floating overlay mesh.
- **HTML labels:** Burst score and crime count shown per slice via `Html` from drei.

**Heatmap texture:** Built on canvas via `buildHeatmapTexture()` — radial gradient per cell with 6-color stop palette.

---

### SliceScrubber

**File:** `src/app/stkde-3d/components/SliceScrubber.tsx` (203 lines)

**Purpose:** Playback controls for the demo 3D STKDE widget. HTML overlay, not R3F.

**Controls:**
- Prev/Next buttons
- Range slider for direct slice index selection
- Play/Pause toggle
- Playback speed slider (0.5x–3x)
- Interpolation toggle (enabled only during playback)
- Trails toggle + decay rate slider
- Active slice info card (label, date range, burst score)

All state is read from `useDashboardDemoCoordinationStore` (inspect* properties).

---

## Data Flow Summary

### Path A (Main Cube)
```
Page
└── CubeVisualization
    ├── Reads: UIStore, TimelineDataStore, FilterStore, CubeSpatialConstraintsStore,
    │         AdaptiveStore, CoordinationStore, IntervalProposalStore,
    │         WarpProposalStore, StkdeStore, ClusterStore, WarpSliceStore
    ├── Overrides resolved via (override ?? default) cast pattern
    ├── Renders HTML overlays (reset button, status panels, filter badge, legend)
    └── MainScene
        ├── useSelectionSync()
        ├── Effects: densityScope viewport/global computation
        ├── MapBase (conditional, z-0)
        └── Scene (transparent=mode==='map')
            └── R3F Children: ClusterManager, TimeSlices, ClusterHighlights,
                ClusterLabels, SpatialConstraintOverlay,
                SelectedWarpSliceOverlay, CameraControls
```

### Path B (Demo 3D STKDE Widget)
```
DashboardDemoShell
├── Map/3D viewport toggle
├── Generate button → triggers timeslicing generation
└── Demo3dSpatialView
    ├── Reads: SliceDomainStore, TimelineDataStore, CoordinationStore
    ├── Fetches per-slice crimes from /api/crimes/range
    ├── Computes KDE via kdeSlice.worker.ts
    ├── Builds volume profile via volume-encoding.ts
    ├── Manages playback stepping via activeIndex
    └── Stkde3DScene
        ├── MapTileSource (hidden MapLibre → CanvasTexture)
        ├── Scene content: ambient + directional lights, CameraControls
        ├── StkdeSliceStack (heatmap textures, volume encoding, aging trails, interpolation)
        └── RawEventPoints (optional)
```

---

## Key Architectural Notes

1. **Two independent 3D systems**: Path A (MainScene/Scene) is the original cube visualization. Path B (Stkde3DScene) is the Phase 75+ 3D STKDE widget. They are NOT composable — different camera setups, different data flows, different component trees.

2. **No store overrides in demo shell anymore**: As of Phase 76, `DashboardDemoShell` no longer passes store overrides. It directly renders `Demo3dSpatialView` which reads from `useDashboardDemoCoordinationStore`.

3. **Deleted stores (Phase 76)**: `useDashboardDemoAdaptiveStore`, `useDashboardDemoWarpStore`, and `useDashboardDemoAnalysisStore` were deleted. Their state was merged into `useDashboardDemoCoordinationStore`.

4. **Lighting**: MainScene/Scene has no explicit lighting (relies on default R3F ambient). Stkde3DScene has explicit ambient + directional lighting.

5. **Camera positioning**: Path A: `[50, 50, 50]` FOV 45. Path B: `[105, 175, 105]` FOV 38.

6. **Motion scaffolding (Phase 76+)**: `src/lib/motion/easing.ts` provides easing functions and KDE cell interpolation. `src/lib/motion/aging.ts` provides trail opacity maps and intensity computation. Used only by `StkdeSliceStack`.

7. **Volume encoding (Phase 77)**: `src/app/stkde-3d/lib/volume-encoding.ts` computes per-slice `thickness`, `opacity`, and `falloff` from duration data. Normalization modes: `'window'` (relative to slice duration range) or `'reference'` (relative to fixed scale).

8. **Playback controls scoped to demo 3D STKDE widget only** (Phase 78): `inspectIsPlaying`, `inspectInterpolation`, `inspectTrailEnabled` properties on `useDashboardDemoCoordinationStore` are consumed only by `Demo3dSpatialView`, `StkdeSliceStack`, and `SliceScrubber`.
