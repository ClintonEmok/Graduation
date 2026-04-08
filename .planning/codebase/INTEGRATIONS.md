# External Integrations

**Analysis Date:** 2026-04-08

## APIs & External Services

**Chicago Data Portal (SODA API):**
- Business licenses - `https://data.cityofchicago.org/resource/6pth-rz8e.json`
  - Purpose: Pull businesses inside a viewport for neighbourhood summaries
  - Implementation: `src/lib/neighbourhood/chicago.ts`
  - Called from: `src/lib/neighbourhood/index.ts`, `src/app/api/neighbourhood/poi/route.ts`

- Land use - `https://data.cityofchicago.org/resource/pxu2-2i9s.json`
  - Purpose: Pull land-use features inside a viewport
  - Implementation: `src/lib/neighbourhood/chicago.ts`
  - Used for: neighbourhood enrichment completeness, not the primary summary path

**OpenStreetMap Overpass API:**
- Endpoint: `https://overpass-api.de/api/interpreter`
  - Purpose: Fetch POIs such as restaurants, parks, schools, healthcare, and transit stops
  - Implementation: `src/lib/neighbourhood/osm.ts`
  - Called from: `src/lib/neighbourhood/index.ts`

## Data Storage

**Databases:**
- DuckDB 1.4.4 (embedded/local)
  - Connection: local file database at `data/cache/crime.duckdb` (default from `src/lib/db.ts`)
  - Client: native `duckdb` Node binding
  - Query entry points: `src/lib/db.ts`, `src/lib/queries.ts`, `src/lib/duckdb-aggregator.ts`
  - Disable switch: `USE_MOCK_DATA` or `DISABLE_DUCKDB` in `src/lib/db.ts`

**File Storage:**
- Crime CSV source: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
  - Used by `src/lib/db.ts`, `src/lib/queries.ts`, `src/app/api/crime/stream/route.ts`, and `src/app/api/crime/meta/route.ts`
- Optional parquet dataset: `data/crime.parquet`
  - Used by `src/app/api/crime/facets/route.ts`
- DuckDB cache: `data/cache/crime.duckdb`
  - Used for local analytics and cached global adaptive maps
- Study logs: `logs/study-sessions.jsonl`
  - Written by `src/app/api/study/log/route.ts`

**Caching:**
- In-process memoization for neighbourhood summaries in `src/app/api/neighbourhood/poi/route.ts`
- DuckDB table caching / sorted-table reuse in `src/lib/db.ts` and `src/lib/queries.ts`
- No external cache provider detected

## Authentication & Identity

**Auth Provider:**
- None detected
  - API routes under `src/app/api/**/route.ts` are publicly callable
  - Study session identity is app-managed via `src/store/useStudyStore.ts` and consumed by `src/lib/logger.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging in server code (`src/lib/db.ts`, `src/lib/queries.ts`, `src/app/api/**/route.ts`)
- Client/session event buffering in `src/lib/logger.ts`
- Flush target: `POST /api/study/log` in `src/app/api/study/log/route.ts`

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in repo metadata
- Next.js app requires Node-compatible hosting because DuckDB routes set `runtime = 'nodejs'` in `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/adaptive/global/route.ts`, `src/app/api/stkde/hotspots/route.ts`, and `src/app/api/neighbourhood/poi/route.ts`

**CI Pipeline:**
- None detected (`.github/workflows/` not present)
- GitHub usage is implied by `.github/pull_request_template.md`

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA` - Enables demo-mode data paths in `src/lib/db.ts`
- `DISABLE_DUCKDB` - Alternate mock-data toggle in `src/lib/db.ts`
- `DUCKDB_PATH` - Overrides the DuckDB file path in `src/lib/db.ts`
- `STKDE_QA_FULL_POP_ENABLED` - Enables full-population STKDE path in `src/app/api/stkde/hotspots/route.ts`

**Secrets location:**
- Root `.env` file
- No managed secrets service detected

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Internal API Routes

These routes are internal to the app and shape the integration surface used by UI hooks and workers:
- `/api/crimes/range` - crime viewport data (`src/app/api/crimes/range/route.ts`)
- `/api/crime/stream` - Arrow stream payload (`src/app/api/crime/stream/route.ts`)
- `/api/crime/facets` - type/district facets (`src/app/api/crime/facets/route.ts`)
- `/api/crime/meta` - data bounds and metadata (`src/app/api/crime/meta/route.ts`)
- `/api/crime/bins` - binned crime data (`src/app/api/crime/bins/route.ts`)
- `/api/adaptive/global` - adaptive density/warp caches (`src/app/api/adaptive/global/route.ts`)
- `/api/stkde/hotspots` - hotspot computation (`src/app/api/stkde/hotspots/route.ts`)
- `/api/neighbourhood/poi` - neighbourhood summary (`src/app/api/neighbourhood/poi/route.ts`)
- `/api/study/log` - local study log sink (`src/app/api/study/log/route.ts`)

---

*Integration audit: 2026-04-08*
