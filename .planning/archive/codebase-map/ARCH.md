# Architecture Map

**Analysis Date:** 2026-04-02

## 1) System Topology

- **Primary architecture:** single Next.js App Router application in `src/app/` serving both UI routes and server API routes.
- **Frontend runtime:** React client components (heavy stateful views) in `src/app/**/page.tsx` and `src/components/**`.
- **Backend runtime:** Next route handlers in `src/app/api/**/route.ts` (Node runtime explicitly set for DuckDB-heavy endpoints).
- **Data/compute plane:** in-process DuckDB + CSV/parquet querying in `src/lib/db.ts`, `src/lib/queries.ts`, `src/lib/duckdb-aggregator.ts`.
- **Async compute offloading:** browser Web Workers in `src/workers/adaptiveTime.worker.ts` and `src/workers/stkdeHotspot.worker.ts`.

## 2) Entry Points

### App shell and providers
- Global layout: `src/app/layout.tsx`
  - mounts `ThemeProvider` (`src/components/layout/ThemeProvider.tsx`)
  - mounts React Query provider `src/providers/QueryProvider.tsx`
  - mounts shared UI overlays (`Toaster`, onboarding)

### Route entry points
- Landing/navigation hub: `src/app/page.tsx`
- Main dashboard variants:
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard-v2/page.tsx`
- Timeslicing workflows:
  - `src/app/timeslicing/page.tsx`
  - `src/app/timeslicing-algos/page.tsx` → `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx`
- STKDE route:
  - `src/app/stkde/page.tsx` → `src/app/stkde/lib/StkdeRouteShell.tsx`
- Stats route:
  - `src/app/stats/page.tsx` → `src/app/stats/lib/StatsRouteShell.tsx`

### API entry points
- Crime data and metadata:
  - `src/app/api/crimes/range/route.ts`
  - `src/app/api/crime/stream/route.ts`
  - `src/app/api/crime/meta/route.ts`
  - `src/app/api/crime/facets/route.ts`
  - `src/app/api/crime/bins/route.ts`
- Adaptive maps:
  - `src/app/api/adaptive/global/route.ts`
- STKDE hotspot compute:
  - `src/app/api/stkde/hotspots/route.ts`
- Neighbourhood enrichment:
  - `src/app/api/neighbourhood/poi/route.ts`
- Study logging:
  - `src/app/api/study/log/route.ts`

## 3) Major Modules and Responsibilities

### A. Presentation and interaction layer
- `src/components/map/**`: map rendering, spatial selection, overlays (`MapVisualization.tsx`, `MapStkdeHeatmapLayer.tsx`)
- `src/components/viz/**`: 3D cube and linked visual state (`CubeVisualization.tsx`, `MainScene`)
- `src/components/timeline/**`: timeline rendering + brushing + tick logic (`DualTimeline.tsx`)
- `src/app/**/lib/*RouteShell.tsx`: route composition shells for verticals (stats/stkde/timeslicing-algos)

### B. Client state orchestration layer (Zustand)
- Shared coordination: `src/store/useCoordinationStore.ts`
- Time/filter/view state:
  - `src/lib/stores/viewportStore.ts`
  - `src/store/useFilterStore.ts`
  - `src/store/useTimeStore.ts`
- Data/adaptive maps:
  - `src/store/useTimelineDataStore.ts`
  - `src/store/useAdaptiveStore.ts`
- Slice domain (modularized state machine):
  - root: `src/store/useSliceDomainStore.ts`
  - sub-slices: `src/store/slice-domain/createSliceCoreSlice.ts`, `createSliceCreationSlice.ts`, `createSliceAdjustmentSlice.ts`, `createSliceSelectionSlice.ts`
- Feature toggles and STKDE state:
  - `src/store/useFeatureFlagsStore.ts`
  - `src/store/useStkdeStore.ts`

### C. Data access and compute layer (server/lib)
- DB initialization and dataset paths: `src/lib/db.ts`
- Query/aggregation services:
  - `src/lib/queries.ts`
  - `src/lib/queries/**`
  - `src/lib/duckdb-aggregator.ts`
- STKDE algorithms and contracts:
  - `src/lib/stkde/compute.ts`
  - `src/lib/stkde/contracts.ts`
  - `src/lib/stkde/full-population-pipeline.ts`
- Neighbourhood enrichment clients:
  - `src/lib/neighbourhood/index.ts`
  - `src/lib/neighbourhood/osm.ts`
  - `src/lib/neighbourhood/chicago.ts`

### D. Worker compute layer
- Adaptive timeline maps from timestamp arrays: `src/workers/adaptiveTime.worker.ts`
- STKDE hotspot projection/filtering for UI: `src/workers/stkdeHotspot.worker.ts`

## 4) Layering and Boundaries

### Practical layering
1. **Route/page composition** (`src/app/**/page.tsx`, `*RouteShell.tsx`)
2. **Reusable UI components** (`src/components/**`)
3. **Client orchestration hooks + stores** (`src/hooks/**`, `src/store/**`, `src/lib/stores/**`)
4. **Server route handlers** (`src/app/api/**/route.ts`)
5. **Domain/data services** (`src/lib/**`)
6. **Infrastructure dependencies** (DuckDB, filesystem, external HTTP APIs)

### Boundary rules observed in code
- UI fetches server data through HTTP endpoints (e.g., `useCrimeData` in `src/hooks/useCrimeData.ts` calls `/api/crimes/range`), not direct DB access.
- API routes call domain/query libraries (`src/lib/queries.ts`, `src/lib/stkde/compute.ts`) and return normalized JSON/Arrow payloads.
- Cross-panel synchronization is centralized in stores (`useCoordinationStore`, `useFilterStore`, `useSliceDomainStore`) instead of direct component-to-component coupling.
- Heavy compute is shifted from render paths to workers (`useAdaptiveStore` → `adaptiveTime.worker.ts`, STKDE row projection worker in `useDashboardStkde.ts`).

## 5) Core Data Flows

### Flow A — Crime timeline/map/cube synchronization
1. Route/page determines time domain (`src/app/dashboard-v2/page.tsx`, `src/app/timeslicing/page.tsx`).
2. `useCrimeData` (`src/hooks/useCrimeData.ts`) fetches `/api/crimes/range`.
3. API route `src/app/api/crimes/range/route.ts` queries via `queryCrimeCount` / `queryCrimesInRange` in `src/lib/queries.ts`.
4. UI writes transformed points into `useTimelineDataStore` and triggers `useAdaptiveStore.computeMaps(...)`.
5. `useAdaptiveStore` posts timestamps to `src/workers/adaptiveTime.worker.ts` and stores returned `densityMap/warpMap/burstinessMap`.
6. `DualTimeline` + map + cube read shared stores and stay synchronized (`useCoordinationStore`, `useFilterStore`, `useViewportStore`).

### Flow B — STKDE investigation flow
1. UI triggers run from `src/components/stkde/DashboardStkdePanel.tsx` or `src/app/stkde/lib/StkdeRouteShell.tsx`.
2. POST to `src/app/api/stkde/hotspots/route.ts`.
3. Route validates (`src/lib/stkde/contracts.ts`) and computes using:
   - sampled path: `queryCrimesInRange` + `computeStkdeFromCrimes`
   - full-population path: `buildFullPopulationStkdeInputs` + `computeStkdeFromAggregates`
4. Response is payload-guarded and returned to UI.
5. Client optionally re-filters/sorts hotspots in worker `src/workers/stkdeHotspot.worker.ts`.
6. Selected hotspot updates shared filters/time-range and map overlays via `useStkdeStore`, `useFilterStore`, `useCoordinationStore`.

### Flow C — Neighbourhood enrichment flow
1. Client requests `/api/neighbourhood/poi`.
2. Route `src/app/api/neighbourhood/poi/route.ts` caches response by rounded bbox.
3. Service `src/lib/neighbourhood/index.ts` aggregates:
   - Overpass OSM (`src/lib/neighbourhood/osm.ts`)
   - Chicago Data Portal (`src/lib/neighbourhood/chicago.ts`)
4. Aggregated summary returned to route UI panels.

## 6) Integration Points (Frontend ↔ Backend ↔ Infra)

### Frontend ↔ Backend contracts
- JSON contracts for most endpoints (`/api/crimes/range`, `/api/stkde/hotspots`, `/api/neighbourhood/poi`).
- Arrow stream contract for high-volume stream endpoint (`/api/crime/stream` using `apache-arrow`).
- Query parameter contracts are explicit in route handlers (epoch ranges, filters, limits).

### Backend ↔ Infra
- Local dataset/filesystem:
  - source CSV in `data/sources/` referenced by `src/lib/db.ts`
  - DuckDB file in `data/cache/crime.duckdb` (default in `src/lib/db.ts`)
- External HTTP APIs:
  - OSM Overpass in `src/lib/neighbourhood/osm.ts`
  - Chicago Data Portal in `src/lib/neighbourhood/chicago.ts`

### Runtime and deployment implications
- Several API routes force Node runtime (`export const runtime = 'nodejs'`) due to DuckDB/native module usage.
- `next.config.ts` sets `serverExternalPackages: ["duckdb"]` to keep DuckDB server-side externalized.
- `package.json` postinstall patches DuckDB binary symlink, indicating native binding dependency constraints.

## 7) Architectural Characteristics

- **Single-repo monolith with vertical routes:** dashboard/timeslicing/stats/stkde coexist in one app with shared stores/utilities.
- **Store-centric interaction model:** cross-view coupling is mediated by Zustand stores rather than prop drilling.
- **Algorithm-heavy client UX:** timeline/adaptive behavior uses workers and derived maps to keep interaction responsive.
- **Server compute hybrid:** APIs combine lightweight request validation/orchestration with nontrivial local analytics (DuckDB + STKDE kernels).
- **Graceful mock fallback path:** many data routes support demo/mock mode through `isMockDataEnabled()` in `src/lib/db.ts`.

## 8) Boundary Risks to Watch

- `src/components/timeline/DualTimeline.tsx` is a large multi-responsibility component (rendering + interaction + store synchronization), making timeline behavior changes high-impact.
- Data access patterns are partially split between CSV-backed query builders (`src/lib/queries.ts`) and parquet-specific endpoint logic (`src/app/api/crime/facets/route.ts`), so schema/format changes can diverge by endpoint.
- Client routes (e.g., `src/app/dashboard-v2/page.tsx`, `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx`) perform orchestration logic in-page; keep shared domain logic in `src/lib/**` or store modules when extending.
