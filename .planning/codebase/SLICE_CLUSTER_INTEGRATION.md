# Slice–Cluster Integration

**Analysis Date:** 2026-06-25

---

## 1. Overview

Slices integrate with cluster and heatmap visualizations in four ways:
1. **Slice KDE** — Per-slice spatial density estimation
2. **STKDE** — Spatiotemporal hotspot detection scoped to slice ranges
3. **Adjacent slice comparison** — Statistical delta between neighboring slices
4. **Slice geometry** — Rendering positions for timeline overlays

---

## 2. Slice KDE (Kernel Density Estimation)

**File:** `src/lib/kde/compute-slice-kde.ts`

### Function: `computeSliceKde()`

Computes a 2D Gaussian KDE for crime points within a single time slice:

```typescript
computeSliceKde(
  points: Array<{ x: number; z: number }>,
  params?: Partial<KdeParams>
): { cells: KdeCell[]; maxIntensity: number; meanIntensity: number }
```

### Algorithm:
1. Grid: configurable `gridSize` (default ~20), 100-unit spatial extent (-50 to +50)
2. Bin points into grid cells via `floor((coord + 50) / cellWidth)`
3. Gaussian kernel: `weight = exp(-0.5 * (distance / sigmaCells)²)` within `kernelRadiusCells`
4. Intensity normalized to [0, 1] via `intensity / maxIntensity`
5. Filter by `threshold` (only cells above threshold are returned)
6. Returns cell array with `{ x, z, intensity, support }`

**Worker version:** `src/workers/kdeSlice.worker.ts`

### Types: `src/lib/kde/types.ts`
- `KdeParams`: `gridSize`, `sigmaCells`, `kernelRadiusCells`, `threshold`
- `KdeCell`: `{ x, z, intensity, support }`

---

## 3. Adjacent Slice Comparison

**File:** `src/lib/stkde/adjacent-slice-comparison.ts`

### Function: `compareAdjacentSlices()`

Compares two adjacent time slices for statistical deltas:

```
compareAdjacentSlices(left, right): AdjacentSliceComparisonResult
```

### Input (per slice):
- `sliceId`, `totalCount`
- `typeCounts: Record<string, number>` — crime type distribution
- `districtCounts: Record<string, number>` — district distribution

### Output metrics:
- `countDelta`: `right.totalCount - left.totalCount`
- `densityRatio`: `right.totalCount / left.totalCount`
- `dominantTypeShift`: `'unchanged' | '{left} → {right}'`
- `districtOverlap`: `{ shared[], leftOnly[], rightOnly[], ratio }` — Jaccard index
- `hotspotDelta`: dominant district comparison
- `isNeutral`: `true` when inputs are identical or null

### Usage:
- When slices are generated/applied, adjacent slice comparisons populate the slice inspector panel
- Helps users understand how crime patterns shift between time windows

---

## 4. STKDE (Space-Time Kernel Density Estimation)

**File:** `src/store/useStkdeStore.ts`

### Scope Modes (`StkdeScopeMode`):

| Mode | Behavior |
|---|---|
| `'applied-slices'` | STKDE computed only within applied slice time ranges |
| `'full-viewport'` | STKDE computed across entire viewport time range |

The scope mode is stored in both `useStkdeStore` (`scopeMode`) and `useDashboardDemoCoordinationStore` (`stkdeScopeMode`).

### STKDE Parameters (`StkdeParams`):
- `spatialBandwidthMeters`: 100–5000 (default 750)
- `temporalBandwidthHours`: 1–168 (default 24)
- `gridCellMeters`: 100–5000 (default 500)
- `topK`: 1–100 (default 12)
- `minSupport`: 1–1000 (default 5)
- `timeWindowHours`: 1–168 (default 24)

### Filter Integration:
- `spatialFilter: StkdeSpatialFilter` — lat/lng bounding box
- `temporalFilter: StkdeTemporalFilter` — epoch seconds range

### State Lifecycle:
```
idle → running → success | error | cancelled
```

When slice is stale (slices changed after last run), `markStale(reason)` sets `isStale: true`.

### STKDE Worker: `src/workers/stkdeHotspot.worker.ts`

---

## 5. Cluster Store

**File:** `src/store/useClusterStore.ts`

```typescript
interface ClusterState {
  clusters: ClusterAnalysisCluster[];
  sliceClustersById: Record<string, ClusterAnalysisCluster[]>;  // slice ID → clusters
  sensitivity: number;            // 0.5 default
  selectedClusterId: string | null;
  hoveredClusterId: string | null;
}
```

### Key integration:
- `sliceClustersById` maps each time slice to its spatial clusters
- When a slice is active/selected, its clusters render on the map
- `sensitivity` controls cluster detection parameters
- Cluster hover/selection feeds into the coordination store for cross-view highlighting

### Cluster Analysis:
**File:** `src/lib/clustering/cluster-analysis.ts` — produces `ClusterAnalysisCluster[]` with spatial extent and density metrics per slice.

---

## 6. Heatmap Store

**File:** `src/store/useHeatmapStore.ts`

Persisted settings (via `zustand/middleware/persist`):

```typescript
interface HeatmapState {
  isEnabled: boolean;     // default false
  intensity: number;      // 0-100, default 50
  radius: number;         // default 5
  opacity: number;        // default 0.6
  colorRamp: string;      // default 'cyan-white'
}
```

- Heatmap toggles independently of slice visibility
- When `isEnabled`, crime point density heatmap overlays on the map
- Works in conjunction with slice filtering (only points within visible time range)

---

## 7. Aggregation Store (3D Cube Bins)

**File:** `src/store/useAggregationStore.ts`

```typescript
interface AggregationState {
  bins: Bin[];                    // { x, y, z, count, dominantType, color }
  lodFactor: number;              // 0=points, 1=full bins
  gridResolution: { x, y, z };   // default 32x16x32
  enabled: boolean;
}
```

- Provides spatial aggregation for the 3D cube
- `lodFactor` transitions from raw points to aggregated bins as zoom/scale changes
- Grid resolution configurable for performance/scene density tradeoffs

---

## 8. Cube Spatial Constraints

**File:** `src/store/useCubeSpatialConstraintsStore.ts`

Stores spatial selection constraints that can be converted to interval/warp proposals. Used by `useWarpProposalStore` and `useIntervalProposalStore` to generate slice suggestions from spatial selections.

---

*Cluster integration analysis: 2026-06-25*
