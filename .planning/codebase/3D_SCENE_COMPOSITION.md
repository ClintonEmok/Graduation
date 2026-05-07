# 3D Scene Composition

**Analysis Date:** 2026-05-07

## Overview

The 3D scene is composed via a layered entry-point pattern:

```
Page (dashboard, dashboard-v2, cube-sandbox, dashboard-demo)
  → CubeVisualization (UI shell, overlays, store orchestration)
    → MainScene (R3F children assembly, store overrides, map control)
      → Scene (R3F Canvas wrapper)
        → R3F children (Three.js objects via React Three Fiber)
```

---

## Render Tree

### Page → CubeVisualization

**Pages that mount `CubeVisualization`:**

| Page | Usage |
|------|-------|
| `src/app/dashboard/page.tsx` | `<CubeVisualization />` — no overrides |
| `src/app/dashboard-v2/page.tsx` | `<CubeVisualization />` — no overrides |
| `src/app/cube-sandbox/components/SandboxShell.tsx` | `<CubeVisualization />` — no overrides |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | `<CubeVisualization selectionStory={...} storeOverride={...} />` — full overrides |

### DashboardDemoShell Override Pattern

`DashboardDemoShell` is the primary shell that wires demo-specific stores through the override chain:

```typescript
// src/components/dashboard-demo/DashboardDemoShell.tsx (lines 83–90)
<CubeVisualization
  selectionStory={selectionStory}
  filterStoreOverride={useDashboardDemoFilterStore}
  coordinationStoreOverride={useDashboardDemoCoordinationStore}
  adaptiveStoreOverride={useDashboardDemoAdaptiveStore}
  timeStoreOverride={useDashboardDemoTimeStore}
  sliceStoreOverride={useDashboardDemoSliceStore}
/>
```

`selectionStory` is built by `useDashboardDemoSelectionStory()` in `src/components/dashboard-demo/lib/buildDashboardDemoSelectionStory.ts`, which reads:
- `useDashboardDemoCoordinationStore` — brush range, workflow phase, selected source
- `useDashboardDemoWarpStore` — warp mode, warp source, warp factor
- `useDashboardDemoSliceStore` — active slice ID, slices
- `useTimelineDataStore` — min/max timestamp
- `useDashboardDemoTimeStore` — current time

---

## CubeVisualization

**File:** `src/components/viz/CubeVisualization.tsx` (216 lines)

### Purpose
Full-page shell that wraps `MainScene` and renders all HUD/status overlays outside the R3F canvas.

### Props

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

### Stores Consumed (via `useStore` pattern with override support)

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

### Overrides Flow

```typescript
// Lines 42–46 — override resolution pattern
const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;
```

Then selectors are called on the resolved store:

```typescript
// Lines 48–68 — examples
const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
const warpFactor = useStore(adaptiveStore, (state) => state.warpFactor);
const warpSource = useStore(adaptiveStore, (state) => state.warpSource);
```

### Overlays Rendered (HTML outside Canvas)

1. **Top-right Reset Button** (lines 120–128) — calls `triggerReset()` on UIStore

2. **Adaptive Status Panel** (lines 140–169) — appears when `mode === 'cube'` (always true in CubeVisualization), shows:
   - Relational mode + warp factor
   - Active constraint label
   - Linked selection label
   - Proposal story label
   - Comparison cue
   - Applied interval label
   - Slice confidence (band, qualityState, isEdited)
   - **Cluster context block** (violet border) — shows when `activeCluster` exists
   - **Selection story block** (cyan border) — shows when `selectionStory` prop is provided

3. **STKDE Relational Context Panel** (lines 188–212) — shows when `stkdeResponse` exists:
   - Selected hotspot details (intensity score, support count, time window)
   - Run metadata (requested/ effective compute mode, truncated, fallback applied)

4. **Filters Badge** (lines 175–186) — bottom-right, shows active filter counts

5. **SimpleCrimeLegend** (line 173) — bottom-left

6. **MainScene** (lines 131–138) — passed with overrides:

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

## MainScene

**File:** `src/components/viz/MainScene.tsx` (208 lines)

### Purpose
Assembles the R3F children (TimeSlices, overlays, controls) and manages the dual-layer composition of map background + 3D scene. It handles the `densityScope` computation effects for viewport/global modes.

### Props

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

### Layout Structure

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

### Override Propagation

The overrides flow from `MainSceneProps` into child components:

| Prop | Passed To |
|------|-----------|
| `adaptiveStoreOverride` | `SelectedWarpSliceOverlay` |
| `timeStoreOverride` | `TimeSlices`, `SelectedWarpSliceOverlay` |
| `sliceStoreOverride` | `TimeSlices`, `SelectedWarpSliceOverlay` |

### Effects

