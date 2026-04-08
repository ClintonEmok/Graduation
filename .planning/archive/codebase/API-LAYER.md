# API Layer

**Analysis Date:** 2026-03-30

## Overview

The application uses a layered API architecture with three primary communication patterns:

1. **Frontend to Internal API Routes** - Next.js API routes (`/api/*`) that proxy to database/external services
2. **Internal API to External APIs** - Direct fetch calls to external services (OSM, Chicago Data Portal)
3. **React Query Hooks** - Data fetching layer using `@tanstack/react-query` for caching and state management

All external HTTP calls use the native Fetch API. No axios or other HTTP client libraries are used.

## HTTP Client Implementation

### Native Fetch Usage

The codebase uses the native browser `fetch()` API exclusively for all HTTP requests:

```typescript
// Direct fetch call in useCrimeData.ts (line 72)
const response = await fetch(requestPath)

// Fetch with POST body in osm.ts (line 84)
response = await fetch(OVERPASS_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `data=${encodeURIComponent(query)}`,
})
```

**Key Files:**
- `src/hooks/useCrimeData.ts` - Primary crime data fetching hook
- `src/hooks/useCrimeStream.ts` - Streaming crime data with Apache Arrow
- `src/lib/neighbourhood/osm.ts` - OSM Overpass API client
- `src/lib/neighbourhood/chicago.ts` - Chicago Data Portal SODA API client

### No HTTP Client Library

The project does **not** use axios, superagent, or similar HTTP client libraries. All request handling is done via native `fetch()` with manual error handling.

## API Clients

### 1. Crime Data API Client

**Hook:** `src/hooks/useCrimeData.ts`

Uses React Query for data fetching with built-in caching:

```typescript
const query = useQuery({
  queryKey,
  queryFn: () => fetchCrimesInRange(...),
  enabled: hasValidRange,
  placeholderData: (previousData) => previousData, // Prevent UI flash
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000, // 5 minute cache
})
```

**Endpoint:** `/api/crimes/range`

**Parameters:**
- `startEpoch` (required) - Start of visible range (Unix epoch seconds)
- `endEpoch` (required) - End of visible range
- `bufferDays` (optional, default: 30) - Buffer before/after visible range
- `limit` (optional, default: 50000) - Max records to return
- `crimeTypes` (optional) - Comma-separated crime types
- `districts` (optional) - Comma-separated districts

**Response:**
```typescript
{
  data: CrimeRecord[],
  meta: {
    viewport: { start, end },
    buffer: { days, applied: { start, end } },
    returned: number,
    limit: number,
    totalMatches: number,
    sampled: boolean,
    sampleStride: number,
    isMock: boolean
  }
}
```

### 2. Crime Stream API (Apache Arrow)

**Hook:** `src/hooks/useCrimeStream.ts`

Uses Apache Arrow for streaming binary data:

```typescript
const reader = await RecordBatchReader.from(response);
for await (const batch of reader) {
  if (onBatch) onBatch(batch);
}
```

**Endpoint:** `/api/crime/stream`

**Content-Type:** `application/vnd.apachearrow.stream`

Returns crime data as Apache Arrow IPC stream for efficient binary transfer.

### 3. Neighbourhood Data API (External Aggregator)

**API Route:** `src/app/api/neighbourhood/poi/route.ts`

Aggregates data from multiple external sources:

```typescript
const [osmPOIs, businesses] = await Promise.all([
  queryOSMPOI(input.bounds),
  queryChicagoBusinesses(input.bounds),
]);
```

**External APIs Called:**
- OSM Overpass API (`https://overpass-api.de/api/interpreter`)
- Chicago Data Portal SODA API (`https://data.cityofchicago.org/resource`)

**Caching:** In-memory cache with 24-hour TTL:

```typescript
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: unknown; timestamp: number }>();
```

### 4. OSM Overpass API Client

**File:** `src/lib/neighbourhood/osm.ts`

