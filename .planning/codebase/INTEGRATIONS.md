# External Integrations

**Analysis Date:** 2026-06-25

## APIs & External Services

**OpenStreetMap Overpass API:**
- URL: `https://overpass-api.de/api/interpreter`
- Purpose: Query Points of Interest (POIs) within a bounding box — restaurants, parks, schools, hospitals, transit stations, shops
- Client: Native `fetch()` via `src/lib/neighbourhood/osm.ts`
- Request method: POST with form-encoded Overpass QL query
- Timeout: 30 seconds (set in Overpass QL query)
- Response: JSON with OSM elements (nodes/ways with lat/lon, tags)
- Caching: 24-hour in-memory cache in the API route handler at `src/app/api/neighbourhood/poi/route.ts`
- Error handling: Network/HTTP/JSON errors surfaced as `NeighbourhoodSummaryMissing` responses
- Usage frequency: On-demand when user views neighbourhood context (view-triggered)

**Chicago Data Portal SODA API:**
- Base URL: `https://data.cityofchicago.org/resource`
- Endpoints used:
  - `/6pth-rz8e.json` - Business licenses (`src/lib/neighbourhood/chicago.ts` — `queryChicagoBusinesses`)
  - `/pxu2-2i9s.json` - Land use data (`src/lib/neighbourhood/chicago.ts` — `queryChicagoLandUse`)
- Purpose: Enrich neighbourhood summaries with business and land use context
- Client: Native `fetch()` with SODA `$where`, `$limit`, `$select` params
- Response: JSON array of business/land-use records
- Limits: 50,000 rows for businesses, 100,000 rows for land use
- Error handling: Network failure and HTTP errors are caught and surfaced as structured errors; POI summary gracefully degrades to `status: 'missing'`
- Usage frequency: Co-occurring with OSM queries via `buildNeighbourhoodSummary` in `src/lib/neighbourhood/index.ts`

## Data Storage

**Databases:**
- DuckDB 1.4.4 (in-process OLAP database)
  - Purpose: Primary data store for ~8.5M Chicago crime records (2001-2026); also stores study/evaluation data in `study_*` fact tables
  - Connection: Singleton instance cached on `globalThis.__quietTigerDuckDb` at `src/lib/db.ts`
  - Persistence: WAL-mode database file at `data/cache/crime.duckdb`
  - Threads: Configurable via `DUCKDB_THREADS` env var (default: 2)
  - Configuration: `next.config.ts` marks it as `serverExternalPackages: ['duckdb']` (cannot be bundled by Webpack/Turbopack)
  - Patch: `patches/duckdb+1.4.4.patch` fixes the binary binding path for N-API version 3
  - Postinstall: `pnpm postinstall` creates a symlink at `node_modules/duckdb/lib/binding/3/duckdb.node`

**File Storage:**
- Local filesystem only
  - Crime source data: `data/sources/Crimes_-_2001_to_Present_20260114.csv` (~8.5M rows, Chicago crime data)
  - DuckDB cache: `data/cache/crime.duckdb` + `data/cache/crime.duckdb.wal`
  - Parquet export: `data/crime.parquet`
  - Raw data placeholder: `data/source.csv`
  - Additional datasets: `data/sources/Police_Stations_20260202.csv`, `data/sources/Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv`
  - Study logs (legacy): `logs/*.jsonl` (gitignored)

**Caching:**
- None (in-memory only; no Redis, Memcached, or similar)
- In-memory caches:
  - `@tanstack/react-query` client-side cache with 5-minute `staleTime`, 10-minute `gcTime` (`src/providers/QueryProvider.tsx`)
  - Neighbourhood POI: 24-hour in-memory `Map` in `src/app/api/neighbourhood/poi/route.ts`
  - DuckDB `globalThis.__quietTigerDuckDb` singleton in `src/lib/db.ts`

## Data Streaming

**Apache Arrow (gRPC-free binary protocol):**
- Purpose: Stream crime data from DuckDB → API route → client with zero-copy columnar format
- Client-side: `@loaders.gl/arrow` 4.4.3 + `@loaders.gl/core` 4.4.3 (via `src/hooks/useCrimeStream.ts`)
- Server-side: `apache-arrow` 21.1.0 (`tableFromJSON` / `tableToIPC` in `src/app/api/crime/stream/route.ts`)
- Content-Type: `application/vnd.apache.arrow.stream`
- Mock fallback: Generates synthetic Arrow stream when DuckDB is unavailable

## Authentication & Identity

**Auth Provider:**
- None (prototype/internal tool — no authentication)
- Study sessions generate random UUID client-side via `crypto.randomUUID()` in `src/store/useStudyStore.ts`
- Participant IDs are `anon-<sessionId-prefix>` or user-provided strings

**API Security:**
- No JWT, API keys, or session validation on API routes
- API routes are internal Next.js Route Handlers (no external exposure by default)
- No authentication middleware

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar)
- Errors logged via `console.error()` throughout codebase

**Logging:**
- Custom client-side `LoggerService` at `src/lib/logger.ts`
  - Buffers study events and flushes via `fetch` POST to `/api/study/log`
  - Fallback to `navigator.sendBeacon` on page unload
  - Retry: up to 4 attempts with linear backoff (750ms base)
  - Creates typed helpers: `submitSessionStart()`, `submitSessionEnd()`, `submitTrialComplete()`, etc.
  
- Server-side study logging at `src/app/api/study/log/route.ts`
  - Accepts typed `StudyIntent` objects
  - Validates 6 intent kinds: session-start, session-end, trial-complete, questionnaire-response, condition-toggle, warp-adjustment
  - Persists to DuckDB `study_*` tables via `src/lib/study/storage.ts`

- `useLogger` hook at `src/hooks/useLogger.ts` for component-level logging

## CI/CD & Deployment

**Hosting:**
- Not configured for any cloud provider (Next.js can deploy to Vercel/Node.js server)
- `.vercel` in `.gitignore` suggests Vercel consideration but not active
- No Dockerfile, no deployment configuration

**CI Pipeline:**
- None (no `.github/workflows/` directory; only `pull_request_template.md` exists)
- No automated testing in CI

## Environment Configuration

**Required env vars:**
| Variable | Default | Purpose |
|---|---|---|
| `USE_MOCK_DATA` | `false` | Enable DuckDB vs mock data mode |
| `DISABLE_DUCKDB` | (not set) | Force-disables DuckDB |
| `DUCKDB_PATH` | `data/cache/crime.duckdb` | Custom DuckDB database path |
| `DUCKDB_THREADS` | `2` | DuckDB parallelism |
| `STKDE_QA_FULL_POP_ENABLED` | `true` | Enable full-population STKDE computation |

**Secrets location:**
- `.env` file in project root (contains only `USE_MOCK_DATA=false`)
- No API keys or secrets required (all external APIs are public)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Mock Data System

**Fallback architecture:**
- Every API route supports graceful degradation to mock data when DuckDB is unavailable
- Controlled via `USE_MOCK_DATA` / `DISABLE_DUCKDB` env vars
- `isMockDataEnabled()` function at `src/lib/db.ts` reads the flag
- Mock data responses include `X-Data-Warning` header with reason (e.g., "Using demo data - database disabled")
- Mock data reflects realistic schema and patterns but is statistically random
- Enables development and testing without the 8.5M-row CSV dataset

---

*Integration audit: 2026-06-25*
