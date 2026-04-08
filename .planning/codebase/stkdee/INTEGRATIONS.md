# STKDE External Integrations

**Analysis Date:** 2026-03-30

## Database Integration

### DuckDB (Crime Data)

**Purpose:** In-process SQL database storing Chicago crime records

**Connection:**
- Lazy initialization via `@/lib/db`
- SQLite-compatible mode with DuckDB

**Relevant Tables:**
- Crime records with columns: `Date`, `Latitude`, `Longitude`, `Primary Type`, etc.

**Query Functions:**
- `queryCrimesInRange()` - Sampled mode query
- `buildFullPopulationStkdeInputs()` - Full population aggregate query

**STKDE Usage:**
```typescript
// Sampled mode - fetches raw crime records
const crimes = await queryCrimesInRange(
  normalizedRequest.domain.startEpochSec,
  normalizedRequest.domain.endEpochSec,
  { limit: normalizedRequest.limits.maxEvents, crimeTypes: ... }
);

// Full population mode - SQL aggregation
const inputs = await buildFullPopulationStkdeInputs(normalizedRequest);
```

## Mapping Integration

### MapLibre GL / react-map-gl

**Purpose:** WebGL-based map rendering for heatmap visualization

**Package:** `react-map-gl` 8.1.0

**Layer Components:**
- `MapStkdeHeatmapLayer.tsx` - Renders heatmap from STKDE cells
- Uses GeoJSON source with heatmap and circle layers

**Heatmap Configuration:**
```typescript
{
  'heatmap-weight': ['get', 'intensity'],
  'heatmap-intensity': 1.1,
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 20, 15, 35],
  'heatmap-opacity': 0.85,
  'heatmap-color': [color interpolation from blue to red]
}
```

**Zoom-dependent Radius:**
- Zoom 8: 10px radius
- Zoom 12: 20px radius
- Zoom 15: 35px radius

### @math.gl/web-mercator

**Purpose:** Coordinate system transformations for map projections

## State Management Integration

### Zustand Stores

**STKDE Store:**
- `src/store/useStkdeStore.ts` - Local STKDE state
- Manages: params, results, run status, selection, filters

**Dependent Stores:**
- `useSliceDomainStore` - Applied time slices for scope
- `useFilterStore` - Selected time range and spatial bounds
- `useViewportStore` - Viewport date range
- `useMapLayerStore` - Layer visibility

### Store Dependencies

```typescript
// useDashboardStkde reads from multiple stores
const viewportStart = useViewportStore((state) => state.startDate);
const viewportEnd = useViewportStore((state) => state.endDate);
const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
const selectedSpatialBounds = useFilterStore((state) => state.selectedSpatialBounds);
const appliedSlices = useSliceDomainStore(...);
```

## API Integration

### Internal API Endpoint

**Route:** `POST /api/stkde/hotspots`

**Request Format:**
```typescript
{
  computeMode: 'sampled' | 'full-population',
  callerIntent: 'stkde' | 'unknown',
  domain: { startEpochSec, endEpochSec },
  filters: { crimeTypes?: string[], bbox?: [minLng, minLat, maxLng, maxLat] },
  params: { spatialBandwidthMeters, temporalBandwidthHours, gridCellMeters, topK, minSupport, timeWindowHours },
  limits: { maxEvents, maxGridCells },
  guardrails: { fullPopulationMaxSpanDays, fullPopulationTimeoutMs }
}
```

**Response Format:**
```typescript
{
  meta: { eventCount, computeMs, truncated, requestedComputeMode, effectiveComputeMode, fallbackApplied, clampsApplied, fullPopulationStats? },
  heatmap: { cells: [{ lng, lat, intensity, support }], maxIntensity },
  hotspots: [{ id, centroidLng, centroidLat, intensityScore, supportCount, peakStartEpochSec, peakEndEpochSec, radiusMeters }],
  contracts: { scoreVersion: 'stkde-v1' }
}
```

### Query State Integration

**URL Query Parameters (for `/stkde` route):**
- `start` - Start epoch seconds
- `end` - End epoch seconds
- `mode` - Compute mode (`sampled` | `full-population`)
- `sbw` - Spatial bandwidth meters
- `tbw` - Temporal bandwidth hours
- `cell` - Grid cell meters
- `topk` - Top K hotspots
- `mins` - Minimum support
- `twin` - Time window hours

## Coordinate System

### Chicago Bounds

**Constants from `@/lib/coordinate-normalization`:**
```typescript
CHICAGO_BOUNDS = {
  minLon: -87.939,
  maxLon: -87.524,
  minLat: 41.644,
  maxLat: 42.023
}
```

**Usage:**
- Default bounding box for STKDE queries
- Coordinate validation and clamping

### Meter Conversions

```typescript
METERS_PER_LAT_DEGREE = 111_320;
toLonDegreeMeters = (lat) => METERS_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180);
```

## Feature Flags

### stkdeRoute

**Purpose:** Enable/disable dedicated `/stkde` exploration route

**Implementation:** `src/lib/feature-flags.ts`

**Usage:**
```typescript
const isStkdeRouteEnabled = useFeatureFlagsStore((state) => state.isEnabled('stkdeRoute'));
```

## Environment Configuration

### STKDE_QA_FULL_POP_ENABLED

**Purpose:** Control availability of full-population compute mode

**Values:**
- `true` (default) - Full population mode enabled
- `false` / `0` / `no` / `off` - Full population mode disabled, falls back to sampled

**Location:** `src/app/api/stkde/hotspots/route.ts`

---

*Integration audit: 2026-03-30*
