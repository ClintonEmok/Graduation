# Cluster/Heatmap Visualization Pipeline

**Analysis Date:** 2026-06-25

## DBSCAN Cluster Pipeline

### Data Source

Filtered points from `selectFilteredData()` in `src/lib/data/selectors.ts`:
```typescript
interface FilteredPoint {
  x: number; y: number; z: number;
  lat?: number; lon?: number;
  typeId: number; districtId: number;
  block?: string; originalIndex: number;
}
```

### Cluster Engine

**File:** `src/lib/clustering/cluster-analysis.ts`

**Library:** `density-clustering` (DBSCAN)

**Configuration:**
- `minPoints`: 5 (hardcoded)
- `epsilon`: `max(2, 15 - sensitivity * 12)` — sensitivity ranges 0-1, epsilon ranges 15-2
- Dataset prepared as `[x, y * 0.5, z]` — Y (time) dimension is halved to reduce temporal dominance

**Analysis output (`ClusterAnalysisCluster`):**
```typescript
{
  id: string;           // "global-0", "global-1", ...
  scope: ClusterScope;  // { kind: 'global' } | { kind: 'slice', sliceId: string }
  memberIndexes: number[];
  count: number;
  dominantTypeId: number;
  dominantType: string;
  typeCounts: Record<number, number>;
  bounds: ClusterBounds;  // min/max for X, Y, Z, lat, lon
  center: [number, number, number];
  size: [number, number, number];
  timeRange: [number, number];
}
```

### Cluster Manager (Orchestrator)

**File:** `src/components/viz/ClusterManager.tsx`

- Logic-only component (returns `null`)
- Watches `filterStore` selections + `timeScaleMode`
- Renders filtered points through optional adaptive Y computation
- Debounced 400ms via `lodash.debounce`
- Updates `useClusterStore.clusters` and `useClusterStore.sliceClustersById`

### 3D Rendering

**ClusterHighlights** (`src/components/viz/ClusterHighlights.tsx`):
- Each cluster = `boxGeometry` with size `[cluster.size]` at `cluster.center`
- Two passes per cluster: fill mesh (opacity: 0.08-0.18) + wireframe mesh (opacity: 0.35-0.8)
- Color from dominant crime type via `PALETTES[theme].categoryColors`
- Opacity scales by selection state (hovered/selected/idle)

**ClusterLabels** (`src/components/viz/ClusterLabels.tsx`):
- Top 5 clusters (sorted by count descending) get HTML labels
- Label shows dominant type, count, time range
- Interactive: click toggles `selectedClusterId` + sets spatial bounds filter
- On select: calls `controls.fitToBox()` to zoom camera to cluster bounds
- Color-coded top border via inline `style={{ borderTop: '2px solid ...' }}`

### Slice-Level Clusters

**File:** `src/components/viz/TimeSlices.tsx` (lines 77-104)

Per-slice cluster analysis:
- Filters points within each slice's time range
- Runs `analyzeClusters()` with sensitivity and `{ kind: 'slice', sliceId }` scope
- Stored in `useClusterStore.sliceClustersById` as `Record<string, ClusterAnalysisCluster[]>`

**SliceClusterOverlay** (`src/components/viz/SliceClusterOverlay.tsx`):
- Rendered at `SLICE_CLUSTER_OVERLAY_ELEVATION` (0.16) above slice plane
- Each cluster = `planeGeometry` bounding rectangle + `Line` border
- Opacity scales by selection/hover state

## GPGPU Heatmap Pipeline

### Engine

**File:** `src/components/viz/HeatmapOverlay.tsx`

**Store:** `useHeatmapStore` — controls `isEnabled`, `intensity`, `radius`, `opacity`

### Pass 1: Aggregation

- **Scene:** `new THREE.Scene()` (reused, never disposed)
- **Camera:** `OrthographicCamera(-50, 50, 50, -50, 0.1, 10)` — matches spatial grid
- **Render Target:** `useFBO(1024, 1024, { type: FloatType, format: RedFormat })`
- **Material:** ShaderMaterial with `AdditiveBlending`
- **Geometry:** `THREE.Points` from columnar data with filter and spatial attributes
- **Controls:** `isEnabled` + `columns` must be truthy

