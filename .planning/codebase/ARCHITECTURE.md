# Architecture

**Analysis Date:** 2026-06-10

## Pattern Overview

**Overall:** Feature-grouped monorepo-style Next.js App Router with client-heavy visualization, server-side DuckDB data processing, and workflow-oriented multi-panel dashboards.

**Key Characteristics:**
- **Multiple independent "view apps"** — Pages at `/dashboard`, `/dashboard-demo`, `/stkde-3d`, `/stats`, `/timeline-test`, `/timeslicing`, `/cube-sandbox` are largely self-contained with their own components, hooks, and lib modules under `src/app/<view>/`. They share types, stores, core lib modules, and UI components.
- **Zustand stores with slice-domain pattern** — Complex stores (e.g., `useSliceDomainStore`) are composed from multiple slice-creator functions (`createSliceCoreSlice`, `createSliceSelectionSlice`, `createSliceCreationSlice`, `createSliceAdjustmentSlice`) allowing separated concerns in a single store.
- **Coordination store as cross-panel sync bus** — `useCoordinationStore` tracks selection source (`cube | timeline | map`), sync status (`syncing | synchronized | partial`), brush range, burst windows, and workflow phase (`generate | review | applied | refine`). All three panels (Map, Cube, Timeline) read from and write to it.
- **DuckDB for batch analytics, TanStack Query for client-server state** — Heavy aggregation queries (binning, STKDE, stats summaries, adaptive maps) happen server-side via DuckDB; results are cached client-side with `@tanstack/react-query`.
- **Apache Arrow for streaming large datasets** — `/api/crime/stream` returns Arrow IPC format instead of JSON for efficient transfer of millions of points.
- **Web Workers for off-main-thread computation** — `adaptiveTime.worker.ts` and `stkdeHotspot.worker.ts` perform adaptive scaling and STKDE computation without blocking the UI.
- **Graceful degradation to mock data** — Every API route and data module checks `isMockDataEnabled()` and falls back to generated mock data with `X-Data-Warning` response headers.

## Layers

**Pages / App Router (`src/app/`):**
- Purpose: Route definitions, page-level composition, server components where possible
- Location: `src/app/<route>/page.tsx`
- Contains: Page components, route-specific `components/`, `hooks/`, `lib/` subdirectories
- Depends on: All other layers
- Used by: Next.js router

**Components (`src/components/`):**
- Purpose: Reusable React components organized by feature/domain
- Location: `src/components/<domain>/`
- Contains: `viz/` (3D cube, scenes, point clouds), `map/` (MapLibre GL layers, overlays), `timeline/` (dual timeline with brush, density tracks, axes), `dashboard/` (headers), `dashboard-demo/` (demo-specific shell, panels, tabs), `ui/` (shadcn-based primitives), `layout/` (DashboardLayout, ThemeProvider, TopBar), `settings/`, `stkde/`, `study/`, `onboarding/`, `binning/`, `timeslicing/`
- Depends on: Stores, hooks, lib utilities, types
- Used by: Pages

**Hooks (`src/hooks/`):**
- Purpose: Shared React hooks for data fetching, selection, debouncing, logging, and viewport management
- Location: `src/hooks/use*.ts`
- Contains: `useCrimeData`, `useCrimeStream`, `useCrimePointCloud`, `useDebouncedDensity`, `useViewportCrimeData`, `useSuggestionGenerator`, `useDraggable`, `useDualTimelineScales`, `useSelectionSync`, `useURLFeatureFlags`, `useLogger`, `useSmartProfiles`, `useContextExtractor`, `useAdaptiveScale`, `useSliceStats`, `useMeasure`, `useDebounce`
- Depends on: Stores, lib utilities, types
- Used by: Components, page-level code

**Stores (`src/store/`):**
- Purpose: Client-side state management via Zustand
- Location: `src/store/use*Store.ts`
- Contains: ~35 stores covering filters, time, slices, coordination, adaptive settings, STKDE, layout, feature flags, themes, heatmaps, clustering, suggestions, warping, trajectories, study state, presets, aggregation, binnning, cube constraints, intervals, and more
- Subdir `slice-domain/`: Composite store pattern — `types.ts`, `selectors.ts`, `createSliceCoreSlice.ts`, `createSliceSelectionSlice.ts`, `createSliceCreationSlice.ts`, `createSliceAdjustmentSlice.ts`
- Depends on: Types, lib (selectors, constants)
- Used by: Components, hooks, other stores

