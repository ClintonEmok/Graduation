# Cluster Visualization Pipeline

**Analysis Date:** 2026-06-01

## Overview

The cluster visualization pipeline transforms crime data into interactive 3D cluster representations. It uses DBSCAN density-based clustering to identify hotspots, then renders them as boxes with labels and overlays synchronized across the cube, map, and timeline views.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ DATA SOURCES                                                                             │
│                                                                                         │
│ useTimelineDataStore.columns (ColumnarData)  ←  DuckDB query results                   │
│ useTimelineDataStore.data (DataPoint[])      ←  Legacy array format                   │
│ useTimelineDataStore.minTimestampSec          ←  Data bounds                           │
│ useTimelineDataStore.maxTimestampSec          ←  Data bounds                           │
└──────────────────────────┬────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FILTER LAYER (useFilterStore)                                                           │
│                                                                                         │
│ • selectedTypes: number[]         - Crime type filter                                  │
│ • selectedDistricts: number[]     - District filter                                    │
│ • selectedTimeRange: TimeRangeLike - Time range filter                                 │
└──────────────────────────┬────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CLUSTER COMPUTATION                                                                      │
│                                                                                         │
│ Two paths:                                                                              │
│                                                                                         │
│ PATH 1: Global Clusters (ClusterManager.tsx)                                            │
│ ┌──────────────────────────────────────────────────────────┐                           │
│ │ ClusterManager.tsx (logic-only, renders nothing)        │                           │
│ │                                                          │                           │
│ │ 1. selectFilteredData(...) → FilteredPoint[]           │                           │
│ │ 2. If timeScaleMode === 'adaptive':                     │                           │
│ │    computeAdaptiveYColumnar(...) → remap y values       │                           │
│ │ 3. analyzeClusters(pointsToCluster, sensitivity)        │                           │
│ │    → ClusterAnalysisResult                              │                           │
│ │ 4. setClusters(clusters)  ← Writes to useClusterStore   │                           │
│ │                                                          │                           │
│ │ Debounced: 400ms via lodash.debounce                    │                           │
│ │                                                          │                           │
│ │ No `enabled` check — only checks filteredPoints.length  │                           │
│ └──────────────────────────────────────────────────────────┘                           │
│                                                                                         │
│ PATH 2: Slice Clusters (TimeSlices.tsx - inline)                                       │
│ ┌──────────────────────────────────────────────────────────┐                           │
│ │ TimeSlices.tsx useMemo ~lines 77-99                      │                           │
│ │                                                          │                           │
│ │ For each VISIBLE slice:                                  │                           │
│ │ 1. Extract time range from slice (point ±2 or range)    │                           │
│ │ 2. filter filteredPoints by time range                  │                           │
│ │ 3. analyzeClusters(slicePoints, sensitivity,            │                           │
│ │       { kind: 'slice', sliceId: slice.id })             │                           │
│ │ 4. groupClusterAnalysesBySlice(sliceAnalyses)           │                           │
│ │                                                          │                           │
│ │ Writes via useEffect → setSliceClustersById(...)        │                           │
│ │                                                          │                           │
│ │ No feature flag or enabled gate                          │                           │
│ └──────────────────────────────────────────────────────────┘                           │
└──────────────────────────┬────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ STATE (useClusterStore)                                                                 │
│                                                                                         │
│ clusters: ClusterAnalysisCluster[]          - Global clusters                            │
│ sliceClustersById: Record<string, ClusterAnalysisCluster[]> - Per-slice clusters       │
│ sensitivity: number (0.0-1.0)              - DBSCAN epsilon control                   │
│ selectedClusterId: string | null           - Click selection                           │
│ hoveredClusterId: string | null            - Hover state                               │
│                                                                                         │
│ No `enabled` field (was removed)                                                        │
│                                                                                         │
│ Actions:                                                                                │
│ setClusters, setSliceClustersById, setSensitivity                                      │
│ setSelectedClusterId, setHoveredClusterId, clearClusterSelection                       │
└──────────────────────────┬────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ ClusterHighlights│ │ ClusterLabels│ │ SliceClusterOverlay
│ (3D box rendering)│ │ (HTML labels)│ │ (2D plane overlay)
└──────────────────┘ └──────────────┘ └──────────────────┘
```

## Store Structure

**File:** `src/store/useClusterStore.ts`

```typescript
interface ClusterState {
  clusters: ClusterAnalysisCluster[];           // Global clustering results
  sliceClustersById: Record<string, ClusterAnalysisCluster[]>;  // Per-slice
  sensitivity: number;                          // DBSCAN sensitivity (0.5 default)
  selectedClusterId: string | null;            // Click-selected cluster
  hoveredClusterId: string | null;             // Hover-highlighted cluster

