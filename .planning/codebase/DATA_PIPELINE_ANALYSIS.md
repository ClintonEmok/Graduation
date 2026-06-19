# Data Pipeline Analysis — Contextual Data Integration Points

**Analysis Date:** 2026-06-08

## Purpose

This document maps the complete data pipeline from source CSV through DuckDB, API routes, stores, and components. It identifies where contextual data (weather, public holidays) could be integrated and the patterns to follow.

---

## 1. Source Data Schema

### Crime CSV: `data/sources/Crimes_-_2001_to_Present_20260114.csv`

~8.5M records, 22 columns. The CSV is **not loaded into a persistent DuckDB schema** — instead, it's queried dynamically via `read_csv_auto()`.

| Column Name | Type | Used In Queries | Notes |
|---|---|---|---|
| `ID` | Integer | No | Not used in any query |
| `Case Number` | String | No | Not used |
| `Date` | String (parsed as TIMESTAMP) | **Yes** | Format: `MM/DD/YYYY hh:mm:ss A`. Extracted via `EXTRACT(EPOCH FROM "Date")` |
| `Block` | String | No | Address block (e.g. "013XX W 91ST ST") |
| `IUCR` | String | Yes | Crime classification code |
| `Primary Type` | String | **Yes** | Crime category (THEFT, BATTERY, etc.) |
| `Description` | String | No | Sub-type description |
| `Location Description` | String | No | E.g. APARTMENT, STREET, etc. |
| `Arrest` | Boolean | No | Whether an arrest was made |
| `Domestic` | Boolean | No | Whether domestic-related |
| `Beat` | Integer | No | Police beat |
| `District` | String (parsed as int) | **Yes** | Police district (1-25) |
| `Ward` | Integer | No | City ward |
| `Community Area` | Integer | No | Chicago community area |
| `FBI Code` | String | No | FBI classification |
| `X Coordinate` | Integer | No | State plane X |
| `Y Coordinate` | Integer | No | State plane Y |
| `Year` | Integer | Yes | Extracted year |
| `Updated On` | Timestamp | No | Last update |
| `Latitude` | Double | **Yes** | Geographic latitude |
| `Longitude` | Double | **Yes** | Geographic longitude |
| `Location` | String | No | `(lat, lon)` pair |

**Canonical type** — `src/types/crime.ts`:

```typescript
export interface CrimeRecord {
  id?: string
  timestamp: number    // Unix epoch seconds
  lat: number
  lon: number
  x: number            // Normalized -50..+50
  z: number            // Normalized -50..+50
  type: string         // Primary Type
  district: string
  year: number
  iucr: string
}
```

**Columnar format** — `src/types/data.ts`:

```typescript
export interface ColumnarData {
  x: Float32Array
  z: Float32Array
  lat?: Float32Array
  lon?: Float32Array
  timestampSec: Float64Array  // Raw epoch seconds
  timestamp: Float32Array     // Normalized 0-100
  type: Uint8Array            // Mapped to ID via category-maps.ts
  district: Uint8Array
  block: string[]
  length: number
}
```

### DuckDB Tables

Two tables are managed in `data/cache/crime.duckdb`:

1. **`crimes_sorted`** — Created by `src/lib/db.ts::ensureSortedCrimesTable()`. A sorted copy of the CSV ordered by `Date` for zone map optimization. Created once and reused.

2. **`adaptive_global_cache`** — Created by `src/lib/queries.ts::buildGlobalAdaptiveCacheQueries()`. Stores precomputed density/burstiness/warp maps keyed by `cache_key` (e.g., `global:512:3:uniform-time`).

---

## 2. API Route Layer

### Route Map