**Lib / Business Logic (`src/lib/`):**
- Purpose: Pure functions, database queries, analytics computations, utilities
- Location: `src/lib/`
- Contains: `db.ts` (DuckDB connection), `queries/` (builders, filters, sanitization, aggregations), `binning/` (time binning engine, rules, warp-scaling, burst taxonomy), `stkde/` (STKDE computation, burst evolution, slice comparison), `adaptive/` (binning mode routing), `kde/` (slice-level KDE), `clustering/` (cluster analysis), `suggestion/` (events), `stats/` (aggregation, temporal pulses), `context-diagnostics/` (spatial, temporal, profile comparison), `data/` (selectors, types), `stores/` (viewportStore), `motion/` (easing, aging), `neighbourhood/` (Chicago OSM data), `evolution/` (evolution flow), top-level files (`selection.ts`, `slice-utils.ts`, `warp-generation.ts`, `burst-detection.ts`, `full-auto-orchestrator.ts`, `coordinate-normalization.ts`, `date-normalization.ts`, `logger.ts`, `interval-detection.ts`, `trajectories.ts`, `time-domain.ts`, `mockData.ts`, etc.)
- Depends on: Types, database (DuckDB)
- Used by: Stores, hooks, API routes, workers

**API Routes (`src/app/api/`):**
- Purpose: Next.js Route Handlers for data serving
- Location: `src/app/api/<domain>/<endpoint>/route.ts`
- Contains: `/api/crime/stream` (Arrow IPC streaming), `/api/crime/bins` (aggregated bins), `/api/crime/meta` (dataset metadata), `/api/crime/overview` (sampled timestamps), `/api/crime/stats-summary` (temporal statistics), `/api/crime/facets` (type/district facet counts), `/api/crimes/range` (viewport-based crime data), `/api/adaptive/global` (density/count/burstiness/warp maps), `/api/adaptive/bursts` (burst windows), `/api/stkde/hotspots` (STKDE hotspot computation), `/api/neighbourhood/poi` (points of interest), `/api/study/log` (user study logging)
- Depends on: Lib modules (db, queries, adapters), DuckDB
- Used by: Client hooks (via TanStack Query)

**Workers (`src/workers/`):**
- Purpose: Web Workers for CPU-intensive computation
- Location: `src/workers/*.worker.ts`
- Contains: `adaptiveTime.worker.ts` (adaptive time scaling), `stkdeHotspot.worker.ts` (STKDE hotspot ML detection), `kdeSlice.worker.ts` (slice-level KDE)
- Depends on: Lib modules (serialized data)
- Used by: Stores, hooks

**Types (`src/types/`):**
- Purpose: Canonical type definitions shared across the application
- Location: `src/types/*.ts`
- Contains: `crime.ts` (CrimeRecord, CrimeViewport, UseCrimeDataOptions/Result), `adaptive.ts` (AdaptiveBinningMode), `autoProposalSet.ts` (AutoProposalSet, AutoProposalWarpProfile), `data.ts` (ColumnarData), `suggestion.ts` (Suggestion types), `index.ts` (re-exports and generic types like CrimeEvent, Bin)
- Depends on: None
- Used by: All layers

## Data Flow

**Crime Data Query Flow (primary read path):**

1. Component calls `useCrimeData({ startEpoch, endEpoch, ...filters })` from `src/hooks/useCrimeData.ts`
2. Hook calls `useQuery` from TanStack Query with viewport-aware query key
3. Query function calls `GET /api/crimes/range?startEpoch=...&endEpoch=...`
4. API route (`src/app/api/crimes/range/route.ts`) uses `queryCrimesInRange()` from `src/lib/queries/index.ts`
5. Query is built by `buildCrimesInRangeQuery()` from `src/lib/queries/builders.ts` using sanitized parameters
6. DuckDB executes the SQL via `db.all()` — queries `read_csv_auto` on the CSV or `crimes_sorted` table
7. Results are returned as JSON with metadata (buffer info, sample stride, total matches)
8. Hook returns `{ data, meta, isLoading, isFetching, error, bufferedRange }`

**3D Bin Aggregation Flow:**

1. Component requests binned data via `/api/crime/bins?resX=32&resY=16&resZ=32&startTime=...&endTime=...`
2. API route calls `getAggregatedBins()` from `src/lib/duckdb-aggregator.ts`
3. DuckDB query groups crime records into 3D spatial-temporal bins
4. Returns `Bin[]` array with `{ x, y, z, count, dominantType }`

**Adaptive Time Scaling Flow:**

