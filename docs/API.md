<!-- generated-by: gsd-doc-writer -->

# API

**Quiet Tiger** exposes Next.js Route Handlers under `src/app/api/` for streaming crime data, computing statistical summaries, performing STKDE hotspot detection, and retrieving neighbourhood Points of Interest (POI). All endpoints use JSON responses except the crime stream, which uses Apache Arrow IPC format.

---

## Authentication

The API does not require authentication. All endpoints are publicly accessible. This is an internal prototype — no auth middleware is configured.

---

## Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `GET` | `/api/crime/stream` | Stream raw crime records as Apache Arrow IPC | No |
| `GET` | `/api/crime/bins` | Aggregated 3D space-time bins for cube visualization | No |
| `GET` | `/api/crime/meta` | Dataset metadata (time range, geo bounds, crime types) | No |
| `GET` | `/api/crime/overview` | Sampled timestamps for timeline overview | No |
| `GET` | `/api/crime/facets` | Faceted counts (types, districts) within a time range | No |
| `GET` | `/api/crime/stats-summary` | Statistical distributions (hourly, daily, monthly, by type, by district) | No |
| `GET` | `/api/crimes/range` | Viewport-based crime records with buffering and sampling | No |
| `GET` | `/api/adaptive/bursts` | Burst detection for a single time range | No |
| `POST` | `/api/adaptive/bursts` | Burst detection for multiple time partitions | No |
| `GET` | `/api/adaptive/global` | Global adaptive time-warp and density maps | No |
| `POST` | `/api/stkde/hotspots` | Space-time kernel density estimation | No |
| `GET` | `/api/neighbourhood/poi` | Neighbourhood POI data for a bounding box | No |
| `POST` | `/api/study/log` | Append log entries to a JSONL study session file | No |

---

## `GET /api/crime/stream`

Streams raw crime records as Apache Arrow IPC (streaming format). Used by the client to populate the space-time cube with normalized coordinates.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | number (epoch sec) | No | — | Start of date filter range |
| `endDate` | number (epoch sec) | No | — | End of date filter range |
| `crimeTypes` | string (comma-separated) | No | — | Filter by crime type(s) |
| `maxRows` | number | No | — | Maximum number of rows to return |

### Response

- **Content-Type:** `application/vnd.apache.arrow.stream`
- **Body:** Apache Arrow IPC stream of crime records

Each row contains:
- `timestamp` — Unix epoch seconds
- `type` — Crime category (e.g., `THEFT`, `BATTERY`)
- `lat`, `lon` — Geographic coordinates
- `x`, `z` — Normalized spatial coordinates (-50 to +50)
- `iucr` — IUCR code string
- `district` — Police district string
- `year` — Calendar year

### Headers

- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `X-Data-Warning` — Set to `Using demo data - database disabled` or `Using demo data - database unavailable` when DuckDB is not available

### Error Handling

On database error, returns mock data with `X-Data-Warning: Using demo data - database unavailable`, status 200 (graceful degradation).

---

## `GET /api/crime/bins`