1. **`useSelectionSync()`** — line 40: coordinates all views (timeline, map, cube)

2. **`densityScope === 'viewport'`** effect (lines 54–73): computes relational maps from viewport crime data via `adaptiveStore.getState().computeMaps()`

3. **`densityScope === 'global'`** effect (lines 76–162): fetches `/api/adaptive/global?binningMode=X`, falls back to local compute from `useTimelineDataStore`

4. **Camera reset** effect (lines 164–168): resets `CameraControls` when `resetVersion` changes

---

## Scene

**File:** `src/components/viz/Scene.tsx` (30 lines)

### Purpose
Wraps R3F `Canvas` with theme-aware background/fog and transparent mode support.

### Props

```typescript
interface SceneProps {
  children?: ReactNode;
  transparent?: boolean;  // default: false
}
```

### R3F Canvas Configuration

```tsx
<Canvas
  gl={{ alpha: true }}           // WebGL context: alpha=true for transparent background
  camera={{
    position: [50, 50, 50],
    fov: 45,
  }}
>
  {!transparent && <color attach="background" args={[palette.background]} />}
  {!transparent && <fog attach="fog" args={[palette.background, 10, 500]} />}
  {children}
</Canvas>
```

### Transparent Mode Behavior

When `transparent={true}` (i.e., `mode === 'map'` in MainScene):
- `<color attach="background">` is **not attached** — WebGL canvas renders with alpha channel
- `<fog>` is **not attached** — no distance fog in map overlay mode
- Scene renders over MapBase (z-index layered in HTML, not in WebGL)

When `transparent={false}`:
- Canvas background is set to `palette.background`
- Fog fades from `palette.background` from distance 10 to 500

### Theme Integration

```typescript
const theme = useThemeStore((state) => state.theme);
const palette = PALETTES[theme];
```

No explicit lighting setup — relies on R3F default lights or children that add their own lighting.

---

## R3F Children (inside Scene)

### ClusterManager

**File:** `src/components/viz/ClusterManager.tsx` (92 lines)

- Logic-only component — returns `null`
- Reads `useClusterStore`, `useFilterStore`, `useTimelineDataStore`, `useTimeStore`
- Debounced clustering via `analyzeClusters` at 400ms
- Writes results to `useClusterStore` via `setClusters`, `setSliceClustersById`
- Reads store overrides only through direct store usage (no override prop support)

### TimeSlices

**File:** `src/components/viz/TimeSlices.tsx` (159 lines)

**Props:**
```typescript
interface TimeSlicesProps {
  sliceStoreOverride?: unknown;
  timeStoreOverride?: unknown;
}
```

**Override resolution:**
```typescript
const sliceStore = (sliceStoreOverride ?? useSliceStore) as typeof useSliceStore;
const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
```

**Children per slice:**
- `SlicePlane` — the slice geometry
- `SliceClusterOverlay` — cluster visualization for that slice

**Siblings:**
- `BurstEvolutionOverlay` — burst window indicators
- `EvolutionFlowOverlay` — flow connections between slices
- Invisible hit-box mesh at `[0, 50, 0]` size `[100, 100, 100]` for double-click slice creation

**Stores read:** useSliceStore (slices, addSlice, updateSlice), useTimelineDataStore, useTimeStore (timeScaleMode), useDashboardDemoAnalysisStore (stkdeResponse), useDashboardDemoCoordinationStore (selectedBurstWindows), useFilterStore, useClusterStore, useFeatureFlagsStore

### ClusterHighlights

**File:** `src/components/viz/ClusterHighlights.tsx` (57 lines)

- Reads `useClusterStore` directly (clusters, enabled, selectedClusterId, hoveredClusterId)
- Renders wireframe + transparent box per cluster
- No override support

### ClusterLabels

**File:** `src/components/viz/ClusterLabels.tsx` (107 lines)

- Reads `useClusterStore` directly
- Renders `Html` from `@react-three/drei` at top of each cluster box
- Click sets spatial bounds on `useFilterStore`
- Calls `controls.fitToBox()` if available on the R3F controls ref

### SpatialConstraintOverlay

**File:** `src/components/viz/SpatialConstraintOverlay.tsx` (80 lines)

- Reads `useCubeSpatialConstraintsStore` directly
- Renders colored transparent boxes with `Edges` for each enabled constraint
- `Html` labels for active constraint
- No override support

### SelectedWarpSliceOverlay

**File:** `src/components/viz/SelectedWarpSliceOverlay.tsx` (242 lines)

**Props:**
```typescript
interface SelectedWarpSliceOverlayProps {
  adaptiveStoreOverride?: unknown;
  timeStoreOverride?: unknown;
  sliceStoreOverride?: unknown;
}
```