| Route | File | Purpose | Response Format |
|---|---|---|---|
| `/api/crime/meta` | `src/app/api/crime/meta/route.ts` | Time range, bounds, crime types, count | JSON |
| `/api/crime/stream` | `src/app/api/crime/stream/route.ts` | Streaming Arrow IPC | Apache Arrow IPC (binary) |
| `/api/crime/overview` | `src/app/api/crime/overview/route.ts` | Downsampled timestamps | JSON |
| `/api/crime/facets` | `src/app/api/crime/facets/route.ts` | Type/district counts | JSON |
| `/api/crime/stats-summary` | `src/app/api/crime/stats-summary/route.ts` | Hour/day/month aggregations | JSON |
| `/api/crime/bins` | `src/app/api/crime/bins/route.ts` | 3D density bins | JSON |
| `/api/crimes/range` | `src/app/api/crimes/range/route.ts` | **Main viewport data** | JSON `{ data, meta }` |
| `/api/adaptive/global` | `src/app/api/adaptive/global/route.ts` | Precomputed time density maps | JSON (arrays serialized from Float32Array) |
| `/api/adaptive/bursts` | `src/app/api/adaptive/bursts/` | Burst detection | JSON |
| `/api/stkde/hotspots` | `src/app/api/stkde/hotspots/route.ts` | STKDE hotspot computation | JSON |
| `/api/neighbourhood/poi` | `src/app/api/neighbourhood/poi/route.ts` | POI enrichment (OSM + Chicago) | JSON |
| `/api/study/log` | `src/app/api/study/log/route.ts` | Study session logging | JSON |

### Query Flow: `/api/crimes/range` (Main Endpoint)

1. Client calls `useCrimeData()` hook with `{ startEpoch, endEpoch, crimeTypes?, districts?, bufferDays, limit }`
2. Hook builds URL query params and fires TanStack Query
3. API route in `src/app/api/crimes/range/route.ts`:
   - Parses `startEpoch`, `endEpoch`, optional `bufferDays` (default 30), `crimeTypes`, `districts`
   - Applies buffer: `bufferedStart = startEpoch - bufferDays * 86400`
   - Calls `queryCrimeCount()` for total matching count → determines `sampleStride` (ceil(total/limit) if over limit)
   - Calls `queryCrimesInRange()` → executes DuckDB query via `buildCrimesInRangeQuery()`
   - Returns `{ data: CrimeRecord[], meta: {...} }`
4. **Fallback**: If `USE_MOCK_DATA=true` or DuckDB unavailable, returns generated mock data with `X-Data-Warning` header

### DuckDB Query Pattern (from `src/lib/queries/builders.ts`)

```sql
SELECT
  EXTRACT(EPOCH FROM "Date") as timestamp,
  "Primary Type" as type,
  "Latitude" as lat,
  "Longitude" as lon,
  -- Normalized coordinates:
  (((("Longitude" - (-87.9)) / 0.4) * 100) + -50) as x,
  (((("Latitude" - 41.6) / 0.5) * 100) + -50) as z,
  "IUCR" as iucr,
  "District" as district,
  EXTRACT(YEAR FROM "Date") as year
FROM crimes_sorted
WHERE "Date" IS NOT NULL
  AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
  AND EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?
  AND "Primary Type" IN (?, ?, ...)
  AND "District" IN (?, ?, ...)
LIMIT ?
```

### Time Filtering Patterns

All time filtering uses **Unix epoch seconds** extracted from the `Date` column:
- `EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?`

Normalized 0-100 values are computed client-side in `src/lib/time-domain.ts`:
```typescript
export const epochSecondsToNormalized = (epochSeconds, minEpochSeconds, maxEpochSeconds) => {
  const span = maxEpochSeconds - minEpochSeconds || 1;
  return ((epochSeconds - minEpochSeconds) / span) * 100;
};
```

---

## 3. Store Layer

### Key Stores and Their Data Shapes

| Store | File | Key Data | Source |
|---|---|---|---|
| `useTimelineDataStore` | `src/store/useTimelineDataStore.ts` | `ColumnarData` (typed arrays), `overviewTimestampSec[]`, `minTimestampSec`/`maxTimestampSec` | `/api/crime/meta` + `/api/crime/stream` |
| `useTimeStore` | `src/store/useTimeStore.ts` | `currentTime` (0-100), `timeRange [0,100]`, `timeResolution`, `isPlaying` | User interaction |
| `useFilterStore` | `src/store/useFilterStore.ts` | `selectedTypes[]` (IDs), `selectedDistricts[]` (IDs), `selectedTimeRange [epoch,epoch]`, `selectedSpatialBounds` | User interaction |
| `useCoordinationStore` | `src/store/useCoordinationStore.ts` | `selectedIndex`, `brushRange`, `selectedBurstWindows[]`, `workflowPhase`, `syncStatus` | Cross-panel sync |
| `useAdaptiveStore` | `src/store/useAdaptiveStore.ts` | `densityMap`, `burstinessMap`, `warpMap`, `countMap` (Float32Array), `warpFactor`, `mapDomain` | `/api/adaptive/global` or web worker |
| `useAggregationStore` | `src/store/useAggregationStore.ts` | `bins[]` (density bin array), `lodFactor`, `gridResolution` | `/api/crime/bins` |
| `useStatsStore` | `src/store/useStatsStore.ts` | `selectedDistricts[]`, `timeRange { startEpoch, endEpoch }` | User interaction |
| `useStkdeStore` | `src/store/useStkdeStore.ts` | `params` (bandwidth etc), `response` (hotspot results), `spatialFilter`, `temporalFilter` | `/api/stkde/hotspots` |

