# External Integrations

**Analysis Date:** 2026-06-27

> **Summary:** This prototype is a fully **offline-first** application. There are no third-party SaaS APIs, no auth provider, no cloud database, and no inbound webhooks. The only external network dependency is the **Carto basemap vector tile style** consumed by MapLibre at runtime. All data storage is local (DuckDB + CSV + Parquet). Study telemetry writes are persisted to a local DuckDB table.

## APIs & External Services

**None.** No third-party APIs (no Stripe, no Slack, no SendGrid, no analytics services, no LLM APIs, no OAuth providers).

The only externally-hosted resource is:

**Map tile style (CDN):**
- **Carto Basemaps** — Public CDN, free, attribution required
  - `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` — Dark theme
  - `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` — Light theme
  - Used by MapLibre GL via the `mapStyle` prop in `src/lib/palettes.ts` (lines 82, 90, 98)
  - Raster/vector tiles themselves are fetched by MapLibre from the same Carto origin at runtime
  - No API key required; no env var to configure
  - Auth: not required (public style)
  - **Failure mode:** if Carto is unreachable, the map background appears blank but the rest of the dashboard (cube, timeline, charts) still functions

## Data Storage

**Databases:**
- **DuckDB** (in-process OLAP) — file at `data/cache/crime.duckdb` by default
  - Connection: file-based, no network
  - Client: `duckdb` npm package (1.4.4), instantiated via `duckdb.Database(path, cb)` in `src/lib/db.ts:163`
  - Schema managed at `src/lib/db.ts`:
    - `crimes_sorted` — zone-map optimized copy of raw Chicago CSV (created on first run from `data/sources/Crimes_-_2001_to_Present_20260114.csv` via `read_csv_auto`)
    - `crime_dataset_meta` — pre-computed min/max/crime_types/year range
    - `crime_overview_bins_medium` — pre-bucketed (120 bins) overview summary for fast dashboard loading
    - `crime_dataset_state` — fingerprint of the source CSV to skip re-materialization
    - `study_*` — study telemetry tables written by `/api/study/log` via `src/lib/study/storage.ts`
  - Concurrency: singleton cached on `globalThis.__quietTigerDuckDb`
  - Threading: `SET threads=N` (env `DUCKDB_THREADS`, default 2)
  - Ordering: `SET preserve_insertion_order=false`

**File storage (local filesystem only):**
- `data/sources/Crimes_-_2001_to_Present_20260114.csv` — Raw Chicago crimes CSV (~9.9 MB committed? No, gitignored). Path resolved at `src/lib/db.ts:51` as `getDataPath()`
- `data/cache/crime.duckdb` — DuckDB file (gitignored, regenerated on first run)
- `data/source.csv` — Preprocessed CSV output of `datapreprocessing/pipeline.py` (gitignored)
- `data/crime.parquet` — Parquet produced by `scripts/setup-data.js` (gitignored)
- All paths gitignored under `/data/*.csv`, `/data/*.parquet`, `/data/*.duckdb`, `/data/*.wal` (see `.gitignore` lines 38-49)

**Synthetic data output (local filesystem):**
- `scripts/synthetic/generate_bursty.py` writes to a user-specified `--out-dir` (default `./out/`) producing `<prefix>-seed<seed>-<iso>_events.csv` and `<prefix>-seed<seed>-<iso>_burstiness.csv`
- `/api/synthetic/bursty?format=csv` returns a CSV download stream built in-memory by `src/lib/synthetic/csv-export.ts`

**Caching:**
- None. Each request re-queries DuckDB. TanStack Query handles client-side cache invalidation
- The `/api/neighbourhood/poi` route uses an in-process `Map<string, {data, timestamp}>` cache with a 24h TTL (`src/app/api/neighbourhood/poi/route.ts:7`)

**Caching (build-time):**
- `data/cache/` is created on demand for the DuckDB file via `mkdirSync(..., { recursive: true })` in `src/lib/db.ts:160`

## Authentication & Identity

**None.** The prototype is a desktop-first internal tool with no auth layer. No login screen, no session cookies, no JWTs, no SSO. All routes are public.

The `/api/study/log` endpoint accepts a `sessionId` and `participantId` in the request body (validated as non-empty strings) but does NOT verify them — these are opaque strings the user/researcher provides to group pilot-study events. The endpoint writes them straight to DuckDB study tables.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, no Bugsnag, no Rollbar). Errors are caught in API route `try/catch` blocks and either:
  - Returned to the client with a 4xx/5xx response, or
  - Swallowed and replaced with a mock-data response (e.g. `/api/crime/stream` returns 1000 mock records on DuckDB failure with `X-Data-Warning: Using demo data - database unavailable` header — see `src/app/api/crime/stream/route.ts:156-171`)

