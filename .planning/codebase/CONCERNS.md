# Codebase Concerns: KDE / STKDE Functionality

**Analysis Date:** 2026-05-06

## KDE Computation Architecture

### Core Computation Files

**`src/lib/stkde/compute.ts`** — Main KDE computation
- `computeStkdeFromCrimes()` (line 236): Entry point for sampled crime data
- `computeStkdeFromAggregates()` (line 363): Entry point for full-population DuckDB aggregation
- `buildStkdeGridConfig()` (line 42): Builds spatial grid configuration
- `buildIntensityFromSupport()` (line 115): Applies Gaussian kernel smoothing over support counts
- `computePeakWindow()` (line 80): Finds densest temporal window within a cell
- `computePeakWindowFromBuckets()` (line 185): Bucket-based peak window for aggregated data

**`src/lib/stkde/full-population-pipeline.ts`** — DuckDB-based full population
- `buildFullPopulationStkdeInputs()` (line 89): Chunks through crime table, aggregates by grid cell + temporal bucket
- Produces `FullPopulationStkdeInputs` with `cellSupport` (Float64Array) and `cellTemporalBuckets` (Map)
- Uses `temporalBandwidthHours * 3600` as bucket size for temporal aggregation

**`src/lib/stkde/contracts.ts`** — Request/response types
- `StkdeRequest`, `StkdeResponse`, `StkdeHotspot`, `StkdeHeatmapCell` types
- `validateAndNormalizeStkdeRequest()` (line 141): Request validation with clamping

### API Route

**`src/app/api/stkde/hotspots/route.ts`** — POST handler
- Chooses `sampled` vs `full-population` mode
- `buildFullPopulationStkdeInputs()` → `computeStkdeFromAggregates()` OR
- `queryCrimesInRange()` → `computeStkdeFromCrimes()`
- Returns `StkdeResponse` with `heatmap.cells` and `hotspots[]`

### Worker

**`src/workers/stkdeHotspot.worker.ts`** — Client-side hotspot filtering
- `projectHotspots()` (line 28): Filters hotspots by intensity, support, temporal window, spatial bbox
- Used by `StkdeRouteShell` and `useDashboardStkde` for interactive filtering

### Stores

**`src/store/useStkdeStore.ts`** — Core state
- `response: StkdeResponse | null`
- `params: StkdeParams` (spatialBW, temporalBW, gridCell, topK, minSupport, timeWindow)
- `scopeMode: 'applied-slices' | 'full-viewport'`
- `spatialFilter`, `temporalFilter` for worker-based filtering
- `selectedHotspotId`, `hoveredHotspotId`

**`src/store/useDashboardDemoAnalysisStore.ts`** — Demo state
- `stkdeResponse`, `stkdeParams`, `stkdeScopeMode` for dashboard demo

### Rendering

**`src/components/map/MapStkdeHeatmapLayer.tsx`** — MapLibre heatmap rendering
- Uses MapLibre `heatmap` layer type
- `heatmap-weight` from `intensity`, `heatmap-radius` interpolated by zoom
- Color gradient: blue(0) → cyan(0.2) → green(0.4) → yellow(0.6) → orange(0.8) → red(1)
- Active hotspot rendered as circle layer

**`src/app/stkde/lib/StkdeRouteShell.tsx`** — STKDE QA page
- Fetches `/api/stkde/hotspots` directly, stores response in local state
- Passes `response.heatmap.cells` to `MapStkdeHeatmapLayer`

---

## Data Flow

```
User Action → Store params → API POST /api/stkde/hotspots
    → computeStkdeFromCrimes() OR buildFullPopulationStkdeInputs() + computeStkdeFromAggregates()
    → StkdeResponse { heatmap.cells[], hotspots[] }
    → MapStkdeHeatmapLayer renders heatmap via MapLibre
    → stkdeHotspot.worker filters hotspots client-side
```

**Sampled path:** Crime records loaded via `queryCrimesInRange()` → `computeStkdeFromCrimes()` filters by domain/bbox/types, builds grid, applies Gaussian kernel.

**Full-population path:** DuckDB aggregates crimes into grid cells with temporal buckets → `computeStkdeFromAggregates()` applies kernel to pre-aggregated support counts.

---

## Whether KDE Can Be Computed Per Time Slice

**Current answer: NO — KDE is computed over the entire domain once.**

### What Exists

1. **Temporal filtering at display level only**: `stkdeHotspot.worker.ts` (line 37-39) can filter hotspots by a `temporalWindow` — but this is post-computation filtering, NOT per-slice KDE computation.