### Pass 2: Display

- **Mesh:** PlaneGeometry(100, 100) rotated horizontal at y=0.015
- **Material:** ShaderMaterial reading FBO texture, applying log scale + cyan→white color map
- **Blending:** Configurable via prop (default `NormalBlending`)

### Shader Details

**Aggregation vertex:** Projects `[colX, colZ]` → `[normX*100-50, normZ*100-50, 0]`, applies filter checks (time, type, district, spatial bounds) via `vDiscard` varying

**Aggregation fragment:** Gaussian falloff: `exp(-d² * 20.0)`, discards beyond radius

**Heatmap fragment:** Log-scaled density, cyan→white gradient:
```glsl
float logDensity = log(1.0 + density) / log(1.0 + uMaxIntensity);
vec3 cyan = vec3(0.0, 1.0, 1.0);
vec3 white = vec3(1.0, 1.0, 1.0);
vec3 color = mix(cyan, white, logDensity);
```

### Performance

- Per-frame FBO render: ~1.5M fragment operations per frame (1024² × 2 passes)
- No dirty-checking — renders every frame regardless of state changes
- Filter uniforms updated via `useMemo` on selection state changes

## DeckGL Heatmap on Map

**File:** `src/components/map/DeckGlHeatmapOverlay.tsx`

- Uses `@deck.gl/mapbox` `MapboxOverlay` to integrate with MapLibre
- `HeatmapLayer` with configurable `radiusPixels`, `intensity`, `threshold`
- `getPosition: (d) => [d.lon, d.lat]`
- 6-stop color range: blue→cyan→green→yellow→red
- Controlled via `useControl` from `react-map-gl`

## STKDE Hotspot Pipeline

### Computation

**File:** `src/lib/stkde/compute.ts` (565 lines)

Full spatiotemporal KDE with configurable:
- `spatialBandwidthMeters` (100-5000)
- `temporalBandwidthHours` (1-168)
- `gridCellMeters` (100-5000)

**API Route:** `/api/stkde/hotspots` — DuckDB-powered

**Worker:** `src/workers/stkdeHotspot.worker.ts` — Filters and ranks pre-computed hotspots

### STKDE Hotspot Properties

```typescript
interface StkdeHotspot {
  id: string;
  centroidLng: number;
  centroidLat: number;
  intensityScore: number;
  supportCount: number;
  peakStartEpochSec: number;
  peakEndEpochSec: number;
  radiusMeters: number;
}
```

### Rendering

**On 3D Slice Planes** (`SlicePlane.tsx` lines 40-80):
- Converts `StkdeSurfaceResponse.heatmap.cells` → Canvas 2D texture
- Creates radial gradient per cell with `sampleStkdeHeatmapColor()`
- Rendered as elevated plane at `y + 0.08` with `opacity: 0.92`

**On Map** (`MapStkdeHeatmapLayer.tsx`):
- MapLibre GL layer with heatmap color expression from `buildStkdeHeatmapColorExpression()`

## Trajectory Flow Pipeline

### Grouping

**File:** `src/lib/trajectories.ts`

Groups filtered points by `block` attribute. Implements context-aware filtering: if any point in a block's trajectory is in the filtered set, the entire trajectory for that block is shown.

### Rendering

**File:** `src/components/viz/Trajectory.tsx`

- Uses `@react-three/drei` `<Line>` with vertex colors
- Color gradient: blue (start) → bright cyan (end) via HSL interpolation
- Thickness varies inversely with time gap between consecutive points
- **Animation:** Per-frame update repositions vertices with linear↔adaptive warp lerp
- **Trail effect:** Vertex colors dimmed by time distance from `currentTime`
- **Arrowhead:** `coneGeometry` at latest point, oriented toward previous point
- **Interaction:** Hover = highlight, click = select + set coordination index

---

*Cluster visualization pipeline analysis: 2026-06-25*