### Data Flow: CSV to ColumnarData

```
CSV file
  ↓ (read_csv_auto)
DuckDB (crimes_sorted table)
  ↓ (SQL via API route)
API Response (JSON or Arrow IPC)
  ↓ (parsing in store)
ColumnarData (typed arrays for GPU-efficient rendering)
  ↓ (selectors derived)
FilteredPoint[] (for 3D view, map view, timeline)
```

---

## 4. Existing Enrichment Patterns

### Neighbourhood / POI Enrichment (`src/lib/neighbourhood/`)

The **only existing enrichment** pattern. Key characteristics:

1. **Separate data source**: OSM Overpass API + Chicago Data Portal (not DuckDB)
2. **Separate API route**: `/api/neighbourhood/poi` with `GET?minLat&maxLat&minLon&maxLon`
3. **In-memory cache**: `Map` with 24-hour TTL in the route handler
4. **Separate types**: `src/lib/neighbourhood/types.ts` (GeoBounds, OSMPOIResult, ChicagoBusiness, etc.)
5. **Client-side consumer**: Called independently, not merged into crime data
6. **Result shape**: `{ status: 'available'|'missing', poiCounts, totalPOIs, summary, topCategories }`

### Context Extractor (`src/hooks/useContextExtractor.ts`)

Extracts current filter state (crime types, districts, time range) into a serializable `FilterContext`. Used for generating cache signatures for suggestion generation. Not currently connected to any enrichment.

### Context Diagnostics (`src/lib/context-diagnostics/spatial.ts`)

Builds hotspot summaries from arrays of `CrimeRecord` objects. Used for generating human-readable spatial summaries. A pattern that could be extended for weather/holiday context.

---

## 5. Where Weather/Holiday Data Could Be Injected

### Primary Integration Points (by priority)

#### A. API-Level Join (Strongest Pattern Match)

**Route pattern to follow**: `/api/crime/stats-summary` or `/api/crime/facets`

Weather and holiday data would be most naturally injected at the **API route layer**, where it can be joined with crime data before returning to the client.

Recommended new route: `/api/crime/context` with params:
```
GET /api/crime/context?startEpoch=...&endEpoch=...&lat=41.88&lon=-87.63
```

This would return:
```json
{
  "weather": { "conditions": "Cloudy", "temp": 45, "precipitation": 0.2 },
  "holidays": [{ "name": "Christmas Day", "date": "2024-12-25" }],
  "isWeekend": false,
  "season": "winter"
}
```

**Alternative**: Add context fields to the existing `/api/crime/facets` response or create a new `/api/crime/context` endpoint that the stats page can query alongside crime data.

#### B. Store-Level Enrichment (Client Merge)

A new store (e.g., `useContextStore` or extended `useFilterStore`) could hold weather/holiday data fetched from the API, mapped by date. This would allow:
- Components to display contextual overlays on the timeline
- The adaptive timeline to consider external factors
- Filter presets to include contextual conditions

```typescript
// New store shape
interface ContextData {
  dateMap: Map<number, DayContext>  // epoch day -> weather/holiday
  isLoading: boolean
}

interface DayContext {
  date: string          // YYYY-MM-DD
  weather?: {
    tempHigh: number
    tempLow: number
    condition: string   // Sunny, Rain, Snow, etc.
    precipitation: number
  }
  holidays?: { name: string; type: 'federal' | 'state' | 'school' }[]
  isWeekend: boolean
  season: 'spring' | 'summer' | 'fall' | 'winter'
}
```

