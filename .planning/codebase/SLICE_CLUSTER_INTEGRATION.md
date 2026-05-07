# Slice-Cluster Integration in the 3D Cube

**Analysis Date:** 2026-05-07

## Overview

Clustering is **slice-scoped**, not global. Clusters are computed **per-slice** from filtered crime data within each slice's time bounds, and the results are rendered via `SliceClusterOverlay` above each `SlicePlane`. The user sees clusters appear only after creating slices.

---

## 1. TimeSlices.tsx — Full Integration Flow

**File:** `src/components/viz/TimeSlices.tsx`

### Cluster Store Reading

```typescript
// Line 47-49
const clusteringEnabled = useFeatureFlagsStore((state) => state.isEnabled('clustering'));
const clusterStoreEnabled = useClusterStore((state) => state.enabled);
const clusterSensitivity = useClusterStore((state) => state.sensitivity);
const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
```

Two gates must be open for clustering to activate:
1. `clusteringEnabled` — feature flag `clustering` from `useFeatureFlagsStore`
2. `clusterStoreEnabled` — the `enabled` boolean in `useClusterStore` itself (default `true`)

### Per-Slice Cluster Computation

**Lines 79-101:**
```typescript
const sliceClustersById = useMemo(() => {
  if (!clusteringEnabled || !clusterStoreEnabled || slices.length === 0 || filteredPoints.length === 0) {
    return {};
  }

  const sliceAnalyses = slices
    .filter((slice) => slice.isVisible !== false)
    .map((slice) => {
      // Derive time range: use slice.range if type='range', otherwise ±2 around slice.time
      const range = slice.type === 'range' && slice.range
        ? slice.range
        : [Math.max(0, slice.time - 2), Math.min(100, slice.time + 2)];
      const [start, end] = range[0] <= range[1] ? range : [range[1], range[0]];
      // Filter points within this slice's time bounds
      const slicePoints = filteredPoints.filter((point) => point.y >= start && point.y <= end);
      const analysis = analyzeClusters(slicePoints, clusterSensitivity, { kind: 'slice', sliceId: slice.id });

      return {
        sliceId: slice.id,
        clusters: analysis.clusters,
      };
    });

  return groupClusterAnalysesBySlice(sliceAnalyses);
}, [clusterSensitivity, clusterStoreEnabled, clusteringEnabled, filteredPoints, slices]);
```

Key behavior:
- **No slices → empty object `{}`** — even if clustering is enabled, no cluster computation happens without slices
- **Clustering is computed for every visible slice** — each slice independently runs `analyzeClusters` on its time-windowed subset of filtered crime data
- **Results written to `useClusterStore`** via `setSliceClustersById` in a `useEffect` (lines 103-106)

### Rendering

**Lines 132-152:**
```typescript
{slices.map((slice) => (
  <group key={slice.id}>
    <SlicePlane
      slice={slice}
      y={scale(slice.time)}
      onUpdate={(updates) => updateSlice(slice.id, updates)}
      yToTime={yToTime}
      timeToY={scale}
      stkdeSurface={stkdeResponse?.sliceResults?.[slice.id] ?? null}
      evolutionState={...}
    />
    <SliceClusterOverlay slice={slice} y={scale(slice.time)} />
  </group>
))}
```

`SliceClusterOverlay` is rendered **unconditionally** alongside `SlicePlane` for every slice. The overlay itself reads from `useClusterStore` to get cluster data for that slice.

---

## 2. SlicePlane.tsx — The Plane and stkdeSurface

**File:** `src/components/viz/SlicePlane.tsx`

### SLICE_CLUSTER_OVERLAY_ELEVATION

**Line 9:**
```typescript
export const SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16;
```

This constant specifies the vertical offset (in world units) above the slice plane at which `SliceClusterOverlay` is positioned. `SliceClusterOverlay` reads it via:
```typescript
import { SLICE_CLUSTER_OVERLAY_ELEVATION } from './SlicePlane';
```

### SlicePlane Rendering

