# Slice-Cluster Integration in the 3D Cube

**Analysis Date:** 2026-06-01

## Overview

Clustering is **slice-scoped**, not global. Clusters are computed **per-slice** from filtered crime data within each slice's time bounds, and the results are rendered via `SliceClusterOverlay` above each `SlicePlane`. The user sees clusters appear only after creating slices.

---

## 1. TimeSlices.tsx — Full Integration Flow

**File:** `src/components/viz/TimeSlices.tsx`

### Cluster Store Reading

```typescript
// Lines 46-47
const clusterSensitivity = useClusterStore((state) => state.sensitivity);
const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
```

No feature flag or enabled gate exists. The only condition for clustering is that slices and filtered points exist.

### Per-Slice Cluster Computation

**Lines 77-99:**
```typescript
const sliceClustersById = useMemo(() => {
  if (slices.length === 0 || filteredPoints.length === 0) {
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
}, [clusterSensitivity, filteredPoints, slices]);
```

Key behavior:
- **No slices → empty object `{}`** — no cluster computation happens without slices
- **Clustering is computed for every visible slice** — each slice independently runs `analyzeClusters` on its time-windowed subset of filtered crime data
- **Results written to `useClusterStore`** via `setSliceClustersById` in a `useEffect` (lines 101-104)

### Rendering

**Lines 145-167:**
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
    <SliceCrimePoints points={slicePointsById[slice.id] ?? []} />
  </group>
))}

<BurstEvolutionOverlay slices={slices} burstWindows={selectedBurstWindows} timeToY={scale} />
<EvolutionFlowOverlay slices={slices} activeSliceId={evolutionSequence.activeSliceId} timeToY={scale} />
```

`SliceClusterOverlay` and `SliceCrimePoints` are rendered **unconditionally** alongside `SlicePlane` for every slice. The overlays read from `useClusterStore` to get cluster data for that slice.

---

## 2. SlicePlane.tsx — The Plane and stkdeSurface

**File:** `src/components/viz/SlicePlane.tsx`

### SLICE_CLUSTER_OVERLAY_ELEVATION

**Line 9:**
```typescript
export const SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16;
```

This constant specifies the vertical offset (in world units) above the slice plane at which `SliceClusterOverlay` is positioned.

### SlicePlane Rendering

`SlicePlane` renders at `position={[0, centerY, 0]}` where `centerY` is either:
- For point slices: `y` (the mapped slice time)
- For range slices: the midpoint of `rangeYStart` and `rangeYEnd`

**Visual layers (in order):**
1. **Base plane/box** — `meshBasicMaterial` with color based on slice type (cyan for point `#22d3ee`, purple for range `#a855f7`, gray for locked `#94a3b8`)
2. **Grid helper** — appears only on point slices, at `position={[0, 0.01, 0]}`
3. **Heatmap texture** — `mesh` at `position={[0, 0.08, 0]}` (z-offset 0.08 above plane base), rendered when `stkdeSurface` prop is provided and has cells
4. **Active stroke plane** — rendered only when `evolutionState === 'active'`, at `position={[0, SLICE_CLUSTER_OVERLAY_ELEVATION, 0]}`

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

**Lines 121-131:**
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

### DemoSlicePanel — Slice Management UI

**File:** `src/components/dashboard-demo/DemoSlicePanel.tsx`

The `DemoSlicePanel` is a slice review-and-apply panel (pending drafts + applied slices). It uses `useSliceDomainStore` directly.

**Draft bin creation vs direct slice creation:**
The panel does NOT create slices directly via `addSlice`. Instead, it:
1. Creates draft bins via `addManualDraftRange` → `computeManualDraftBin` (generates burst metadata)
2. Displays pending drafts with merge/split/delete controls
3. Applies drafts via `applySingleGeneratedBin` which calls `useSliceDomainStore.getState().replaceSlicesFromBins()`