#### C. DuckDB-Level Join (Requires Data Import)

If weather/holiday data is available as CSV or API, it could be imported into DuckDB as a separate table and **joined on date**:

```sql
-- Hypothetical weather table
CREATE TABLE weather_daily AS SELECT * FROM read_csv_auto('data/sources/weather.csv');

-- JOIN query pattern
SELECT c.*, w.temp_high, w.condition, h.name as holiday
FROM crimes_sorted c
LEFT JOIN weather_daily w ON DATE_TRUNC('day', c."Date") = w.date
LEFT JOIN holidays h ON DATE_TRUNC('day', c."Date") = h.date
WHERE EXTRACT(EPOCH FROM c."Date") >= ? AND EXTRACT(EPOCH FROM c."Date") <= ?
```

**This would be the most powerful approach** but requires:
1. Downloading historical weather data for Chicago (e.g., NOAA GSOD or OpenWeatherMap archives)
2. Creating a `holidays` CSV with date + holiday name
3. Importing both into DuckDB or reading via `read_csv_auto`
4. Modifying `buildCrimeRangeFilters()` in `src/lib/queries/filters.ts` to support join

#### D. Web Worker Integration

The adaptive time computation web worker (`src/workers/adaptiveTime.worker.ts`) could receive contextual weights alongside crime timestamps, allowing it to factor holidays/weekends into burst detection and scaling.

---

## 6. Concrete Recommendations

### Recommended Approach: Hybrid (A + B + eventual C)

**Phase 1 — API + Store (1-2 days)**
1. Create `data/sources/US_Holidays_2001-2026.csv` with columns: `date, name, type`
2. Create `/api/crime/context` route that reads the holidays CSV via DuckDB and returns date-keyed context
3. Create `useContextStore` in `src/store/useContextStore.ts` following the `useNeighbourhoodStore` pattern
4. Add a `ContextBar` component to the dashboard that shows holidays/weather on the timeline

**Phase 2 — DuckDB Join (2-3 days)**
1. Download historical weather for Chicago (NOAA GSOD station USW00094846)
2. Create `data/sources/weather_daily.csv` with columns: `date, temp_high, temp_low, precip, condition`
3. Modify `buildCrimeRangeFilters()` in `src/lib/queries/filters.ts` to accept optional `enrich: boolean` parameter
4. Add LEFT JOIN to holiday/weather tables in the main crime queries
5. Extend `CrimeRecord` type with optional `weather` and `holiday` fields

**Phase 3 — Visualization (2-4 days)**
1. Timeline overlay showing holidays as vertical markers
2. Color-coding crime points on map/cube by weather condition
3. Filter by holiday/weather in the filter panel
4. Stats page showing crime-by-holiday and crime-by-weather breakdown

### Files That Would Need Changes

| File | Change |
|---|---|
| `src/types/crime.ts` | Add optional `weather?`, `holiday?` fields to `CrimeRecord` |
| `src/lib/queries/filters.ts` | Optionally JOIN enrichment tables |
| `src/lib/queries/builders.ts` | Conditionally add columns from joined tables |
| `src/lib/db.ts` | Optionally load enrichment tables on init |
| `src/lib/queries.ts` | New query functions for context data |
| `src/app/api/crime/context/route.ts` | **New** — context enrichment endpoint |
| `src/store/useContextStore.ts` | **New** — client-side context state |
| `src/hooks/useCrimeData.ts` | Optionally pass enrichment params |
| `src/components/dashboard/` | New visualization overlays |

### Patterns to Follow

1. **Mock fallback pattern**: Every API route has a mock data fallback. Context routes should follow the same `isMockDataEnabled()` + try/catch pattern.
2. **Error resilience**: Use `X-Data-Warning` headers for degraded data, never crash.
3. **Query sanitization**: Follow `src/lib/queries/sanitization.ts` patterns for all DuckDB queries.
4. **Columnar format for perf**: If joining at the store level, keep data in typed arrays (Float32Array/Uint8Array).
5. **Separate concerns**: Keep enrichment data separate from core crime data in types and stores — merge at the presentation layer.

---

*Analysis prepared for contextual data integration planning.*
