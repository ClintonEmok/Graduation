# Data Layer Integrations

**Analysis Date:** 2026-03-30

## Database Integration

### DuckDB

**Connection:**
- Direct file-based connection
- Database file: `data/cache/crime.duckdb`
- Configurable via `DUCKDB_PATH` environment variable

**Client:**
- `duckdb` npm package v1.4.4
- Called directly in `src/lib/db.ts`

**Mock Data:**
- Enabled by default (controlled by `USE_MOCK_DATA` or `DISABLE_DUCKDB`)
- Mock data generation in `src/lib/queries.ts` and API routes

**Table Optimization:**
- `crimes_sorted` table created with zone map optimization
- Sorted by Date column for efficient range queries
- Lazy initialization via `ensureSortedCrimesTable()`

### Data Source

**CSV File:**
- Location: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
- ~8.5 million rows
- Columns: Date, Primary Type, Description, Location Description, Arrest, Domestic, Beat, District, Ward, Community Area, FBI Code, X Coordinate, Y Coordinate, etc.

## API Endpoints

### Crime Data

**`/api/crimes/range`**
- Viewport-based crime data fetching
- Parameters: startEpoch, endEpoch, bufferDays, crimeTypes, districts, limit
- Response: `{ data: CrimeRecord[], meta: CrimeDataMeta }`
- Location: `src/app/api/crimes/range/route.ts`

**`/api/crime/stream`**
- Streaming data via Apache Arrow
- Uses `RecordBatchReader` from apache-arrow
- Location: `src/app/api/crime/stream/route.ts`

**`/api/crime/facets`**
- Crime type and district aggregations

**`/api/crime/meta`**
- Dataset metadata

**`/api/crime/bins`**
- Density binning for visualization

### Spatial Analysis

**`/api/stkde/hotspots`**
- Space-Time Kernel Density Estimation
- POST endpoint with request body validation
- Supports sampled and full-population modes
- Location: `src/app/api/stkde/hotspots/route.ts`

### Adaptive Data

**`/api/adaptive/global`**
- Global adaptive scale data
- Used by `useAdaptiveStore`

### Points of Interest

**`/api/neighbourhood/poi`**
- Neighborhood POI data

## Client-Server Communication

### Fetch Pattern

- Standard `fetch` API
- URL query parameters for GET requests
- JSON request/response bodies for POST

### Caching Headers

```typescript
{
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'X-Content-Type-Options': 'nosniff'
}
```

### Response Metadata

API responses include:
- `viewport` - Requested viewport range
- `buffer` - Applied buffer (days and actual range)
- `returned` - Number of records returned
- `limit` - Request limit
- `totalMatches` - Total matching records
- `sampled` - Whether sampling was applied
- `sampleStride` - Sampling stride if sampled

## Data Transformation

### Server-Side

- Coordinate normalization (lat/lon → x/z)
- Timestamp conversion (Date → Unix epoch)
- Type categorization
- District mapping

### Client-Side

- Columnar data conversion for visualization
- Filter application
- Density computation
- Adaptive scaling

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA` - Enable mock data (default: true)
- `DUCKDB_PATH` - Optional custom DuckDB path

**Optional env vars:**
- `STKDE_QA_FULL_POP_ENABLED` - Enable full population STKDE
- `STKDE_QA_FULL_POP_MAX_SPAN_DAYS` - Max span for full population

---

*Integration audit: 2026-03-30*