  // Actions
  setClusters: (clusters: ClusterAnalysisCluster[]) => void;
  setSliceClustersById: (sliceClustersById: Record<string, ClusterAnalysisCluster[]>) => void;
  setSensitivity: (sensitivity: number) => void;
  setSelectedClusterId: (id: string | null) => void;
  setHoveredClusterId: (id: string | null) => void;
  clearClusterSelection: () => void;
}
```

**Initial State:**
```typescript
{
  clusters: [],
  sliceClustersById: {},
  sensitivity: 0.5,
  selectedClusterId: null,
  hoveredClusterId: null,
}
```

## ClusterAnalysisCluster Type

**File:** `src/lib/clustering/cluster-analysis.ts`

```typescript
export interface ClusterAnalysisCluster {
  id: string;                              // Format: "global-{index}" or "slice-{sliceId}-{index}"
  scope: ClusterScope;                     // { kind: 'global' } | { kind: 'slice', sliceId: string }
  memberIndexes: number[];                 // Indices into input points array
  count: number;                            // Number of points in cluster

  // Dominant crime type
  dominantTypeId: number;
  dominantType: string;                    // e.g., "THEFT", "BATTERY" (from getCrimeTypeName)

  // Type distribution
  typeCounts: Record<number, number>;       // typeId → count

  // Spatial bounds (3D normalized coords + geographic)
  bounds: ClusterBounds;
  center: [number, number, number];        // Box center
  size: [number, number, number];           // Box dimensions (width, height, depth)

  // Temporal bounds
  timeRange: [number, number];              // minY, maxY in normalized time (0-100)
}

export interface ClusterBounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
  minLat: number; maxLat: number;          // Geographic coordinates
  minLon: number; maxLon: number;
}
```

## Component Details

### 1. ClusterHighlights.tsx

**File:** `src/components/viz/ClusterHighlights.tsx`

Renders 3D box representations of global clusters in the scene.

**Rendering:**
- Each cluster renders TWO meshes at `cluster.center` with `cluster.size`:
  1. **Volume mesh:** `boxGeometry(1,1,1)` + `meshBasicMaterial` transparent (filled box)
  2. **Wireframe mesh:** `boxGeometry(1,1,1)` + `meshBasicMaterial wireframe` (outline)

**Color Resolution:**
```typescript
const resolveClusterColor = (dominantType: string) =>
  palette[dominantType.toUpperCase()] || palette[dominantType] || '#a855f7';