2. **`timeWindowHours` parameter**: The algorithm finds the peak temporal window within each grid cell (line 305, 401). This identifies WHEN密度 is highest inside each cell, but doesn't produce separate density surfaces per slice.

3. **Applied-slices scope mode** in `useDashboardStkde` (line 202-216): When `scopeMode === 'applied-slices'`, the `startEpochSec` and `endEpochSec` sent to the API are derived from the union of all applied slice ranges. The KDE is computed once over the combined range — not once per slice.

### What's Missing for "KDE Per Slice"

1. **No loop over slices in compute layer**: Neither `computeStkdeFromCrimes` nor `computeStkdeFromAggregates` accepts an array of time ranges. They take a single `domain: { startEpochSec, endEpochSec }`.

2. **No per-slice density accumulation**: The heatmap cells contain a single `intensity` and `support` value. There is no mechanism to produce N separate heatmaps for N slices.

3. **No slice-aware rendering layer**: `MapStkdeHeatmapLayer` renders a single GeoJSON FeatureCollection. There's no concept of rendering multiple overlapping heatmaps keyed by time slice, or toggling visibility per slice.

4. **No slice-ID tracking through computation**: Crime records have timestamps but the compute functions don't track which slice each crime belongs to — they just filter by domain bounds.

5. **`full-population-pipeline.ts` is single-domain only**: The DuckDB aggregation groups by `(col_idx, row_idx, bucket_start)` where `bucket_start = FLOOR(ts / bucketSizeSec) * bucketSizeSec`. This produces temporal buckets, but they're used only for peak window detection per cell — not for per-slice surfaces.

---

## Rendering Approach for Density Layers

**Current: MapLibre native heatmap layer**

`MapStkdeHeatmapLayer.tsx` uses `react-map-gl/maplibre`:
- Source type: `geojson` with Point features, properties `{ intensity, support }`
- Layer type: `heatmap` with paint properties
- Zoom-adaptive radius: 10px @ zoom 8 → 35px @ zoom 15
- Opacity: 0.85 default

**What is NOT available:**
- No WebGL custom shader rendering for density (contrast with `src/components/viz/shaders/heatmap.ts` which exists but appears to be unused for STKDE)
- No deck.gl HeatmapLayer or other WebGL-based density rendering
- No time-animation of density surfaces

---

## What's Missing for "KDE Per Slice"

| Gap | File(s) | Impact |
|-----|---------|--------|
| Multi-domain compute | `src/lib/stkde/compute.ts` | Must refactor `computeStkdeFromCrimes`/`computeStkdeFromAggregates` to accept `domains: TimeSlice[]` and produce per-slice results |
| Per-slice aggregation | `src/lib/stkde/full-population-pipeline.ts` | Must track which slice each aggregate bucket belongs to, or compute separate aggregations per slice |
| Slice-keyed response | `src/lib/stkde/contracts.ts` | `StkdeResponse` must be extended to `{ slices: { sliceId: string, cells: StkdeHeatmapCell[], hotspots: StkdeHotspot[] }[] }` |
| Multi-heatmap rendering | `src/components/map/MapStkdeHeatmapLayer.tsx` | Must support rendering multiple heatmap layers with per-slice visibility toggles |
| Slice selection binding | `src/components/stkde/DashboardStkdePanel.tsx` | Must show per-slice density results, not a single merged result |
| Time-animation | None | No component animates density over time slices |
| Worker support for per-slice hotspots | `src/workers/stkdeHotspot.worker.ts` | Currently operates on flat hotspot array — needs slice-aware filtering |

---

## Tech Debt

**Temporal bucket resolution hardcoded to `temporalBandwidthHours * 3600`**: `full-population-pipeline.ts` line 113. If you want finer temporal resolution per slice, this bucket size limits you.

**Hotspot peak window is post-hoc**: `computePeakWindow`/`computePeakWindowFromBuckets` finds the densest window AFTER building the spatial surface. There's no way to pre-filter crimes to a specific slice before KDE computation.

**No coordinate normalization pipeline for STKDE input**: Contrast with `src/lib/coordinate-normalization.ts` which normalizes crime coordinates (x, z) alongside (lon, lat). STKDE compute uses raw `lon/lat` directly.

**Worker timeout hardcoded at 8000ms**: `useDashboardStkde.ts` line 24. Long hotspot lists may hit this limit silently.

---

*Concerns audit: 2026-05-06*