1. `useAdaptiveStore` triggers Web Worker (`src/workers/adaptiveTime.worker.ts`) with crime data and parameters
2. Worker processes burstiness detection, warp map generation, adaptive binning
3. Worker posts result back to store
4. Store updates `warpFactor`, adaptive scale data
5. Timeline component (`DualTimeline.tsx`) reads adaptive data and renders scaled axes

**Selection/Coordination Flow (cross-panel sync):**

1. User interacts with one panel (e.g., clicks a point in the Cube)
2. Source panel calls `coordinationStore.commitSelection(index, 'cube')`
3. `syncStatus` is set to `'syncing'`
4. Other panels reconcile via `coordinationStore.reconcileSelection({ isValid, reason, panel })`
5. Each panel reads `selectedIndex` and adjusts its view
6. `syncStatus` returns to `'synchronized'` or stays `'partial'` with a reason
7. `panelNoMatch` map tracks per-panel reconciliation failures

**State Management:**
- **Zustand** for global/shared UI state (~35 stores)
- **TanStack Query** for server state (crime data, stats, adaptive maps)
- **React `useState`/`useCallback`** for ephemeral component state
- **`zustand/middleware/persist`** for persistent state (slice domain store persists slices to localStorage)
- **Manual localStorage** for filter presets (`useFilterStore`)
- **No React Context** for state management (QueryProvider is the single exception for TanStack Query)

## Key Abstractions

**CrimeRecord (`src/types/crime.ts`):**
- Purpose: Canonical crime data format used across all data fetching, visualization, and analysis
- Fields: `timestamp`, `lat`, `lon`, `x`, `z`, `type`, `district`, `year`, `iucr`
- Pattern: Normalized spatial coordinates (`x`, `z` in [-50, +50] range) alongside geographic (`lat`, `lon`). Normalization done by `lonLatToNormalized()` in `src/lib/coordinate-normalization.ts`

**TimeSlice (`src/store/slice-domain/types.ts`):**
- Purpose: Represents a time selection (point or range) in the adaptive time slicing workflow
- Fields: `id`, `type` ('point' | 'range'), `time`, `range`, `isLocked`, `isVisible`, `source`, `burstClass`, `burstScore`, `warpEnabled`, `warpWeight`
- Pattern: Immutable-ish with creator functions, supports burst metadata, warping, and locking

**DualTimeline (`src/components/timeline/DualTimeline.tsx`):**
- Purpose: Dual-panel timeline with overview (sampled) and detail (full resolution) views
- Pattern: Uses D3 scales, SVG layers (`AxisLayer`, `HistogramLayer`, `MarkerLayer`), brush-based zoom sync
- Hooks: `useBrushZoomSync`, `useScaleTransforms`, `usePointSelection`, `useDualTimelineViewModel`

**Query Builder (`src/lib/queries/builders.ts`):**
- Purpose: Build type-safe DuckDB SQL queries with parameterized filters
- Pattern: Fluent API with `buildCrimesInRangeQuery()`, `buildCrimeCountQuery()`, `buildSpatialBinIndexSql()`. Uses sanitization via `sanitizeTableName()`, `clampPositiveInt()`. Filters composed in `buildCrimeRangeFilters()` from `src/lib/queries/filters.ts`.

**DashboardDemoShell (`src/components/dashboard-demo/DashboardDemoShell.tsx`):**
- Purpose: Main layout orchestrator for the demo workspace
- Pattern: Shell with left content area (map/3D toggle + timeline) and right rail. Manages viewport switching, burst generation, slice application, and auto-switching between map and 3D views.

**CoordinationStore (`src/store/useCoordinationStore.ts`):**
- Purpose: Cross-panel synchronization bus
- Pattern: Single Zustand store with `selectedIndex`, `selectedSource`, `syncStatus`, `panelNoMatch` map, `brushRange`, `selectedBurstWindows`, `workflowPhase`. Acts as the source of truth for which data point is "active" across all three views.

## Entry Points

**Root Layout (`src/app/layout.tsx`):**
- Triggers: All page routes
- Responsibilities: Geist font loading, `ThemeProvider`, `QueryProvider` (TanStack Query), `Toaster` (Sonner), `OnboardingTour` (driver.js)
- Pattern: Server component wrapping children with providers

**Home Page (`src/app/page.tsx`):**
- Triggers: `/` route
- Responsibilities: Landing page with links to `/demo/non-uniform-time-slicing` and `/stkde-3d`

**Dashboard (`src/app/dashboard/page.tsx`):**
- Triggers: `/dashboard`
- Responsibilities: Main visualization layout — `DashboardLayout` with `MapVisualization`, `CubeVisualization`, `TimelinePanel`, `StudyControls`, `ContextualSlicePanel`, `DashboardHeader`