**Override resolution:**
```typescript
const sliceStore = (sliceStoreOverride ?? useWarpSliceStore) as typeof useWarpSliceStore;
const adaptiveStore = (adaptiveStoreOverride ?? useAdaptiveStore) as typeof useAdaptiveStore;
const timeStore = (timeStoreOverride ?? useTimeStore) as typeof useTimeStore;
```

- Reads warp factor, warp source, warp map from adaptive store
- Reads slices from warp slice store
- Builds `authoredWarpMap` from slice ranges/weights
- Renders transparent box + HTML label for the selected slice band
- Uses `useCrimeData` hook (viewport-based) independently

### CameraControls

```tsx
<CameraControls
  ref={controlsRef}
  makeDefault
  smoothTime={0.25}
  minDistance={1}
  maxDistance={500}
  maxPolarAngle={Math.PI / 2}
/>
```

- Exposed via `controlsRef` for programmatic reset
- Used by ClusterLabels to fit camera to cluster bounds

---

## Data Flow Summary

```
Page
└── CubeVisualization
    ├── Reads: UIStore, TimelineDataStore, FilterStore, CubeSpatialConstraintsStore,
    │         AdaptiveStore, CoordinationStore, IntervalProposalStore,
    │         WarpProposalStore, StkdeStore, ClusterStore, WarpSliceStore
    │
    ├── Overrides resolved via (override ?? default) cast pattern
    │
    ├── Renders HTML overlays (outside Canvas):
    │   ├── Adaptive status panel (warp, constraint, proposal labels)
    │   ├── STKDE context panel
    │   ├── Filter badge
    │   └── SimpleCrimeLegend
    │
    └── MainScene
        ├── showMapBackground={false}
        ├── filterStoreOverride, coordinationStoreOverride,
        │   adaptiveStoreOverride, timeStoreOverride, sliceStoreOverride
        │
        ├── useSelectionSync() — cross-view coordination
        │
        ├── Effects:
        │   ├── densityScope=viewport → adaptiveStore.computeMaps() from viewport crimes
        │   ├── densityScope=global → /api/adaptive/global → setPrecomputedMaps()
        │   └── resetVersion → CameraControls.reset()
        │
        ├── Conditional: MapBase (mode==='map' only, z-0)
        │
        └── Scene (transparent=mode==='map')
            ├── Canvas gl={{ alpha: true }}
            ├── Conditional: background color + fog (when not transparent)
            │
            └── R3F Children:
                ├── ClusterManager (null, logic-only clustering)
                ├── TimeSlices (sliceStoreOverride, timeStoreOverride)
                │   ├── SlicePlane per slice
                │   ├── SliceClusterOverlay per slice
                │   ├── BurstEvolutionOverlay
                │   ├── EvolutionFlowOverlay
                │   └── Invisible hit-box mesh (double-click → addSlice)
                ├── ClusterHighlights (reads ClusterStore directly)
                ├── ClusterLabels (reads ClusterStore directly)
                ├── SpatialConstraintOverlay (reads CubeSpatialConstraintsStore directly)
                ├── SelectedWarpSliceOverlay (all three override props)
                └── CameraControls (ref for programmatic reset)
```

---

## Key Architectural Notes

1. **Override pattern**: All five store override props (`*StoreOverride`) flow through `CubeVisualization → MainScene → SelectedWarpSliceOverlay`. `TimeSlices` receives `sliceStoreOverride` and `timeStoreOverride`. The `adaptiveStoreOverride` also flows to `SelectedWarpSliceOverlay`.

2. **No lighting in Scene.tsx**: The default R3F ambient light is used implicitly. No `<ambientLight>`, `<directionalLight>`, etc. are present in the scene composition.

3. **Theme-driven background**: `Scene` reads `useThemeStore` to get `palette.background` for the canvas background and fog. This means the 3D scene theme follows the app-wide theme toggle.

4. **Store consumption patterns**:
   - `CubeVisualization` uses `useStore(Store, selector)` for selective subscriptions
   - `MainScene` uses direct `useStore(adaptiveStore, selector)` with the resolved override store
   - Child overlay components (`ClusterHighlights`, `ClusterLabels`, `SpatialConstraintOverlay`) read their stores directly without override support
   - `TimeSlices` and `SelectedWarpSliceOverlay` support overrides explicitly

5. **Camera positioning**: Hard-coded to `[50, 50, 50]` with FOV 45. Camera reset is triggered via `resetVersion` in UIStore which `MainScene` subscribes to and calls `controlsRef.current.reset(true)`.

6. **DashboardDemoShell vs other pages**: Only `DashboardDemoShell` passes all five store overrides and a `selectionStory` prop. All other pages use `CubeVisualization` with defaults.

---

*3D scene composition analysis: 2026-05-07*