```typescript
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export const queryOSMPOI = async (bounds: GeoBounds): Promise<OSMPOIResult[]> => {
  response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  // ...
}
```

**Query Features:**
- Amenities: restaurant, bar, cafe, fast_food, school, university, hospital, clinic, pharmacy
- Leisure: park, playground
- Shops
- Transit: railway stations, public transport stations
- Timeout: 30 seconds (hardcoded in Overpass QL)

### 5. Chicago Data Portal SODA API Client

**File:** `src/lib/neighbourhood/chicago.ts`

```typescript
const BUSINESS_ENDPOINT = `${CHICAGO_API_BASE}/6pth-rz8e.json`;
const LAND_USE_ENDPOINT = `${CHICAGO_API_BASE}/pxu2-2i9s.json`;

// Business licenses query
export const queryChicagoBusinesses = async (bounds: GeoBounds) => {
  const params = new URLSearchParams({
    '$where': `latitude >= ${bounds.minLat} AND latitude <= ${bounds.maxLat}...`,
    '$limit': '50000',
    '$select': 'id,doing_business_as_name,license_description,address,latitude,longitude',
  });
  response = await fetch(`${BUSINESS_ENDPOINT}?${params}`);
}
```

### 6. STKDE Hotspots API

**File:** `src/app/api/stkde/hotspots/route.ts`

**Method:** POST

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const validation = validateAndNormalizeStkdeRequest(body);
  // ...
}
```

**Request Body:**
```typescript
{
  domain: { startEpochSec, endEpochSec },
  computeMode: 'sampled' | 'full-population',
  filters: { crimeTypes, districts },
  limits: { maxEvents },
  guardrails: { fullPopulationMaxSpanDays, fullPopulationTimeoutMs }
}
```

**Timeout Handling:**
```typescript
const withTimeout = async <T>(work: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error('full-pop-timeout')), timeoutMs);
  });
  return await Promise.race([work, timeout]);
}
```

Default timeout: 20 seconds for full-population queries.

## Request/Response Handling

### Query Parameter Handling

All API routes use URL search params for GET requests:

```typescript
// useCrimeData.ts (line 62-69)
const requestPath = `/api/crimes/range?${new URLSearchParams({
  startEpoch: normalizedRange.start.toString(),
  endEpoch: normalizedRange.end.toString(),
  bufferDays: bufferDays.toString(),
  ...(crimeTypes?.length ? { crimeTypes: crimeTypes.join(',') } : {}),
  ...(districts?.length ? { districts: districts.join(',') } : {}),
}).toString()}`;
```

### Request Validation

**Example from crimes/range/route.ts:**

```typescript
// Required parameters validation
if (!startEpoch || !endEpoch) {
  return NextResponse.json(
    { error: 'Missing required parameters: startEpoch and endEpoch are required' },
    { status: 400 }
  );
}

// Type validation
const start = parseInt(startEpoch, 10);
if (isNaN(start) || isNaN(end)) {
  return NextResponse.json(
    { error: 'Invalid epoch parameters: must be valid integers' },
    { status: 400 }
  );
}
```

### Response Formatting

All API routes return JSON via `NextResponse.json()`:

```typescript
return NextResponse.json(
  {
    data: crimes,
    meta: {
      viewport: { start, end },
      buffer: { days: bufferDays, applied: { start: bufferedStart, end: bufferedEnd } },
      returned: crimes.length,
      // ...
    }
  },
  {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Content-Type-Options': 'nosniff',
    }
  }
);
```

## Error Handling

### Pattern 1: Try-Catch with Error Transformation

Used in all external API clients:

```typescript
// chicago.ts (lines 23-37)
try {
  response = await fetch(`${BUSINESS_ENDPOINT}?${params}`);
} catch (err) {
  throw new Error(`Chicago API error: network failure — ${err instanceof Error ? err.message : String(err)}`);
}

if (!response.ok) {
  throw new Error(`Chicago API error: HTTP ${response.status}`);
}

