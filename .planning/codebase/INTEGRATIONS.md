# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Chicago Data Portal (SODA API):**
- Business Licenses API - `https://data.cityofchicago.org/resource/6pth-rz8e.json`
  - Purpose: Query business licenses within geographic bounds
  - Auth: None (public API)
  - Implementation: `src/lib/neighbourhood/chicago.ts`

- Land Use API - `https://data.cityofchicago.org/resource/pxu2-2i9s.json`
  - Purpose: Query land use data within geographic bounds
  - Auth: None (public API)
  - Implementation: `src/lib/neighbourhood/chicago.ts`

**OpenStreetMap (OSM) Overpass API:**
- Endpoint: `https://overpass-api.de/api/interpreter`
  - Purpose: Query Points of Interest (restaurants, schools, parks, transit)
  - Auth: None (public API with rate limits)
  - Implementation: `src/lib/neighbourhood/osm.ts`

## Data Storage

**Databases:**
- DuckDB 1.4.4 (embedded)
  - Type: In-memory/embedded analytical SQL database
  - Data: Crime data from Chicago (CSV ~8.5M rows, 2001-2026)
  - Connection: Local file-based (`data/cache/crime.duckdb`)
  - Client: Native duckdb Node.js binding
  - Implementation: `src/lib/db.ts`
  - Can be disabled via `USE_MOCK_DATA=true` or `DISABLE_DUCKDB=true`

**File Storage:**
- Local filesystem only
  - Crime CSV: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
  - DuckDB cache: `data/cache/crime.duckdb`
  - Study session logs: `logs/study-sessions.jsonl`

**Caching:**
- DuckDB as query cache (pre-sorted tables for zone map optimization)
- No external caching service

## Authentication & Identity

**Auth Provider:**
- None (no authentication)
  - Application is a public prototype
  - Internal session tracking only via generated UUIDs (`sessionId` in `src/store/useStudyStore.ts`)

## Monitoring & Observability

**Error Tracking:**
- None configured

**Logs:**
- Internal logger: `src/lib/logger.ts`
  - Session-based logging with optional `sessionId`
  - Outputs to console
  - Study session logs written to `logs/study-sessions.jsonl` (JSONL format)

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured (Next.js app, typically Vercel or Node.js)

**CI Pipeline:**
- None detected (no GitHub Actions workflows found)
- `.github/pull_request_template.md` exists suggesting GitHub usage

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA` - Toggle mock data vs DuckDB (default: varies based on presence)
- `DISABLE_DUCKDB` - Alternative to USE_MOCK_DATA
- `DUCKDB_PATH` - Custom path to DuckDB file (optional)

**Secrets location:**
- `.env` file in project root (committed to repo - contains only `USE_MOCK_DATA=false`)
- No external secrets management

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Internal API Routes

The app exposes internal API routes via Next.js App Router:

- `/api/crimes/range` - Query crimes within date range
- `/api/crime/stream` - Stream crime data
- `/api/crime/facets` - Get crime type facets
- `/api/crime/meta` - Get crime data metadata
- `/api/crime/bins` - Get binned crime data
- `/api/stkde/hotspots` - Compute space-time density hotspots
- `/api/adaptive/global` - Global adaptive scale data
- `/api/neighbourhood/poi` - Points of interest (proxies external APIs)
- `/api/study/log` - Log study session data

---

*Integration audit: 2026-03-30*