Returns aggregated 3D space-time bins for the cube visualization. The grid resolution is configurable per axis.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resX` | number | No | `32` | Grid resolution on X axis |
| `resY` | number | No | `16` | Grid resolution on Y (time) axis |
| `resZ` | number | No | `32` | Grid resolution on Z axis |
| `types` | string (comma-separated) | No | — | Crime type filter |
| `districts` | string (comma-separated) | No | — | District filter |
| `startTime` | number (epoch sec) | No | — | Start of time range |
| `endTime` | number (epoch sec) | No | — | End of time range |

### Response

```json
{
  "bins": [
    {
      "x": 12.5,
      "y": 50.0,
      "z": -25.0,
      "count": 843,
      "dominantType": "THEFT"
    }
  ]
}
```

When using mock data, the response includes `"isMock": true`.

### Headers

- `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`
- `X-Data-Warning` — Set when using mock data

---

## `GET /api/crime/meta`

Returns dataset-level metadata including temporal range, spatial bounds, record count, and distinct crime types.

### Response

```json
{
  "minTime": 978307200,
  "maxTime": 1767571200,
  "minLat": 41.6,
  "maxLat": 42.1,
  "minLon": -87.9,
  "maxLon": -87.5,
  "count": 8500000,
  "crimeTypes": ["ASSAULT", "BATTERY", "BURGLARY", "CRIMINAL DAMAGE", "DECEPTIVE PRACTICE", ...],
  "yearRange": {
    "min": 2001,
    "max": 2026
  }
}
```

When using mock data, the response includes `"isMock": true`.

### Headers

- `X-Data-Warning` — Set when using mock data or dataset file not found

---

## `GET /api/crime/overview`

Returns sampled timestamps for the timeline overview chart. Uses `NTILE` sampling to return evenly spaced timestamps across the full dataset.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `maxPoints` | number | No | `TIMELINE_OVERVIEW_SAMPLE_MAX_POINTS` | Maximum number of sample points |

### Response

```json
{
  "timestampsSec": [978307200, 978310800, 978314400, ...]
}
```

### Headers

- `X-Data-Warning` — Set when using mock data

---

## `GET /api/crime/facets`

Returns faceted counts of crime types and districts within a given time range. Used for filter panels and aggregate summaries.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start` | number (epoch sec) | **Yes** | — | Start of time range |
| `end` | number (epoch sec) | **Yes** | — | End of time range |

### Response

```json
{
  "types": [
    { "name": "THEFT", "count": 2200 },
    { "name": "BATTERY", "count": 1800 }
  ],
  "districts": [
    { "name": "1", "count": 900 },
    { "name": "2", "count": 850 }
  ]
}
```

### Headers

- `Cache-Control: max-age=5, stale-while-revalidate=10`

### Error Responses

- **400 Bad Request** — Missing `start` or `end` parameters; invalid number format
  ```json
  { "error": "Missing required parameters: start and end" }
  ```

---

## `GET /api/crime/stats-summary`

Returns comprehensive statistical distributions (hourly, daily, monthly, by type, by district) and a computed temporal pulse series for a given time range.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startEpoch` | number (epoch sec) | **Yes** | — | Start of time range |
| `endEpoch` | number (epoch sec) | **Yes** | — | End of time range |
| `districts` | string (comma-separated numbers) | No | — | District ID filter |

### Response

```json
{
  "stats": {
    "total": 1000,
    "byDistrict": [{ "name": "1", "count": 200, "percentage": 20 }],
    "byType": [{ "name": "THEFT", "count": 240, "percentage": 24 }],
    "byHour": [0, 0, 0, 0, 0, 0, 0, 24, ...],
    "byDayOfWeek": [120, 130, 145, 160, 170, 170, 105],
    "byMonth": [80, 80, 80, 80, 80, 80, 120, 120, 80, 80, 80, 80],
    "peakHour": { "hour": 17, "count": 58 },
    "peakDay": { "day": 4, "count": 170, "label": "Thu" }
  },
  "summary": {
    "totalCrimes": 1000,
    "avgPerDay": 3,
    "peakHour": 17,
    "peakHourLabel": "5:00 PM",
    "mostCommonCrime": "THEFT",
    "mostCommonCrimeCount": 240,
    "districtCount": 25,
    "dateRange": "2024-01-01 - 2025-01-01"
  },
  "temporalPulses": [...]
}
```

### Error Responses

- **400 Bad Request** — Missing `startEpoch` or `endEpoch`; non-integer values; `startEpoch >= endEpoch`
  ```json
  { "error": "Missing required parameters: startEpoch and endEpoch are required" }
  ```

---

## `GET /api/crimes/range`

Returns viewport-based crime records with configurable buffer zones and automatic sampling. Designed to serve crime data for the map/cube viewport as the user navigates.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startEpoch` | number (epoch sec) | **Yes** | — | Start of visible time range |
| `endEpoch` | number (epoch sec) | **Yes** | — | End of visible time range |
| `bufferDays` | number | No | `30` | Buffer days before/after visible range for smooth scrolling |
| `limit` | number | No | `50000` | Maximum records to return |
| `crimeTypes` | string (comma-separated) | No | — | Crime type filter |
| `districts` | string (comma-separated) | No | — | District filter |