**Dashboard Demo (`src/app/dashboard-demo/page.tsx`):**
- Triggers: `/dashboard-demo`
- Responsibilities: Refined demo workspace — `DashboardDemoShell` wrapping interactive map/3D toggle, timeline, and right rail tab panel

**STKDE 3D (`src/app/stkde-3d/page.tsx`):**
- Triggers: `/stkde-3d`
- Responsibilities: Full 3D STKDE visualization with `Stkde3DScene`, `StkdeSliceStack`, `SliceScrubber`, `SliceInspector`, `KdeTuningPanel`

**API Crime Stream (`src/app/api/crime/stream/route.ts`):**
- Triggers: `GET /api/crime/stream?startDate=...&endDate=...&crimeTypes=...&maxRows=...`
- Responsibilities: Returns Apache Arrow IPC stream of crime records for large dataset transfer
- Runtime: `nodejs` with `force-dynamic`

**API Crimes Range (`src/app/api/crimes/range/route.ts`):**
- Triggers: `GET /api/crimes/range?startEpoch=...&endEpoch=...&bufferDays=...&limit=...`
- Responsibilities: Primary viewport-based crime data endpoint. Applies buffer zones, sampling, and filter parameters. Returns JSON with metadata.

**API Adaptive Global (`src/app/api/adaptive/global/route.ts`):**
- Triggers: `GET /api/adaptive/global?binCount=...&kernelWidth=...&binningMode=...`
- Responsibilities: Returns density map, count map, burstiness map, and warp map for adaptive time scaling

## Error Handling

**Strategy:** Graceful degradation with mock data fallback across all layers.

**Patterns:**
- **API routes** wrap logic in `try/catch` blocks; on error, return mock data with `status: 200` and `X-Data-Warning` header explaining the fallback reason (e.g., "Using demo data - database unavailable")
- **Client hooks** (`useCrimeData`, `useViewportCrimeData`) expose `isLoading`, `isFetching`, `error` properties from TanStack Query. Errors are caught in fetch functions and re-thrown as descriptive error messages
- **Stores** use `isLoading` / `error` fields for async operations (e.g., `useAdaptiveStore`, `useStkdeStore`)
- **Components** test for `error !== null` and render fallback UI (see `ErrorDialog` in `src/components/ui/error-dialog.tsx` for reusable alert dialog with retry and expandable stack trace)
- **Mock data generation** (`src/lib/mockData.ts`) used throughout for development without the real dataset
- **UI components pattern:** `Suspense` boundaries at page level for async component loading (e.g., `DashboardHeader` wrapped in `Suspense`)

## Cross-Cutting Concerns

**Logging:**
- `src/lib/logger.ts` — Custom `LoggerService` class that batches events and flushes periodically using `navigator.sendBeacon` with fallback to `fetch` POST
- `src/hooks/useLogger.ts` — Hook wrapper for component-level logging
- Backend logging via `POST /api/study/log` endpoint

**Validation:**
- Query parameter sanitization in `src/lib/queries/sanitization.ts` (table name, integer clamping)
- Type guards and range validation in query builders (`src/lib/queries/filters.ts`)
- Epoch range validation in `src/hooks/useCrimeData.ts` (`normalizeEpochRange`, `hasValidEpochRange`)
- Coordinate validation in `src/lib/coordinate-normalization.ts`

**Coordinate Normalization:**
- `src/lib/coordinate-normalization.ts` — `lonLatToNormalized(lon, lat)` maps geographic coordinates to normalized `(x, z)` in [-50, +50] range. `unproject(x, z)` reverses the mapping. All crime data ingested through the API gets this transformation. Configurable through `CHICAGO_BOUNDS` and `NORMALIZED_COORDINATE_RANGE` constants.

**Date Handling:**
- `src/lib/date-normalization.ts` — Date string parsing and normalization utilities
- `src/lib/date-formatting.ts` — Date formatting for display
- `src/lib/time-domain.ts` — Normalized time ↔ epoch seconds conversion (`normalizedToEpochSeconds`, `resolutionToNormalizedStep`)
- All dates internally stored as Unix epoch seconds (number)

**Caching Strategy:**
- TanStack Query with 5-minute stale time for crime data
- Manual cache invalidation via query key changes when viewport updates
- HTTP cache headers: `Cache-Control: no-store` for dynamic data, `public, s-maxage=60, stale-while-revalidate=30` for cacheable aggregations
- Nothing persisted beyond localStorage for slice state and filter presets

---

*Architecture analysis: 2026-06-01*
