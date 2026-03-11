# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**Map basemap service:**
- CARTO basemap style endpoints - map style JSON pulled by MapLibre
  - SDK/Client: `maplibre-gl` + `react-map-gl` in `src/components/map/MapBase.tsx`
  - Auth: None detected (public style URLs in `src/lib/palettes.ts`)

**Browser telemetry endpoint (internal):**
- Study logging endpoint - buffered client events are POSTed to app route
  - SDK/Client: native `fetch` / `navigator.sendBeacon` in `src/lib/logger.ts`
  - Auth: None detected on endpoint `src/app/api/study/log/route.ts`

## Data Storage

**Databases:**
- Embedded DuckDB (local file DB)
  - Connection: `DUCKDB_PATH` env var (optional) in `src/lib/db.ts`
  - Client: `duckdb` node package in `src/lib/db.ts` and `src/lib/queries.ts`

**File Storage:**
- Local filesystem only
  - Source CSVs in `data/sources/*.csv` referenced by `src/lib/db.ts`
  - Optional parquet path in API facets route: `data/crime.parquet` in `src/app/api/crime/facets/route.ts`
  - Study logs in `logs/study-sessions.jsonl` in `src/app/api/study/log/route.ts`

**Caching:**
- No external cache service detected
- In-process/browser cache via TanStack Query in `src/providers/QueryProvider.tsx`
- DB-level cache table `adaptive_global_cache` managed in `src/lib/queries.ts`

## Authentication & Identity

**Auth Provider:**
- Custom anonymous session identity only (no auth provider)
  - Implementation: client-side persisted IDs in `src/store/useStudyStore.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/etc. integration)

**Logs:**
- Console logging throughout app/runtime (`console.*`) in multiple files including `src/lib/queries.ts` and `src/hooks/useCrimeData.ts`
- Study event log sink to local JSONL via `src/app/api/study/log/route.ts`

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in-repo; app is deployable as a Node Next.js service

**CI Pipeline:**
- None detected (`.github/workflows/` not present)

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA` / `DISABLE_DUCKDB` - toggles mock-vs-DuckDB mode in `src/lib/db.ts`
- `DUCKDB_PATH` - optional DB location override in `src/lib/db.ts`
- `NODE_ENV` - dev checks in `src/app/timeslicing/page.tsx` and `src/app/timeslicing/components/SuggestionToolbar.tsx`

**Secrets location:**
- `.env` file exists at repo root; no secret manager integration detected in code

## Webhooks & Callbacks

**Incoming:**
- None (all API routes are request/response endpoints under `src/app/api/*`)

**Outgoing:**
- Browser->app callback: POST `/api/study/log` from `src/lib/logger.ts`
- Browser->app data fetches for internal APIs (`/api/crimes/range`, `/api/crime/meta`, `/api/adaptive/global`, etc.) from hooks/components in `src/hooks/*` and `src/components/*`

---

*Integration audit: 2026-03-11*