### Response

```json
{
  "data": [
    {
      "timestamp": 1500,
      "type": "THEFT",
      "lat": 41.8,
      "lon": -87.6,
      "x": 25.0,
      "z": -10.0,
      "iucr": "0820",
      "district": "1",
      "year": 2001
    }
  ],
  "meta": {
    "viewport": { "start": 1000, "end": 2000 },
    "buffer": {
      "days": 30,
      "applied": { "start": -258200, "end": 261200 }
    },
    "returned": 1,
    "limit": 50000,
    "totalMatches": 120,
    "sampled": true,
    "sampleStride": 12
  }
}
```

When using mock data, the response includes `"meta.isMock": true`.

### Error Responses

- **400 Bad Request** — Missing `startEpoch` or `endEpoch`; non-integer values; `startEpoch >= endEpoch`
  ```json
  { "error": "Missing required parameters: startEpoch and endEpoch are required" }
  ```
- **500 Internal Server Error**
  ```json
  { "error": "Failed to fetch crime data", "details": "..." }
  ```

### Implementation Notes

- The actual database query uses a buffered range (`startEpoch - bufferDays * 86400` to `endEpoch + bufferDays * 86400`)
- If `totalMatches > limit`, data is sampled with stride `Math.ceil(totalMatches / limit)`
- The response is never cached long-term (`Cache-Control: no-store`)

---

## `GET /api/adaptive/bursts`