`SlicePlane` renders at `position={[0, centerY, 0]}` where `centerY` is either:
- For point slices: `y` (the mapped slice time)
- For range slices: the midpoint of `rangeYStart` and `rangeYEnd`

**Visual layers (in order):**
1. **Base plane/box** — `meshBasicMaterial` with color based on slice type (cyan for point `#22d3ee`, purple for range `#a855f7`, gray for locked `#94a3b8`)
2. **Grid helper** — appears only on point slices, at `position={[0, 0.01, 0]}`
3. **Heatmap texture** — `mesh` at `position={[0, 0.08, 0]}` (z-offset 0.08 above plane base), rendered when `stkdeSurface` prop is provided and has cells
4. **Active stroke plane** — rendered only when `evolutionState === 'active'`, at `position={[0, SLICE_CLUSTER_OVERLAY_ELEVATION, 0]}` — this is the only case where the overlay elevation constant is used inside `SlicePlane` itself

### stkdeSurface Prop

```typescript
stkdeSurface?: StkdeSurfaceResponse | null;
```

- Passed from parent as `stkdeResponse?.sliceResults?.[slice.id] ?? null`
- When present and has cells, a canvas-based heatmap texture is generated and rendered at elevation `0.08`
- The heatmap is independent of clustering — it shows STKDE density surface, not clusters

---

## 3. Slice Creation Mechanisms

### Double-Click in TimeSlices (3D Cube)

**Lines 108-118:**
```typescript
const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();
  const y = e.point.y;
  const time = yToTime(y);
  const clampedTime = Math.max(0, Math.min(100, time));
  addSlice({ type: 'point', time: clampedTime });
}, [addSlice, yToTime]);
```

A **100×100×100 invisible hit box** centered at `[0, 50, 0]` catches double-click events. The Y coordinate is converted to normalized time via `yToTime` and clamped to `[0, 100]`. Creates a **point slice** at that time.

### DemoSlicePanel — UI Panel

**File:** `src/components/dashboard-demo/DemoSlicePanel.tsx`

**Point slice creation (line 243-258):**
```typescript
const handleAddPointSlice = useCallback(() => {
  addSlice({
    type: 'point',
    time: currentTime,
    source: 'manual',
    warpEnabled: true,
    warpWeight: 1,
    isLocked: false,
    isVisible: true,
    startDateTimeMs,
  });
}, [...]);
```

**Range slice creation (line 260-284):**
```typescript
const handleAddRangeSlice = useCallback(() => {
  const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
  const start = Math.max(timeRange[0], currentTime - stepSize * 2);
  const end = Math.min(timeRange[1], currentTime + stepSize * 2);
  const normalizedRange: [number, number] = start <= end ? [start, end] : [end, start];
  addSlice({
    type: 'range',
    time: (normalizedRange[0] + normalizedRange[1]) / 2,
    range: normalizedRange,
    source: 'manual',
    ...
  });
}, [...]);
```

**Burst draft creation** — via `generateBurstDraftBinsFromWindows` which produces `TimeBin` drafts that can be merged into slices (not directly creating slices, but generating burst-aware bin proposals).

---

## 4. Relationship: Slice Existence vs Cluster Visibility

### Clusters Only Make Sense After Slices Exist

This is the core design principle. The `sliceClustersById` useMemo in `TimeSlices.tsx` (line 80) short-circuits immediately when `slices.length === 0`:

```typescript
if (!clusteringEnabled || !clusterStoreEnabled || slices.length === 0 || filteredPoints.length === 0) {
  return {};
}
```

**Before creating any slice:**
- No cluster computation occurs
- `useClusterStore.sliceClustersById` remains `{}`
- `SliceClusterOverlay` renders `null` for every slice (its `visibleClusters` is empty)
- **User sees: empty 3D cube, no overlays**

