# External Integrations

**Analysis Date:** 2026-06-01

## APIs & External Services

**OpenStreetMap Overpass API:**
- **Endpoint:** `POST https://overpass-api.de/api/interpreter`
- **Purpose:** Query points of interest (POIs) within bounding boxes for neighbourhood enrichment
- **Client:** `src/lib/neighbourhood/osm.ts` — Custom fetch-based client
- **Auth:** None (public API)
- **Query type:** Overpass QL (XML-like query language)
- **Categories fetched:** Restaurants, bars, cafes, schools, universities, hospitals, clinics, pharmacies, parks, playgrounds, shops, transit stations
- **Performance:** 30-second timeout, in-memory 24-hour cache via `src/app/api/neighbourhood/poi/route.ts`
- **Rate limiting:** No built-in rate limiter; relies on 24-hour client-side cache
- **Error handling:** Network failure and HTTP error reporting; graceful fallback to "missing" status in `src/lib/neighbourhood/index.ts`

**Chicago Data Portal SODA API:**
- **Endpoint:** `GET https://data.cityofchicago.org/resource/{dataset_id}.json`
  - Business licenses: `/resource/6pth-rz8e.json`
  - Land use: `/resource/pxu2-2i9s.json`
- **Purpose:** Enrich neighbourhood analysis with business license and land use data
- **Client:** `src/lib/neighbourhood/chicago.ts` — Custom fetch-based client with URLSearchParams
- **Auth:** None (public SODA API)
- **Query params:** `$where` (spatial bounding box), `$limit`, `$select`
- **Limits:** Business licenses up to 50,000 records; land use up to 100,000 records
- **Error handling:** Network failure and HTTP error reporting; results wrap into same neighbourhood summary flow

## Data Storage

**Databases:**

| Purpose | Technology | Details | Connection |
|---------|-----------|---------|------------|
| Primary crime analytics | DuckDB 1.4.4 | In-process OLAP; reads CSV/Parquet files | Server-side only via `src/lib/db.ts`; path at `data/cache/crime.duckdb` |
| Adaptive cache | DuckDB table | `adaptive_global_cache` table stores precomputed density/burstiness/warp maps | Same DuckDB instance |

**File Storage:**
- **Local filesystem only** — No cloud storage (S3, GCS, etc.)
- Crime dataset: `data/sources/Crimes_-_2001_to_Present_20260114.csv` (~8.5M rows)
- Parquet variant: `data/crime.parquet`
- Cache: `data/cache/crime.duckdb` (auto-generated)
- Log files: `logs/study-sessions.jsonl` (NDJSON format)

**Caching:**
- **None external** — No Redis, Memcached, or CDN caching
- **In-memory caches:**
  - Neighbourhood POI cache: 24-hour TTL in `src/app/api/neighbourhood/poi/route.ts`
  - DuckDB adaptive cache table: persistent across server restarts
- **Browser caching:** TanStack Query default staleTime of 5 minutes

## Authentication & Identity

**Auth Provider:**
- **None** — No OAuth, SSO, or external auth provider
- Custom study session tracking via `src/store/useStudyStore.ts`:
  - Generates UUID session IDs via `crypto.randomUUID()`
  - Stores session in `localStorage` via Zustand `persist` middleware
  - Participant IDs are self-reported (anonymous by default)
- No login screen, no JWT, no API keys required

## Monitoring & Observability

**Error Tracking:**
- **None** — No Sentry, Datadog, or similar error tracking service
- Errors logged via `console.error()` throughout the codebase

**Logs:**
- **Self-hosted NDJSON log file**
  - Client-side logging via `src/lib/logger.ts`: batch-logging class with `navigator.sendBeacon` fallback
  - Log events posted to `POST /api/study/log` 
  - Server persists to `logs/study-sessions.jsonl` via `src/app/api/study/log/route.ts`
  - Log events include: sessionId, participantId, type, timestamp, payload
  - Batch size: 50 events or 5-second flush interval
- **No external log aggregation service**

## CI/CD & Deployment

**Hosting:**
- **Self-hosted Node.js server** (no Vercel/Cloudflare/etc. detected)
- Standard `next build` + `next start` or `next dev` for development

**CI Pipeline:**
- **None detected** — No `.github/workflows/` with CI configuration observed
- `.github/` exists but no pipeline files identified

## Environment Configuration

**Required env vars:**
| Variable | Default | Purpose |
|----------|---------|---------|
| `USE_MOCK_DATA` | `false` | Use mock data instead of DuckDB |
| `DISABLE_DUCKDB` | (unset) | Alternative flag to force mock mode |
| `DUCKDB_PATH` | `data/cache/crime.duckdb` | Custom DuckDB database path |
| `STKDE_QA_FULL_POP_ENABLED` | `true` | Enable full-population STKDE computation mode |

**Secrets location:**
- `.env` file (contains only `USE_MOCK_DATA=false`)
- No secrets, API keys, or tokens stored anywhere (all APIs used are public/open)

## Webhooks & Callbacks

**Incoming:**
- **None** — No webhook endpoints

**Outgoing:**
- **None** — No webhook callbacks to external services

## Third-Party Services (No Direct Integration)

The following were considered but **not integrated**:
- No mapping tile service URL configured (MapLibre uses local data or default OSM tiles implied by `maplibre-gl`)
- No Supabase, Firebase, or similar BaaS
- No cloud database (DuckDB is fully local)
- No payment processing
- No email/SMS service
- No LLM/AI API integration

---

*Integration audit: 2026-06-01*