Computes burstiness metrics (temporal, spatial, and combined) for a single time range. Uses a configurable spatial formula for spatial burstiness calculation.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startEpoch` | number (epoch sec) | **Yes** | — | Start of time range |
| `endEpoch` | number (epoch sec) | **Yes** | — | End of time range |
| `baselineStartEpoch` | number | No | `startEpoch` | Baseline time range start |
| `baselineEndEpoch` | number | No | `endEpoch` | Baseline time range end |
| `granularity` | string | No | `daily` | Granularity label (`hourly`, `daily`, `weekly`, `monthly`, `quarterly`) |
| `crimeTypes` | string (comma-separated) | No | — | Crime type filter |
| `spatialFormula` | string | No | `balanced` | Spatial formula (`ann`, `entropy`, `js-divergence`, `balanced`) |

### Response

```json
{
  "bins": [
    {
      "startEpoch": 1704067200,
      "endEpoch": 1735689600,
      "recordCount": 500,
      "temporalB": 0.4231,
      "spatialB": 0.3156,
      "combinedB": 0.3694
    }
  ],
  "targetSliceCount": 6,
  "totalB": 0.3694
}
```

### Error Responses

- **400 Bad Request** — Invalid or missing time range
  ```json
  { "error": "Invalid time range" }
  ```

---

## `POST /api/adaptive/bursts`

Computes burstiness metrics for multiple time partitions in a single request. Useful for comparing burstiness across seasonal or periodic slices.

### Request Body

```json
{
  "partitions": [
    { "startEpoch": 1704067200, "endEpoch": 1706745600 },
    { "startEpoch": 1706745600, "endEpoch": 1709251200 }
  ],
  "crimeTypes": ["THEFT", "BATTERY"],
  "granularity": "weekly",
  "spatialFormula": "balanced"
}
```

### Response

Same format as `GET /api/adaptive/bursts`, but with one `bin` entry per partition.

### Error Responses

- **400 Bad Request** — Invalid request body or missing partitions array
  ```json
  { "error": "Invalid burst request" }
  ```

---

## `GET /api/adaptive/global`

Returns global adaptive time-warp, density, count, and burstiness maps used by the adaptive time scaling logic.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `binCount` | number | No | `ADAPTIVE_BIN_COUNT` | Number of bins for the maps (clamped 64–4096) |
| `kernelWidth` | number | No | `ADAPTIVE_KERNEL_WIDTH` | Kernel width for smoothing (clamped 0–25) |
| `binningMode` | string | No | `uniform-time` | Binning mode (`uniform-time` or `uniform-events`) |

### Response

```json
{
  "binCount": 512,
  "kernelWidth": 11,
  "binningMode": "uniform-time",
  "domain": { "startEpochSec": 978307200, "endEpochSec": 1767571200 },
  "rowCount": 8500000,
  "generatedAt": 1712345678901,
  "densityMap": [...],
  "countMap": [...],
  "burstinessMap": [...],
  "warpMap": [...]
}
```

All map arrays are `Float64Array` converted to plain arrays via `Array.from()`.

---

## `POST /api/stkde/hotspots`

Performs space-time kernel density estimation (STKDE) to identify crime hotspots. Supports both `sampled` and `full-population` compute modes, with automatic fallback.

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `computeMode` | string | No | `sampled` | `sampled` or `full-population` |
| `callerIntent` | string | No | `unknown` | `stkde` to enable full-population QA |
| `domain.startEpochSec` | number | **Yes** | — | Start of time domain (epoch seconds) |
| `domain.endEpochSec` | number | **Yes** | — | End of time domain (epoch seconds) |
| `filters.crimeTypes` | string[] | No | — | Crime type filter |
| `filters.bbox` | number[4] | No | — | Spatial bounding box `[minLng, minLat, maxLng, maxLat]` |
| `filters.districts` | string[] | No | — | District filter |
| `filters.slices` | object[] | No | — | Time slice descriptors for per-slice results |
| `params.spatialBandwidthMeters` | number | No | `750` | Spatial bandwidth (clamped 100–5000) |
| `params.temporalBandwidthHours` | number | No | `24` | Temporal bandwidth (clamped 1–168) |
| `params.gridCellMeters` | number | No | `500` | Grid cell size (clamped 100–5000) |
| `params.topK` | number | No | `12` | Top K hotspots (clamped 1–100) |
| `params.minSupport` | number | No | `5` | Minimum support threshold (clamped 1–1000) |
| `params.timeWindowHours` | number | No | `24` | Time window (clamped 1–168) |
| `limits.maxEvents` | number | No | `50000` | Maximum events to process (clamped 1000–50000) |
| `limits.maxGridCells` | number | No | `12000` | Maximum grid cells (clamped 1000–12000) |
| `guardrails.fullPopulationMaxSpanDays` | number | No | `12000` | Max span for full-population mode (clamped 1–12000) |
| `guardrails.fullPopulationTimeoutMs` | number | No | `20000` | Timeout for full-population mode (clamped 1000–60000) |

### Full Request Example

```json
{
  "computeMode": "sampled",
  "domain": {
    "startEpochSec": 1704067200,
    "endEpochSec": 1735689600
  },
  "filters": {
    "crimeTypes": ["THEFT", "BURGLARY"],
    "bbox": [-87.9, 41.8, -87.6, 42.0],
    "slices": [
      { "id": "q1", "startEpochSec": 1704067200, "endEpochSec": 1711843200 }
    ]
  },
  "params": {
    "spatialBandwidthMeters": 750,
    "temporalBandwidthHours": 24,
    "gridCellMeters": 500,
    "topK": 12,
    "minSupport": 5,
    "timeWindowHours": 24
  },
  "limits": {
    "maxEvents": 50000,
    "maxGridCells": 12000
  }
}
```

### Response

```json
{
  "meta": {
    "eventCount": 50000,
    "computeMs": 1234,
    "truncated": false,
    "requestedComputeMode": "sampled",
    "effectiveComputeMode": "sampled",
    "fallbackApplied": null,
    "clampsApplied": [],
    "fullPopulationStats": {
      "scannedRows": 8500000,
      "aggregatedCells": 5000,
      "queryMs": 3200
    }
  },
  "heatmap": {
    "cells": [
      { "lng": -87.63, "lat": 41.88, "intensity": 0.95, "support": 230 }
    ],
    "maxIntensity": 0.95
  },
  "hotspots": [
    {
      "id": "hotspot-0",
      "centroidLng": -87.63,
      "centroidLat": 41.88,
      "intensityScore": 0.95,
      "supportCount": 230,
      "peakStartEpochSec": 1704067200,
      "peakEndEpochSec": 1706745600,
      "radiusMeters": 500
    }
  ],
  "sliceResults": {
    "q1": { "meta": {...}, "heatmap": {...}, "hotspots": [...] }
  },
  "contracts": {
    "scoreVersion": "stkde-v1"
  }
}
```

### Error Responses

- **400 Bad Request** — Invalid request body
  ```json
  { "error": "Invalid STKDE request" }
  ```
- **500 Internal Server Error**
  ```json
  { "error": "Failed to compute STKDE hotspots", "details": "..." }
  ```

### Implementation Notes

- When `computeMode` is `full-population` but the time span exceeds guardrails, the system automatically falls back to `sampled` mode
- Slice-aware requests (`filters.slices` with length > 0) always use `sampled` mode
- The full-population pipeline has a configurable timeout (default 20s); exceeding it triggers a `sampled` fallback

---

## `GET /api/neighbourhood/poi`

Returns Points of Interest (POI) data for a geographic bounding box. Uses OSM Overpass API and Chicago Data Portal data sources. Results are cached in memory for 24 hours.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `minLat` | number | **Yes** | — | Minimum latitude |
| `maxLat` | number | **Yes** | — | Maximum latitude |
| `minLon` | number | **Yes** | — | Minimum longitude |
| `maxLon` | number | **Yes** | — | Maximum longitude |

### Response (available)

```json
{
  "status": "available",
  "poiCounts": {
    "foodDrink": 12,
    "shopping": 8,
    "education": 3,
    "parks": 2,
    "transit": 1,
    "healthcare": 5,
    "other": 15
  },
  "totalPOIs": 46,
  "summary": "12 food/drink venues, 5 healthcare, 3 education",
  "topCategories": [
    { "category": "foodDrink", "count": 12 },
    { "category": "shopping", "count": 8 },
    { "category": "healthcare", "count": 5 }
  ]
}
```

### Response (unavailable)

```json
{
  "status": "missing",
  "notice": "Neighbourhood data unavailable: <error message>"
}
```

### Error Responses

- **400 Bad Request** — Missing or non-finite bounds parameters
  ```json
  { "error": "Invalid or missing bounds parameters: minLat, maxLat, minLon, maxLon are required and must be finite numbers" }
  ```

---

## `POST /api/study/log`

Appends structured log entries to a JSONL file at `logs/study-sessions.jsonl`. Used for user study session recording.

### Request Body

```json
[
  { "event": "view_change", "timestamp": 1712345678, "page": "dashboard" },
  { "event": "filter_applied", "timestamp": 1712345680, "crimeTypes": ["THEFT"] }
]
```

Must be a non-empty JSON array. Each object is serialized as a JSON line appended to the log file.

### Response

```json
{ "success": true }
```

### Error Responses

- **400 Bad Request** — Body is not an array
  ```json
  { "error": "Invalid payload" }
  ```

---

## Error Handling Patterns

All endpoints follow consistent error patterns:

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| `200` | Success (or graceful mock fallback) | Normal operation; database errors fall back to mock data with `X-Data-Warning` header |
| `400` | Bad Request | Missing or invalid query parameters |
| `500` | Internal Server Error | DuckDB failure, unexpected exception |

### Graceful Degradation

Endpoints that depend on DuckDB (`/api/crime/stream`, `/api/crime/bins`, `/api/crime/meta`, `/api/crime/overview`, `/api/crime/stats-summary`, `/api/crimes/range`) implement fallback to mock data when:

- `USE_MOCK_DATA` or `DISABLE_DUCKDB` environment variable is set
- The dataset CSV file is not found
- A DuckDB query throws an exception

The `X-Data-Warning` header indicates mock data mode:

| Header Value | Meaning |
|-------------|---------|
| `Using demo data - database disabled` | DuckDB was disabled via env var |
| `Using demo data - dataset file not found` | The CSV data file is missing |
| `Using demo data - database unavailable` | A database error occurred |

---

## Rate Limits

No rate limiting is configured.

---

## CORS

No CORS middleware is configured. All endpoints are served from the same origin as the Next.js application.