```

**Opacity States:**
| State | Volume Opacity | Wire Opacity |
|-------|----------------|--------------|
| Default | 0.08 | 0.35 |
| Hovered | 0.12 | 0.60 |
| Selected | 0.18 | 0.80 |

**Conditional Rendering:**
```typescript
if (!clusters || clusters.length === 0) return null;
```
No `enabled` check.

---

### 2. ClusterLabels.tsx

**File:** `src/components/viz/ClusterLabels.tsx`

Renders HTML labels for top 5 clusters (by count) using `@react-three/drei` `Html`.

**Interaction Handlers:**
```typescript
onPointerEnter={() => setHoveredClusterId(cluster.id)}
onPointerLeave={() => setHoveredClusterId(null)}
onClick={() => {
  if (selectedClusterId === cluster.id) {
    clearClusterSelection();
    clearSpatialBounds();
  } else {
    setSelectedClusterId(cluster.id);
    setSpatialBounds({...});
    // Camera fitToBox if available
  }
}}
```

**Spatial Bounds Filtering:** On cluster click, `setSpatialBounds()` is called on `useFilterStore`, which filters the displayed data to within the cluster's geographic bounds.

**Camera Fit:** Uses `useThree()` to get OrbitControls instance, calls `controls.fitToBox()` with padding.

---

### 3. SliceClusterOverlay.tsx

**File:** `src/components/viz/SliceClusterOverlay.tsx`

Renders 2D cluster projections on individual slice planes (time slices).

**Props:**
```typescript
interface SliceClusterOverlayProps {
  slice: TimeSlice;
  y: number;          // Y position of the slice plane
}
```

**Rendering:**
- Positioned at `y + SLICE_CLUSTER_OVERLAY_ELEVATION` (elevation = 0.16 from `SlicePlane.tsx`)
- For each visible cluster in `sliceClustersById[slice.id]`:
  1. Calculate width/depth from bounds
  2. Center position: `[(minX + maxX) / 2, 0, (minZ + maxZ) / 2]`
  3. Render horizontal plane + outline line

**Opacity States:**
| State | Fill Opacity | Line Opacity |
|-------|--------------|--------------|
| Default | 0.06 | 0.45 |
| Hovered | 0.10 | 0.70 |
| Selected | 0.16 | 0.90 |

---

### 4. ClusterManager.tsx

**File:** `src/components/viz/ClusterManager.tsx`

Logic-only component (renders `null`). Manages global cluster computation.

**No `enabled` check** — the removed `enabled` field previously controlled activation.

**Filtered points check:**
```typescript
if (filteredPoints.length === 0) {
  setClusters([]);
  setSliceClustersById({});
  return;
}
```

**Adaptive Y remapping (if adaptive mode):**
```typescript
if (timeScaleMode === 'adaptive') {
  const timestamps = new Float32Array(filteredPoints.map(p => p.y));
  const adaptiveY = computeAdaptiveYColumnar(timestamps, [0, 100], [0, 100]);
  pointsToCluster = filteredPoints.map((p, i) => ({ ...p, y: adaptiveY[i] }));
}
```

**Debouncing:** 400ms via `lodash.debounce`.

---

## analyzeClusters Function

**File:** `src/lib/clustering/cluster-analysis.ts`

```typescript
export function analyzeClusters(
  points: FilteredPoint[],
  sensitivity: number,
  scope: ClusterScope = { kind: 'global' }
): ClusterAnalysisResult
```

**Algorithm: DBSCAN**

1. **Dataset preparation:**
```typescript
const dataset = points.map((point) => [point.x, point.y * 0.5, point.z]);
```
Y is scaled by 0.5 to reduce temporal clustering bias.

2. **Epsilon resolution:**
```typescript
const resolveEpsilon = (sensitivity: number): number => {
  const bounded = Math.min(1, Math.max(0, sensitivity));
  return Math.max(2, 15 - bounded * 12);
};
```
- Sensitivity 0.0 → epsilon = 15
- Sensitivity 0.5 → epsilon = 9
- Sensitivity 1.0 → epsilon = 3

3. **Clustering:**
```typescript
const dbscan = new DBSCAN();
const clusterIndexes = dbscan.run(dataset, epsilon, minPoints) as number[][];
```
- Uses `density-clustering` library
- `minPoints` fixed at 5

---

## Interaction Flow

1. **Hover:**
   - `ClusterLabels` → `setHoveredClusterId(cluster.id)` → Updates `ClusterHighlights` opacity + `SliceClusterOverlay` opacity

2. **Click (select):**
   - `ClusterLabels` → `setSelectedClusterId(cluster.id)` → Higher opacity in all cluster visualizations
   - Also calls `setSpatialBounds()` → filters map/data to cluster region

3. **Click (deselect):**
   - `ClusterLabels` → `clearClusterSelection()` → Clears selected + hovered IDs
   - Calls `clearSpatialBounds()` → removes geographic filter

4. **Camera fit:**
   - On cluster select, if OrbitControls has `fitToBox()`, camera animates to frame cluster

---

## Key Files

| File | Purpose |
|------|---------|
| `src/store/useClusterStore.ts` | Central state for cluster visualization (no `enabled` field) |
| `src/lib/clustering/cluster-analysis.ts` | DBSCAN clustering algorithm + type definitions |
| `src/components/viz/ClusterManager.tsx` | Global cluster computation (debounced, no `enabled` check) |
| `src/components/viz/ClusterHighlights.tsx` | 3D box rendering for global clusters |
| `src/components/viz/ClusterLabels.tsx` | HTML labels with interaction |
| `src/components/viz/SliceClusterOverlay.tsx` | 2D overlays on time slice planes |
| `src/components/viz/TimeSlices.tsx` | Per-slice cluster computation (inline, not via ClusterManager) |
| `src/components/viz/SlicePlane.tsx` | `SLICE_CLUSTER_OVERLAY_ELEVATION = 0.16` constant |
| `src/lib/palettes.ts` | Theme-based color palettes |
| `src/lib/adaptive-scale.ts` | `computeAdaptiveYColumnar()` for adaptive time scaling |

---

*Cluster visualization pipeline analysis: 2026-06-01*