**Logs:**
- Server: `console.log` / `console.error` to stdout (Node.js process). DuckDB init log at `src/lib/db.ts:177`, API errors logged via `console.error` in route handlers
- Client: `console.debug` in `src/lib/logger.ts:69` for dev-only `[study-log]` traces
- File logs: `/logs/*.jsonl` is gitignored but not currently written (legacy logger dropped; Phase 80 logs to DuckDB instead)
- `src/lib/logger.ts` — `LoggerService` with `navigator.sendBeacon` for best-effort drain on page unload and a `submit()` retry queue (`MAX_ATTEMPTS=4`, linear backoff 750ms) for acknowledged writes

**Telemetry:**
- The acknowledged write path posts typed study intents (`session-start`, `session-end`, `trial-complete`, `questionnaire-response`, `condition-toggle`, `warp-adjustment`) to `/api/study/log` (see `src/app/api/study/log/route.ts`)
- Persisted via `src/lib/study/storage.ts` to DuckDB `study_*` fact tables
- This is **local**, not sent to any third party

## CI/CD & Deployment

**Hosting:**
- Not deployed. Runs locally via `pnpm dev` or `pnpm start`
- No Dockerfile, no `vercel.json`, no `render.yaml`, no GitHub Actions workflows (`.github/` exists but contents not analyzed for this audit)

**CI Pipeline:**
- None detected. No `.github/workflows/*.yml` referenced from the codebase

**Production build:**
- `pnpm build` runs `NEXT_DISABLE_TURBOPACK=1 next build` (Turbopack disabled for production builds — see `package.json:7`)
- `next.config.ts` is the single Next.js config (no env-specific overrides)

## Environment Configuration

**Required env vars:** None. The app starts with no env vars set. `USE_MOCK_DATA=false` is the only line in `.env`, and even that is optional.

**Optional env vars:**
| Var | Default | Effect |
|---|---|---|
| `USE_MOCK_DATA` | unset | Truthy forces mock data. Falls back to `DISABLE_DUCKDB`. See `src/lib/db.ts:38-44` |
| `DISABLE_DUCKDB` | unset | Same semantics as `USE_MOCK_DATA` |
| `DUCKDB_PATH` | `data/cache/crime.duckdb` | Absolute or cwd-relative DuckDB file path. See `src/lib/db.ts:88-94` |
| `DUCKDB_THREADS` | `2` | DuckDB `SET threads=N` at init. See `src/lib/db.ts:96-98` |
| `STKDE_QA_FULL_POP_ENABLED` | `true` | Enables full-population STKDE compute. Set to `0`/`false` to force sampled mode. See `src/app/api/stkde/hotspots/route.ts:10-13` |
| `NODE_ENV` | (Next.js default) | Standard Next.js env; logger is silent in `production` |

**Secrets location:** None. The app has no secrets.

## Webhooks & Callbacks

**Incoming:** None. The app exposes no webhook endpoints and accepts no external callbacks.

**Outgoing:** None. The only outbound HTTP is the Carto basemap style/tile fetch from the browser, which is user-initiated by MapLibre and not a webhook.

**Internal API routes (all served by the same Next.js process — not "external" but listed for completeness):**
- `GET /api/crime/stream` — Arrow-IPC stream of crime records (`application/vnd.apache.arrow.stream`)
- `GET /api/crime/around` — Crimes within a geographic radius
- `GET /api/crime/bins` — Binned crime data for the timeline overview
- `GET /api/crime/facets` — Faceted counts (crime type, district, year)
- `GET /api/crime/meta` — Dataset metadata (min/max time, lat/lon, crime types, year range)
- `GET /api/crime/overview` — Overview summary bins
- `GET /api/crime/stats-summary` — Aggregated stats
- `GET /api/crimes/range` — Crimes within a time range
- `POST /api/stkde/hotspots` — Compute STKDE hotspots
- `GET /api/adaptive/global` — Global adaptive scaling data
- `GET /api/adaptive/bursts` — Per-burst adaptive data
- `GET /api/neighbourhood/poi` — Neighbourhood POI summary (24h in-process cache)
- `GET /api/synthetic/bursty` — Generate a bursty synthetic sequence (JSON or CSV)
- `GET /api/synthetic/bursty/burstiness` — Burstiness ground truth for a generated sequence
- `POST /api/study/log` — Acknowledge-write endpoint for study telemetry

All routes use `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Route handlers live in `src/app/api/**/route.ts`.

## Build-Time Data Setup

`scripts/setup-data.js` (Node, commonjs, run manually):
- Reads or generates `data/source.csv` (100K random points in Chicago)
- Spins up an in-memory DuckDB (`new duckdb.Database(':memory:')`)
- Loads the CSV, computes normalized `x`/`z`/`y` columns, and writes `data/crime.parquet` via `COPY (...) TO '...' (FORMAT 'parquet')`

`datapreprocessing/pipeline.py` (Python, run manually with `python pipeline.py <input.csv>`):
- Pandas chunked read of raw Chicago CSV
- Filters to the last 5 years
- Normalizes District codes, fills missing Lat/Lon from `Location` string
- Maps IUCR / District Name lookups
- Writes cleaned `data/source.csv` for downstream ingestion

Both are offline, local-only ETL. No network calls.

---

*Integration audit: 2026-06-27*