let data: ChicagoBusiness[];
try {
  data = await response.json() as ChicagoBusiness[];
} catch (err) {
  throw new Error(`Chicago API error: invalid JSON response — ${err instanceof Error ? err.message : String(err)}`);
}
```

### Pattern 2: API Route Error Handling

```typescript
// crimes/range/route.ts (lines 204-214)
catch (error) {
  console.error('API Error (/api/crimes/range):', error);
  
  return NextResponse.json(
    { 
      error: 'Failed to fetch crime data',
      details: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
```

### Pattern 3: Frontend Error Handling

```typescript
// useCrimeData.ts (lines 85-91)
catch (error) {
  console.error('[useCrimeData] Error fetching crimes:', error);
  if (error instanceof TypeError) {
    throw new Error(`Network error while fetching crimes from ${requestPath}`);
  }
  throw error;
}
```

### Pattern 4: Graceful Degradation with Mock Data

The API routes include fallback to mock data when external services fail:

```typescript
// crime/stream/route.ts (lines 143-160)
catch (error) {
  console.error('API Error:', error);
  
  // Return mock data with warning flag
  const mockData = generateMockData();
  const table = tableFromJSON(mockData);
  const ipcBuffer = tableToIPC(table, 'stream');
  
  return new Response(ipcBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'X-Data-Warning': 'Using demo data - database unavailable',
    },
  });
}
```

## Authentication

**No authentication is implemented** for any API calls in this codebase.

- Internal API routes (`/api/*`) have no authentication
- External APIs (OSM, Chicago Data Portal) are publicly accessible
- No API keys, tokens, or OAuth flows are used

## Rate Limiting

**No explicit rate limiting is implemented** in the codebase.

- No rate limit middleware
- No request throttling
- No quota enforcement

The OSM Overpass API has its own rate limiting (server-side), and the client includes a 30-second timeout to handle potential throttling.

## Caching Strategy

### React Query Caching

```typescript
// useCrimeData.ts
staleTime: 5 * 60 * 1000, // 5 minutes
```

### In-Memory API Route Caching

```typescript
// /api/neighbourhood/poi/route.ts
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: unknown; timestamp: number }>();
```

### Cache-Control Headers

All API responses set appropriate cache headers:

```typescript
headers: {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'X-Content-Type-Options': 'nosniff',
}
```

## Data Transformation

### Coordinate Normalization

Crime data includes normalized coordinates:

```typescript
// From crimes/range/route.ts (line 68)
const { x, z } = lonLatToNormalized(lon, lat);

// Result added to each record
results.push({
  timestamp,
  type,
  lat,
  lon,
  x,  // Normalized X coordinate
  z,  // Normalized Z coordinate
  // ...
});
```

### Type Conversions

Database results require type coercion:

```typescript
// queries.ts (lines 274-284)
return rows.map((row) => ({
  timestamp: typeof row.timestamp === 'bigint' ? Number(row.timestamp) : row.timestamp,
  type: row.type as string,
  lat: typeof row.lat === 'bigint' ? Number(row.lat) : row.lat,
  // ...
})) as CrimeRecord[];
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/crimes/range` | GET | Fetch crime data within date range |
| `/api/crime/stream` | GET | Stream crime data as Apache Arrow |
| `/api/crime/meta` | GET | Get crime data metadata |
| `/api/crime/bins` | GET | Get binned crime aggregations |
| `/api/crime/facets` | GET | Get crime type/district facets |
| `/api/stkde/hotspots` | POST | Compute STKDE hotspots |
| `/api/neighbourhood/poi` | GET | Get neighbourhood POI data |
| `/api/adaptive/global` | GET | Get global adaptive maps |
| `/api/study/log` | POST | Log study events |

## Environment Configuration

No API keys or secrets are configured for external services. The external APIs (OSM, Chicago Data Portal) are publicly accessible without authentication.

---

*API layer analysis: 2026-03-30*
