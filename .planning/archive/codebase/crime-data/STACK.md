# Crime Data Technology Stack

**Analysis Date:** 2026-03-30

## Data Storage

**Primary Database:**
- DuckDB (embedded columnar OLAP engine)
- Cache path: `data/cache/crime.duckdb` (configurable via `DUCKDB_PATH` env var)
- Client: Native `duckdb` Node.js bindings (direct `db.all()` / `db.run()` callbacks)

**Source Data:**
- CSV file: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
- ~8.5M rows, Chicago crime records 2001–2026
- Also referenced: `data/crime.parquet` (used by facets API at `src/app/api/crime/facets/route.ts`)

**Sorted Table:**
- `crimes_sorted` — materialized view ordered by `"Date"` for DuckDB zone-map optimization
- Created lazily via `ensureSortedCrimesTable()` in `src/lib/db.ts`

**Adaptive Cache:**
- `adaptive_global_cache` — DuckDB table caching pre-computed density/burstiness/warp maps
- Cache key format: `global:{binCount}:{kernelWidth}:{binningMode}`
- Schema defined in `src/lib/queries/aggregations.ts`

## Mock Data Fallback

**Trigger:**
- `USE_MOCK_DATA` or `DISABLE_DUCKDB` env vars (defaults to `true` when unset)
- Checked via `isMockDataEnabled()` in `src/lib/db.ts`

**Mock Generators:**
- `generateMockCrimes()` in `src/app/api/crimes/range/route.ts` — simple uniform random within Chicago bounds
- `generateMockCrimeRecords()` in `src/lib/queries.ts` — advanced generator with spatial hotspots, temporal peaks, and type-weighted crime distribution
- `generateMockBins()` in `src/app/api/crime/bins/route.ts`
- Static `MOCK_FACETS` and `MOCK_METADATA` constants in facets/meta routes

## Key Crime Data Types

**Canonical Record** (`src/types/crime.ts`):
```typescript
interface CrimeRecord {
  id?: string
  timestamp: number    // Unix epoch seconds
  lat: number
  lon: number
  x: number           // Normalized [-50, +50]
  z: number           // Normalized [-50, +50]
  type: string        // e.g. "THEFT", "BATTERY"
  district: string
  year: number
  iucr: string        // IUCR code
}
```

**Duplicate type definition** in `src/lib/queries/types.ts` — same `CrimeRecord` shape without `id`.

**Legacy type** in `src/types/index.ts`:
```typescript
interface CrimeEvent { id, type, x, y, z, timestamp, district?, districtId?, block? }
interface ColumnarData { x: Float32Array, z: Float32Array, timestamp: Float32Array, ... }
```

## Coordinate Normalization

**Module:** `src/lib/coordinate-normalization.ts`

- Chicago bounds: `lon [-87.9, -87.5]`, `lat [41.6, 42.1]`
- Normalized range: `[-50, +50]` (100-unit span)
- Functions: `lonLatToNormalized()`, `normalizedToLonLat()`, `buildNormalizedSqlExpression()`

## STKDE Hotspot Engine

**Contracts:** `src/lib/stkde/contracts.ts` — request/response types, validation, coercion ranges

**Compute:** `src/lib/stkde/compute.ts` — spatial kernel density estimation over a grid
- `computeStkdeFromCrimes()` — sampled mode (fetches raw crime records)
- `computeStkdeFromAggregates()` — full-population mode (pre-aggregated buckets)

**Full Population Pipeline:** `src/lib/stkde/full-population-pipeline.ts`
- Server-side DuckDB aggregation to avoid fetching millions of rows
- Chunked query with configurable chunk size (default 20k rows)
- Produces `FullPopulationStkdeInputs` with `cellSupport` Float64Array and temporal bucket maps

**Worker:** `src/workers/stkdeHotspot.worker.ts`
- Client-side hotspot filtering/projection (intensity, support, temporal, spatial bounds)
- Runs in Web Worker with fallback to synchronous execution

## State Management

**Zustand Store:** `src/store/useStkdeStore.ts`
- STKDE params (spatial bandwidth, temporal bandwidth, grid cell size, topK, minSupport, time window)
- Run lifecycle: idle → running → success/error/cancelled
- Hotspot selection (selected ID, hovered ID)
- Spatial/temporal filters
- Stale detection for applied-slice changes

## Dependencies

**Core:**
- `duckdb` — embedded database engine
- `zustand` — client state management
- `@tanstack/react-query` — server state/caching (used by `useCrimeData` hook)

**Runtime:**
- Next.js (API routes use `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`)

---

*Stack analysis: 2026-03-30*
