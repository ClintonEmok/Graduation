# Crime Data Sources & Integrations

**Analysis Date:** 2026-03-30

## Primary Data Source

**Chicago Police Department Open Data:**
- File: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
- ~8.5 million crime records, 2001–2026
- Columns (inferred from SQL queries):
  - `"Date"` — Timestamp (auto-parsed by DuckDB `read_csv_auto`)
  - `"Primary Type"` — Crime category string
  - `"Latitude"` / `"Longitude"` — Coordinates
  - `"District"` — Police district number
  - `"IUCR"` — Illinois Uniform Crime Reporting code
  - `"Year"` — Extracted year
- Loaded via DuckDB `read_csv_auto()` in `src/lib/db.ts`
- Sorted into `crimes_sorted` table for zone-map optimization

**Parquet Alternative:**
- `data/crime.parquet` — Used by `/api/crime/facets` endpoint
- Column discovery via runtime introspection (`SELECT * LIMIT 1`)
- Supports flexible column names: `Primary Type` or `primary_type` or `type`

## Database Integration

**DuckDB:**
- Connection: `src/lib/db.ts` — `getDb()` lazy-initializes a `duckdb.Database` instance
- Path: `data/cache/crime.duckdb` (configurable via `DUCKDB_PATH` env var)
- Runtime: Node.js only (`export const runtime = 'nodejs'`)
- Table creation: `ensureSortedCrimesTable()` creates `crimes_sorted` from CSV on first access
- Callback API: All queries use `db.all(sql, ...params, callback)` wrapped in Promises

**Cache Layer:**
- `adaptive_global_cache` — DuckDB table for pre-computed density maps
- Read-through pattern: check cache → compute if miss → persist result
- Cache key: `global:{binCount}:{kernelWidth}:{binningMode}`

## API Endpoints (Internal)

**Crime Data:**
| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/api/crimes/range` | GET | Viewport-filtered crime records | `src/app/api/crimes/range/route.ts` |
| `/api/crime/meta` | GET | Dataset metadata (time range, bounds, types) | `src/app/api/crime/meta/route.ts` |
| `/api/crime/facets` | GET | Type/district aggregation counts | `src/app/api/crime/facets/route.ts` |
| `/api/crime/bins` | GET | Spatial density bins (3D grid) | `src/app/api/crime/bins/route.ts` |
| `/api/crime/stream` | GET | Streaming crime data | `src/app/api/crime/stream/route.ts` |

**STKDE Hotspots:**
| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/api/stkde/hotspots` | POST | Compute spatiotemporal kernel density hotspots | `src/app/api/stkde/hotspots/route.ts` |

**Other:**
| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/api/adaptive/global` | GET | Global adaptive density maps | `src/app/api/adaptive/global/route.ts` |
| `/api/neighbourhood/poi` | GET | Points of interest | `src/app/api/neighbourhood/poi/route.ts` |
| `/api/study/log` | POST | Study event logging | `src/app/api/study/log/route.ts` |

## Client-Side Integration

**useCrimeData Hook:**
- File: `src/hooks/useCrimeData.ts` (implied from test file at `src/hooks/useCrimeData.test.ts`)
- Uses `@tanstack/react-query` for caching
- Calls `/api/crimes/range` with viewport params
- Supports `bufferDays`, `crimeTypes`, `districts`, `limit` options
- Returns `{ data, meta, isLoading, isFetching, error, bufferedRange }`

**useDashboardStkde Hook:**
- File: `src/app/dashboard-v2/hooks/useDashboardStkde.ts`
- Calls `POST /api/stkde/hotspots` with computed request body
- Uses AbortController for cancellation
- Client-side response size guard (truncates heatmap cells if >2.5MB)
- Web Worker for hotspot projection/fallback

**STKDE Worker:**
- File: `src/workers/stkdeHotspot.worker.ts`
- Filters hotspots by intensity, support, temporal window, spatial bbox
- Runs in Web Worker with 8-second timeout fallback to synchronous execution

## Environment Configuration

**Required env vars:** None (mock data is default)

**Optional env vars:**
| Variable | Purpose | Default |
|----------|---------|---------|
| `USE_MOCK_DATA` | Enable mock data mode | `true` (when unset) |
| `DISABLE_DUCKDB` | Alias for USE_MOCK_DATA | `true` (when unset) |
| `DUCKDB_PATH` | DuckDB file path | `data/cache/crime.duckdb` |
| `STKDE_QA_FULL_POP_ENABLED` | Enable full-population STKDE | `true` |

**Mock data values:** `1`, `true`, `yes`, `on` → mock enabled; `0`, `false`, `no`, `off` → real data.

## Data Flow

1. **Client** calls `/api/crimes/range?startEpoch=...&endEpoch=...`
2. **API route** checks `isMockDataEnabled()`:
   - If true: returns `generateMockCrimes()` output with `isMock: true` meta
   - If false: queries DuckDB via `queryCrimesInRange()` → `queryCrimesInRange()` facade → `buildCrimesInRangeQuery()` SQL builder
3. **Response** includes `data: CrimeRecord[]` and `meta` with viewport, buffer, sampling info

**STKDE flow:**
1. **Client hook** builds request body from viewport/slices/filters
2. **POST /api/stkde/hotspots** validates via `validateAndNormalizeStkdeRequest()`
3. **Route** decides compute mode (full-population or sampled) with guardrail fallbacks
4. **Compute** produces `StkdeResponse` with heatmap cells and ranked hotspots
5. **Client** applies response size guard, then projects hotspots via Web Worker

---

*Integration audit: 2026-03-30*