**Warp controls** are pulled from `useDashboardDemoCoordinationStore` — the panel includes linear/adaptive toggle and warp factor slider (0-3).

---

## 4. Relationship: Slice Existence vs Cluster Visibility

### Clusters Only Make Sense After Slices Exist

This is the core design principle. The `sliceClustersById` useMemo in `TimeSlices.tsx` (line 78) short-circuits immediately when `slices.length === 0`:

```typescript
if (slices.length === 0 || filteredPoints.length === 0) {
  return {};
}
```

**Before creating any slice:**
- No cluster computation occurs
- `useClusterStore.sliceClustersById` remains `{}`
- `SliceClusterOverlay` renders `null` for every slice
- **User sees: empty 3D cube, no overlays**

**After creating a slice:**
1. `sliceClustersById` recomputes — runs `analyzeClusters` on filtered points within that slice's time bounds
2. Results written to `useClusterStore` via `setSliceClustersById`
3. `SliceClusterOverlay` reads `useClusterStore(state => state.sliceClustersById[slice.id])` — gets the per-slice cluster array
4. Renders cluster polygons as colored semi-transparent planes + outline lines at `y + SLICE_CLUSTER_OVERLAY_ELEVATION`

**Effect of removing slices:**
- Removing a slice causes `sliceClustersById` to shrink
- `setSliceClustersById({})` is called on cleanup in the `useEffect` return
- Cluster overlays for removed slices disappear immediately

### Single Condition — No Feature Flag

No feature flag or runtime toggle gates clustering. The `enabled` field was removed from `useClusterStore`. The only condition is `slices.length === 0 || filteredPoints.length === 0`.

If either is falsy, clustering short-circuits to `{}`.

---

## 5. DemoSlicePanel — Clustering UI Presence

The `DemoSlicePanel` is purely a slice management panel (review pending drafts, see applied slices, warp controls). It does **not** contain:
- Cluster sensitivity sliders (those exist in the now-removed `SliceManagerUI`)
- Cluster selection/hover state

The clustering pipeline is entirely contained within `TimeSlices.tsx`:
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
1. Slice created and added to slice store
2. `TimeSlices` re-renders, `sliceClustersById` useMemo recomputes
3. For each visible slice, `analyzeClusters()` runs on filtered points within slice time window
4. Results passed through `groupClusterAnalysesBySlice` → `Record<sliceId, ClusterAnalysisCluster[]>`
5. `useEffect` calls `setSliceClustersById(sliceClustersById)` → store updated
6. `SliceClusterOverlay` reads store, finds clusters for this slice ID, renders colored polygon overlays
7. **User sees cluster polygons floating above the slice plane at 0.16 elevation**

### User Removes All Slices
- `{}` returned, store cleared
- **User sees: empty cube again**

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/viz/TimeSlices.tsx` | Orchestrator: reads cluster store, computes per-slice clusters, renders `SlicePlane`, `SliceClusterOverlay`, `SliceCrimePoints`, `BurstEvolutionOverlay`, `EvolutionFlowOverlay` |
| `src/components/viz/SlicePlane.tsx` | Renders individual slice plane at `centerY`. `SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16`. Accepts `stkdeSurface` for heatmap rendering |
| `src/components/viz/SliceClusterOverlay.tsx` | Reads `useClusterStore.sliceClustersById[slice.id]`, renders cluster polygon overlays above the slice plane |
| `src/components/viz/SliceCrimePoints.tsx` | Renders crime data points within each slice's time bounds |
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | Slice review-and-apply UI (pending drafts, applied slices, warp controls). No clustering controls |
| `src/store/useClusterStore.ts` | Zustand store holding `sliceClustersById`, `sensitivity`, selection/hover state (no `enabled` field) |
| `src/lib/clustering/cluster-analysis.ts` | `analyzeClusters()` and `groupClusterAnalysesBySlice()` — the core clustering algorithms |

---

*Slice-cluster integration analysis: 2026-06-01*
