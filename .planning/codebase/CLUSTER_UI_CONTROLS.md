# Clustering UI Controls

**Analysis Date:** 2026-06-01

## Overview

Clustering is now controlled through a **simplified single-layer system**:

1. **Sensitivity Slider** (`useClusterStore.sensitivity`) — the only user-facing control for clustering behavior
2. No feature flag, no runtime toggle, no enabled/disabled switch

The `enabled` field was removed from `useClusterStore`, and the `'clustering'` feature flag no longer gates clustering operations in any component.

---

## 1. Cluster Store — Current State

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

**Important:** `sensitivity` is NOT persisted — it resets to `0.5` on page reload.

---

## 2. TimeSlices — Cluster Computation Gate

**File:** `src/components/viz/TimeSlices.tsx`

```typescript
const clusterSensitivity = useClusterStore((state) => state.sensitivity);
const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
```

The only condition for clustering to run is:

```typescript
if (slices.length === 0 || filteredPoints.length === 0) {
  return {};
}
```

No feature flag check, no `enabled` check. Clustering runs automatically whenever slices and filtered points exist.

---

## 3. ClusterManager — Global Clustering

**File:** `src/components/viz/ClusterManager.tsx`

```typescript
const sensitivity = useClusterStore((state) => state.sensitivity);
const setClusters = useClusterStore((state) => state.setClusters);
const setSliceClustersById = useClusterStore((state) => state.setSliceClustersById);
```

**No `enabled` check.** The removed `enabled` field previously gated clustering here.

**Filtered points check:**
```typescript
if (filteredPoints.length === 0) {
  setClusters([]);
  setSliceClustersById({});
  return;
}
```

**Debouncing:** 400ms via `lodash.debounce`.

---

## 4. Map Layer Toggle — Cluster Visibility on Map

**File:** `src/components/map/MapLayerManager.tsx`

```typescript
const layers = [
  { id: 'clusters' as const, label: 'Clusters', visible: visibility.clusters, color: '#8b5cf6' },
];
```

**Default in `useMapLayerStore`:** `clusters: false` (not visible by default)

**File:** `src/components/map/MapVisualization.tsx`

```typescript
{visibility.clusters ? <MapClusterHighlights /> : null}
```

This is the only control a user has to show/hide cluster highlights on the map. It's independent of the cluster store state.

---

## 5. MapClusterHighlights

**File:** `src/components/map/MapClusterHighlights.tsx`

```typescript
const { clusters, selectedClusterId } = useClusterStore();

if (!clusters || clusters.length === 0) return null;
```

No `enabled` check — only checks if clusters exist.

---

## Summary: User Controls for Clustering

| What Exists | Control Type | Sets | Default |
|-------------|--------------|------|---------|
| **What was REMOVED** | Feature flag `'clustering'` | `useFeatureFlagsStore.flags['clustering']` | `false` (removed) |
| **What was REMOVED** | Runtime toggle | `useClusterStore.enabled` | `true` (removed) |
| **What was REMOVED** | SliceManagerUI (whole component) | Cluster controls section | N/A |
| **MapLayerManager** | Layer visibility checkbox | `useMapLayerStore.visibility.clusters` | `false` |

### What Remains for Cluster Sensitivity

| Sensitivity is set directly on `useClusterStore` via `setSensitivity()`. There is currently no dedicated UI control for it — the `SliceManagerUI` that held the sensitivity slider was removed. Components can still set it programmatically.

### Execution Requirements (for clustering to actually run)

1. **Slices must exist** in `useSliceDomainStore`
2. **Filtered points must exist** in `useTimelineDataStore`
3. `useMapLayerStore.visibility.clusters` = `true` (for map highlight visibility only)

Sensitivity (`useClusterStore.sensitivity`) affects cluster detection thresholds in `analyzeClusters`.

### Key Files
- `src/store/useClusterStore.ts` — Runtime sensitivity and selection state (NOT persisted)
- `src/components/map/MapLayerManager.tsx` — Map layer visibility toggle (only remaining UI control)
- `src/lib/clustering/cluster-analysis.ts` — Clustering algorithm

---

*Cluster UI controls analysis: 2026-06-01*
