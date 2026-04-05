# Technology Stack Report

**Analysis Date:** 2026-04-02

## 1) Languages

- **TypeScript (primary)** for app, API routes, hooks, stores, and workers across `src/**/*.ts` and `src/**/*.tsx` (e.g., `src/app/api/crimes/range/route.ts`, `src/store/useTimelineDataStore.ts`, `src/workers/adaptiveTime.worker.ts`).
- **JavaScript (secondary)** for utility/dev scripts (e.g., `scripts/setup-data.js`).
- **Python (secondary/offline pipeline)** for dataset preprocessing in `datapreprocessing/pipeline.py`.

## 2) Frameworks & Core Runtime

- **Next.js 16.1.6** (`package.json`) with **App Router** layout/page structure (`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/**/route.ts`).
- **React 19.2.3** + **React DOM 19.2.3** (`package.json`).
- API handlers requiring DuckDB explicitly force **Node runtime** (`export const runtime = 'nodejs'`) in server routes like:
  - `src/app/api/crime/stream/route.ts`
  - `src/app/api/crimes/range/route.ts`
  - `src/app/api/neighbourhood/poi/route.ts`
  - `src/app/api/stkde/hotspots/route.ts`

## 3) Package Manager & Dependency Locking

- **pnpm** is the effective package manager:
  - lockfile present: `pnpm-lock.yaml` (lockfileVersion 9)
  - workspace config: `pnpm-workspace.yaml`
- No npm/yarn lockfiles detected.
- `pnpm-workspace.yaml` contains `onlyBuiltDependencies: [duckdb]` to allow native build for DuckDB.

## 4) Build, Dev, Lint, Typecheck, Test Tooling

From `package.json` scripts:

- `dev`: `next dev`
- `build`: `NEXT_DISABLE_TURBOPACK=1 next build`
- `start`: `next start`
- `lint`: `eslint`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest`

Tool configs:

- **TypeScript** strict mode and path alias `@/* -> ./src/*` in `tsconfig.json`.
- **ESLint 9 + eslint-config-next (core-web-vitals + typescript)** in `eslint.config.mjs`.
- **Vitest 4** (`vitest.config.mts`) with node environment and test include pattern `src/**/*.test.ts(x)`.
- **Tailwind CSS v4 via PostCSS** in `postcss.config.mjs` and deps `tailwindcss`, `@tailwindcss/postcss`.
- **shadcn/ui config** in `components.json` (new-york style, alias mapping).

## 5) Data, Query, and Visualization Stack

### Data access and backend query path

- **DuckDB (Node binding)** for local analytical querying (`duckdb` dep in `package.json`), initialized in `src/lib/db.ts`.
- CSV-backed querying through DuckDB in routes like `src/app/api/crime/meta/route.ts` and `src/app/api/crime/stream/route.ts`.
- Query layer composed in `src/lib/queries.ts` and `src/lib/queries/*`.

### Frontend data + state

- **TanStack Query v5** for server-state fetching/caching (`src/providers/QueryProvider.tsx`, `src/hooks/useCrimeData.ts`).
- **Zustand v5** for client state stores (`src/store/*.ts`).

### Rendering/vis

- **Three.js + React Three Fiber + drei** (`src/components/viz/*`, `src/components/map/MapHeatmapOverlay.tsx`).
- **MapLibre GL + react-map-gl/maplibre** (`src/components/map/MapEventLayer.tsx`).
- **Apache Arrow** for stream format and client/server parsing (`src/app/api/crime/stream/route.ts`, `src/hooks/useCrimeStream.ts`).
- **D3 + Visx** present for charting/interaction dependencies (`package.json`, timeline/map components).

## 6) External Services & Integrations

### Public APIs

- **Chicago Data Portal SODA API** via `https://data.cityofchicago.org/resource` in `src/lib/neighbourhood/chicago.ts`.
  - Endpoints used:
    - `/6pth-rz8e.json` (business licenses)
    - `/pxu2-2i9s.json` (land use)
- **OpenStreetMap Overpass API** via `https://overpass-api.de/api/interpreter` in `src/lib/neighbourhood/osm.ts`.

### Third-party map style hosting

- **Carto basemap style URLs** referenced in `src/lib/palettes.ts`.

### Logging/output sink

- Study logs are persisted locally to `logs/study-sessions.jsonl` via `src/app/api/study/log/route.ts` (filesystem append, not external SaaS).

## 7) Environment & Runtime Configuration

Detected env variables in code:

- `USE_MOCK_DATA` / `DISABLE_DUCKDB` (`src/lib/db.ts`)
- `DUCKDB_PATH` (`src/lib/db.ts`)
- `STKDE_QA_FULL_POP_ENABLED` (`src/app/api/stkde/hotspots/route.ts`)
- `.env` currently sets `USE_MOCK_DATA=false` (`.env`).

Runtime behavior:

- System supports a **mock-data fallback path** when DB is disabled/unavailable (`src/lib/db.ts`, `src/app/api/crimes/range/route.ts`, `src/app/api/crime/meta/route.ts`).
- `next.config.ts` sets `serverExternalPackages: ["duckdb"]` for server bundling compatibility.

## 8) Deployment/CI Signals

- No deployment manifest detected (`vercel.json`, `netlify.toml`, `Dockerfile*` not found).
- No CI workflows detected under `.github/workflows/`.
- App is currently configured as a local/server runtime Next app with Node-dependent API routes due to DuckDB.

## 9) Key Dependencies (High Impact)

- `next`, `react`, `react-dom` — application framework/runtime (`package.json`).
- `duckdb` — local analytical datastore/query engine (`src/lib/db.ts`, `package.json`).
- `@tanstack/react-query` — async data orchestration (`src/providers/QueryProvider.tsx`).
- `zustand` — client state management (`src/store/*`).
- `three`, `@react-three/fiber`, `@react-three/drei` — 3D rendering pipeline (`src/components/viz/*`).
- `maplibre-gl`, `react-map-gl` — map rendering/interactions (`src/components/map/*`).
- `apache-arrow` + `@loaders.gl/*` — columnar/stream data path (`src/app/api/crime/stream/route.ts`, `src/hooks/useCrimeStream.ts`).

## 10) Notable Gaps / Operational Notes

- Node/PNPM version pin files (`.nvmrc`, `.node-version`) are not detected.
- Python preprocessing exists (`datapreprocessing/pipeline.py`) but no Python dependency manifest (`requirements*.txt`, `pyproject.toml`) is detected.
- CI/CD pipeline configuration is not present in repository metadata files.
