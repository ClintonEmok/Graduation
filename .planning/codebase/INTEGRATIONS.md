# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Third-party services:**
- Not detected (no external SaaS API clients in `src/**`).

**Internal app APIs (Next route handlers):**
- Crime range API: `src/app/api/crimes/range/route.ts`
- Crime metadata: `src/app/api/crime/meta/route.ts`
- Crime Arrow stream: `src/app/api/crime/stream/route.ts`
- Crime facets: `src/app/api/crime/facets/route.ts`
- Aggregated bins: `src/app/api/crime/bins/route.ts`
- Global adaptive maps: `src/app/api/adaptive/global/route.ts`
- Study log ingestion: `src/app/api/study/log/route.ts`

## Data Storage

**Databases:**
- Local DuckDB (embedded file DB)
  - Connection: `src/lib/db.ts` (`getDb`, `getDbPath`)
  - Client: `duckdb` package

**File Storage:**
- Local filesystem only
  - CSV source path for DB queries: `data/sources/Crimes_-_2001_to_Present_20260114.csv` (expected by `src/lib/db.ts`)
  - Parquet path used by facets/setup script: `data/crime.parquet` (`src/app/api/crime/facets/route.ts`, `scripts/setup-data.js`)
  - Study logs: `logs/study-sessions.jsonl` (`src/app/api/study/log/route.ts`)

**Caching:**
- React Query in-memory client cache (`src/providers/QueryProvider.tsx`)
- DuckDB table cache for global adaptive maps (`adaptive_global_cache` in `src/lib/queries.ts`)

## Authentication & Identity

**Auth Provider:**
- Not applicable.
  - Implementation: None detected in `src/app/api/**` or middleware.

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/etc integration).

**Logs:**
- Console logging across API/hooks/components (`src/lib/queries.ts`, `src/hooks/useCrimeData.ts`, `src/components/layout/TopBar.tsx`).
- Structured study-session NDJSON logging endpoint in `src/app/api/study/log/route.ts`.

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in repository.
- App assumes Node runtime for server routes and local file access.

**CI Pipeline:**
- Not detected (no GitHub Actions/workflow files surfaced in this mapping pass).

## Environment Configuration

**Required env vars:**
- `USE_MOCK_DATA` (toggle mock mode)
- `DISABLE_DUCKDB` (legacy equivalent toggle)
- `DUCKDB_PATH` (optional DB path override)

**Secrets location:**
- Not applicable; no secret-bearing integrations detected.

## Webhooks & Callbacks

**Incoming:**
- None from external systems.

**Outgoing:**
- None to external systems.

---

*Integration audit: 2026-02-26*