**After creating a slice:**
1. `sliceClustersById` recomputes — runs `analyzeClusters` on filtered points within that slice's time bounds
2. Results written to `useClusterStore` via `setSliceClustersById`
3. `SliceClusterOverlay` reads `useClusterStore(state => state.sliceClustersById[slice.id])` — gets the per-slice cluster array
4. Renders cluster polygons as colored semi-transparent planes + outline lines at `y + SLICE_CLUSTER_OVERLAY_ELEVATION`

**Effect of removing slices:**
- Removing a slice causes `sliceClustersById` to shrink (that slice's ID disappears from the object)
- `setSliceClustersById({})` is called on cleanup in the `useEffect` return
- Cluster overlays for removed slices disappear immediately

### Dual-Gate Requirement

Both gates must be open:
- `clusteringEnabled` — feature flag (can be toggled off globally)
- `clusterStoreEnabled` — local store boolean (default `true`)

If either is false, clustering short-circuits to `{}` even if slices exist.

---

## 5. DemoSlicePanel — Clustering UI Presence

**Does clustering UI appear in DemoSlicePanel?**

**No.** The `DemoSlicePanel` is a slice management panel (add, remove, lock, visibility, warp settings, burst draft generation, comparison slot assignment). It does **not** contain:
- Clustering enable/disable controls
- Cluster sensitivity sliders
- Cluster selection/hover state
- Any references to `useClusterStore` or clustering functions

The clustering pipeline is entirely contained within `TimeSlices.tsx`:
- `TimeSlices` reads `clusteringEnabled` from feature flags and `clusterStoreEnabled` from the store
- `TimeSlices` computes and writes `sliceClustersById`
- `SliceClusterOverlay` reads and renders clusters

**The DemoSlicePanel is orthogonal to clustering** — it manages slices (which happen to be the vehicle for clustering) but has no awareness of the clustering computation or visualization.

---

## 6. Complete Integration Timeline

### Initial State (No Slices)
- 3D cube visible with no slice planes
- No cluster overlays rendered
- `useClusterStore.sliceClustersById = {}`

### User Creates a Slice (double-click or DemoSlicePanel)
1. `addSlice()` called → slice added to slice store
2. `TimeSlices` re-renders, `sliceClustersById` useMemo recomputes
3. For each visible slice, `analyzeClusters()` runs on filtered points within slice time window
4. Results passed through `groupClusterAnalysesBySlice` → `Record<sliceId, ClusterAnalysisCluster[]>`
5. `useEffect` calls `setSliceClustersById(sliceClustersById)` → store updated
6. `SliceClusterOverlay` reads store, finds clusters for this slice ID, renders colored polygon overlays
7. **User sees cluster polygons floating above the slice plane at 0.16 elevation**

### User Toggles `clustering` Feature Flag Off
- `clusteringEnabled` becomes `false`
- `sliceClustersById` useMemo returns `{}` immediately (short-circuit at line 80)
- `useEffect` calls `setSliceClustersById({})` → store cleared
- All `SliceClusterOverlay` components render `null`
- **User sees: slice planes remain but no cluster overlays**

### User Removes All Slices
- Same as toggling clustering off — `{}` returned, store cleared
- **User sees: empty cube again**

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/viz/TimeSlices.tsx` | Orchestrator: reads cluster store, computes per-slice clusters, renders both `SlicePlane` and `SliceClusterOverlay` |
| `src/components/viz/SlicePlane.tsx` | Renders individual slice plane at `centerY`. `SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16`. Accepts `stkdeSurface` for heatmap rendering |
| `src/components/viz/SliceClusterOverlay.tsx` | Reads `useClusterStore.sliceClustersById[slice.id]`, renders cluster polygons above the slice plane |
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | Slice management UI (add/remove/lock/visibility/warp). No clustering controls or awareness |
| `src/store/useClusterStore.ts` | Zustand store holding `sliceClustersById`, `enabled`, `sensitivity`, selection/hover state |
| `src/lib/clustering/cluster-analysis.ts` | `analyzeClusters()` and `groupClusterAnalysesBySlice()` — the core clustering algorithms |

---

*Slice-cluster integration analysis: 2026-05-07*