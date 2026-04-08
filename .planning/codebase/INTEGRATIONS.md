# External Integrations

**Analysis Date:** 2026-04-08

## APIs & External Services

**OpenStreetMap/Overpass API:**
- Service: OSM Overpass API for Points of Interest (POI) data
- Endpoint: `https://overpass-api.de/api/interpreter`
- Usage: Neighborhood analysis - queries restaurants, bars, schools, hospitals, parks, shops, transit stations within map bounds
- Auth: None (public API)
- Implementation: `src/lib/neighbourhood/osm.ts`

**Chicago Data Portal (SODA API):**
- Service: City of Chicago open data for business licenses and land use
- Endpoints:
  - Business licenses: `https://data.cityofchicago.org/resource/6pth-rz8e.json`
  - Land use: `https://data.cityofchicago.org/resource/pxu2-2i9s.json`
- Usage: Neighborhood context - business types and land use patterns within geographic bounds
- Auth: None (public API)
- Implementation: `src/lib/neighbourhood/chicago.ts`

## Data Storage

**Databases:**
- DuckDB (local in-process OLAP database)
  - Connection: File-based (`data/cache/crime.duckdb`)
  - Data source: CSV file at `data/sources/Crimes_-_2001_to_Present_20260114.csv` (~8.5M rows)
  - Client: Native DuckDB Node.js binding via `duckdb` npm package
  - Configuration: `DUCKDB_PATH` env var or default location
  - Implementation: `src/lib/db.ts`

**File Storage:**
- Local filesystem only
- Data directory: `data/sources/` (committed to repo or provisioned separately)
- Cache directory: `data/cache/` (DuckDB database, gitignored)
- No cloud object storage (S3, GCS, etc.)

**Caching:**
- DuckDB zone map optimization via sorted `crimes_sorted` table
- React Query for HTTP API response caching (in-memory)

## Data Sources (No External APIs for Core Data)

**Crime Data:**
- Source: Chicago Police Department (historical crime data)
- Format: CSV file in repository (`data/sources/Crimes_-_2001_to_Present_20260114.csv`)
- Contains: ~8.5M records from 2001 to present
- Fields: Date, location, crime type, description, IUCR codes
- Loading: DuckDB `read_csv_auto()` for automatic type inference

**Mock Data Mode:**
- Enabled via `USE_MOCK_DATA=true` or `DISABLE_DUCKDB=true`
- Returns synthetic metadata and simulated crime data
- Used when DuckDB unavailable or for demos

## Internal API Routes

**Crime Data API (Next.js API Routes):**
- `GET /api/crime/meta` - Dataset metadata (time range, bounds, crime types)
- `GET /api/crimes/range` - Crime records within time/location bounds
- `GET /api/crime/bins` - Aggregated crime counts for binning
- `GET /api/crime/facets` - Crime type breakdown/facets
- `GET /api/crime/stream` - Streaming crime data for real-time updates

**Analysis API:**
- `GET /api/adaptive/global` - Global adaptive binning statistics
- `GET /api/stkde/hotspots` - ST-KDE hotspot detection results

**Neighborhood API:**
- `GET /api/neighbourhood/poi` - Combined POI data (OSM + Chicago Data Portal)

**Study/Research API:**
- `POST /api/study/log` - Study logging endpoint

## Authentication & Identity

**Auth Provider:** None
- No authentication/authorization implemented
- All API routes are publicly accessible
- No user management or session handling

## Monitoring & Observability

**Error Tracking:** None
- No external error tracking (Sentry, Bugsnag, etc.)
- Errors logged to console via `console.error`

**Logs:**
- Server-side: `console.log`/`console.error` in API routes and DuckDB operations
- Client-side: `console` for warnings/errors
- Log files: `.dev-server.log` in root (development server output)

## CI/CD & Deployment

**Hosting:** Not detected
- No Vercel, AWS, or other hosting configuration found
- Standard Next.js deployment target (Node.js server)

**CI Pipeline:** None detected
- No GitHub Actions workflows found
- No external CI/CD configuration

## Environment Configuration

**Required env vars:**
- None strictly required (works with mock data fallback)

**Optional env vars:**
- `USE_MOCK_DATA` - Enable mock data mode (default: not set, uses DuckDB)
- `DISABLE_DUCKDB` - Alternative to USE_MOCK_DATA for disabling DuckDB
- `DUCKDB_PATH` - Custom path for DuckDB database file
- `STKDE_QA_FULL_POP_ENABLED` - Enable full population for ST-KDE QA

**Secrets location:**
- `.env` file (not committed to git per .gitignore)
- No secrets manager integration

## Webhooks & Callbacks

**Incoming:** None
- No webhook endpoints

**Outgoing:** None
- No outbound webhooks

---

*Integration audit: 2026-04-08*
