# Architecture

**Analysis Date:** 2026-06-25

## Pattern Overview

**Overall:** Next.js 16 App Router with client-heavy visualization and server-side data processing. Multiple semi-independent visualization "apps" within a single Next.js instance, sharing a common data layer, state management patterns, and component library.

**Key Characteristics:**
- **Pages-as-views**: Each route (`/dashboard`, `/timeslicing`, `/stkde-3d`, `/stats`, etc.) acts as an independent application shell that composes shared components
- **Client-heavy SPA**: Visualization logic (Three.js, MapLibre, D3) runs entirely in the browser; the server primarily serves data via API routes
- **Zustand stores**: Global state is distributed across ~40+ specialized Zustand stores with a coordination store pattern for cross-view synchronization
- **Web Workers offloaded**: Heavy computation (adaptive time binning, STKDE hotspot filtering) runs in Web Workers (`src/workers/`)
- **DuckDB offline analytics**: All crime data (8.5M+ records) is processed locally via DuckDB with Apache Arrow for efficient streaming
- **Pure function business logic**: Core data processing lives in `src/lib/` as pure functions, usable from both server (API routes) and client (workers)

## Layers

**Pages/Routes Layer:**
- Purpose: Route-level entry points that compose feature components into full-page views
- Location: `src/app/`
- Contains: Next.js App Router page files, layouts, and API route handlers
- Depends on: Components, stores, hooks, lib modules
- Used by: Next.js framework

**Component Layer:**
- Purpose: React UI components organized by feature domain
- Location: `src/components/`
- Contains: Presentation components, visualization components, UI primitives, layout components
- Depends on: Stores, hooks, lib utilities
- Used by: Pages, other components

**State Layer (Zustand Stores):**
- Purpose: Global client-side state management
- Location: `src/store/`
- Contains: Domain-specific state stores (`useFilterStore`, `useAdaptiveStore`, `useCoordinationStore`, etc.), slice-domain store with composable slices
- Depends on: Types, lib utilities
- Used by: Components, hooks, other stores

**Business Logic Layer:**
- Purpose: Pure computation functions, data processing, query building
- Location: `src/lib/` (subdirectories: `queries/`, `binning/`, `stkde/`, `stats/`, `adaptive/`, etc.)
- Contains: Query builders, STKDE computation, time binning, burst detection, coordinate/date normalization
- Depends on: Types, database
- Used by: Stores, API routes, workers, hooks

**API/Data Layer:**
- Purpose: Server-side data access endpoints using DuckDB + Arrow
- Location: `src/app/api/`
- Contains: Next.js Route Handlers for crime data, binned data, STKDE, adaptive maps, neighborhood data
- Depends on: DuckDB, lib queries, coordinate normalization
- Used by: Client hooks via TanStack Query (React Query)

**Worker Layer:**
- Purpose: Offload heavy computation from main thread
- Location: `src/workers/`
- Contains: Web Workers for adaptive time computation and STKDE hotspot projection
- Depends on: Lib modules (imported at build time)
- Used by: Stores (create worker instances at module level)

**Types Layer:**
- Purpose: Shared TypeScript type definitions
- Location: `src/types/`
- Contains: Canonical type interfaces (`CrimeRecord`, `CrimeViewport`, `AdaptiveBinningMode`, `AutoProposalSet`)
- Depends on: None
- Used by: All layers

## Data Flow

**Crime Data Request Flow:**

1. Component mounts or viewport changes → Zustand store signals new time range
2. TanStack Query hook (`useCrimeData` in `src/hooks/useCrimeData.ts`) fires a GET to `/api/crimes/range` or `/api/crime/stream`
3. API route queries DuckDB with parameterized SQL, returns data as Apache Arrow IPC stream or JSON
4. TanStack Query caches response, returns `{ data, meta, isLoading, error }` to component
5. Component renders 3D cube (Three.js), 2D map (MapLibre), or timeline (D3/@visx)

**Adaptive Time Flow:**

1. User adjusts warp factor or binning mode → `useAdaptiveStore.computeMaps()` called
2. Worker (`adaptiveTime.worker.ts`) receives `Float32Array` of timestamps via `postMessage`
3. Worker computes density map, burstiness map, and warp map using configurable KDE
4. Worker sends results back to store via `onmessage`
5. Store updates `densityMap`, `burstinessMap`, `warpMap` → components re-render
6. Timeline and cube visualize warped time scale

**Slice Management Flow:**

1. Slices are created manually (drag on timeline), from burst auto-detection, or from binning proposals
2. `useSliceDomainStore` (composable store in `src/store/slice-domain/`) manages slice CRUD
3. `useCoordinationStore` tracks selected time index, brush range, and sync status across panels
4. When a slice is created/modified, changes propagate through store selectors to map, cube, and timeline components

**Cross-View Selection Synchronization:**

1. User interacts with cube (click point), timeline (brush), or map (select region)
2. Interaction calls `useCoordinationStore.setSelectedIndex()` or `setBrushRange()` with a `source` identifier
3. Other panels subscribe to coordination store and synchronize their visual state
4. `syncStatus` tracks whether all panels are synchronized or in a partial state

## Key Abstractions

**`CrimeRecord`** (`src/types/crime.ts`):
- Purpose: Canonical crime data format used throughout the application
- Fields: `id`, `timestamp` (epoch seconds), `lat`, `lon`, `x` (normalized), `z` (normalized), `type`, `district`, `year`, `iucr`
- Pattern: Normalized spatial coordinates (x, z) alongside geographic (lat, lon) for dual map/cube rendering
- Source: API response from `/api/crimes/range` or `/api/crime/stream`

**`TimeSlice`** (`src/store/slice-domain/types.ts`):
- Purpose: Represents a time selection (point or range) in the timeline
- Fields: `id`, `type` ('point'|'range'), `time`, `range`, `isLocked`, `isVisible`, `source`, burst classification fields
- Pattern: Immutable-ish with `isLocked`, `isVisible` flags; supports burst auto-detection metadata

**`SliceDomainState`** (`src/store/slice-domain/types.ts`):
- Purpose: Composite state type combining four slice management domains
- Composition: `SliceCoreState` + `SliceSelectionState` + `SliceCreationState` + `SliceAdjustmentState`
- Pattern: Zustand slice pattern — each domain is a separate `StateCreator` composed into the store

**Zustand Stores** (distributed across `src/store/`):
- Purpose: Client state management for every domain (filters, slices, adaptive, coordination, time, layout, theme, etc.)
- Examples: `useCoordinationStore`, `useAdaptiveStore`, `useSliceDomainStore`, `useFilterStore`, `useTimeStore`
- Pattern: Each store is a single `create()` call with typed state + actions interface
- Pattern: `useSliceDomainStore` uses `persist()` middleware + composable slice creators

**TanStack Query Hooks** (`src/hooks/useCrimeData.ts`, `useViewportCrimeData.ts`):
- Purpose: Server state management with caching, deduplication, retry
- Pattern: Hooks return `{ data, meta, isLoading, isFetching, error }` — consumers are decoupled from fetch mechanics
- Configuration: 5-minute stale time, 10-minute GC, no refetch on window focus

**Query Builders** (`src/lib/queries/`):
- Purpose: Type-safe DuckDB query construction with sanitization
- Exports: `builders.ts` (fluent query API), `filters.ts` (filter predicates), `sanitization.ts` (SQL injection guards), `aggregations.ts` (aggregate helpers)
- Pattern: Parameterized queries with typed interfaces

**Workers** (`src/workers/`):
- Purpose: Offload KDE computation and hotspot filtering from main thread
- Files: `adaptiveTime.worker.ts` (count map, density map, burstiness map, warp map), `stkdeHotspot.worker.ts` (filter/sort hotspots), `kdeSlice.worker.ts` (slice-based KDE)
- Pattern: Module-level worker instantiation with `requestId` to discard stale responses

## Entry Points

**Root Layout** (`src/app/layout.tsx`):
- Responsibilities: Theme provider, TanStack Query provider, toast notifications (Sonner), onboarding tour
- Composition order: `<ThemeProvider>` → `<QueryProvider>` → `{children}` → `<Toaster>` → `<OnboardingTour>`

**Landing Page** (`src/app/page.tsx`):
- Route: `/`
- Responsibilities: Navigation hub linking to /demo, /stkde-3d, /hotspot-evolution
- Server component (no `"use client"`)

### Page Routes

**`/dashboard`** (`src/app/dashboard/page.tsx`):
- Main visualization layout with map, cube, and timeline panels
- Composes: `DashboardLayout` (resizable panels), `MapVisualization`, `CubeVisualization`, `TimelinePanel`

**`/dashboard-demo`** (`src/app/dashboard-demo/page.tsx`):
- Refined demo interface with rail/tab navigation
- Composes: `DashboardDemoShell` → rail tabs (Configure, Detect, Inspect, Stats)

**`/dashboard-v2`** (`src/app/dashboard-v2/page.tsx`):
- Alternative dashboard version with hooks-based STKDE integration

**`/timeslicing`** (`src/app/timeslicing/page.tsx` + `layout.tsx`):
- Dedicated interface for time slicing workflow with suggestion panel and binning controls
- Composes: `DualTimeline`, `SuggestionPanel`, `BinningControls`

**`/stkde-3d`** (`src/app/stkde-3d/page.tsx`):
- 3D STKDE visualization with adaptive warp axis, slice stack, and trajectory overlays
- Uses: Three.js (R3F), MapLibre, custom 3D scene components

**`/stkde`** (`src/app/stkde/page.tsx`):
- 2D STKDE analysis view

**`/stats`** (`src/app/stats/page.tsx`):
- Statistical dashboard with neighborhood analysis, temporal patterns, district breakdowns

**`/timeline-test`** (`src/app/timeline-test/page.tsx`):
- Timeline interaction testbed with slice editing tools, snap modes, warp controls

**`/demo/non-uniform-time-slicing`** (`src/app/demo/non-uniform-time-slicing/page.tsx`):
- Interactive demo showcasing adaptive time scaling concepts

**`/evaluation`** (`src/app/evaluation/page.tsx`):
- User study evaluation interface with task cards, questionnaires, training gate

**`/hotspot-evolution`** (`src/app/hotspot-evolution/page.tsx`):
- Hotspot evolution flow visualization

**`/cube-sandbox`** (`src/app/cube-sandbox/page.tsx`):
- Standalone 3D cube sandbox for testing

### API Routes

**`/api/crime/stream/route.ts`** — GET: Stream crime data as Apache Arrow IPC, supports filtering by date range, crime types, districts, with optional mock data fallback. Uses `nodejs` runtime.

**`/api/crime/bins/route.ts`** — GET: Return aggregated 3D bins (x, y, z) with configurable resolution for cube visualization.

**`/api/crime/around/route.ts`** — GET: Crime data around a specific point.

**`/api/crime/facets/route.ts`** — GET: Faceted crime statistics.

**`/api/crime/meta/route.ts`** — GET: Dataset metadata (date range, record count).

**`/api/crime/overview/route.ts`** — GET: Overview statistics.

**`/api/crime/stats-summary/route.ts`** — GET: Statistical summary.

**`/api/crimes/range/route.ts`** — GET: Crime records within a date range (alternative to stream endpoint).

**`/api/adaptive/global/route.ts`** — GET: Precomputed global adaptive maps (density, burstiness, warp) with configurable bin count and kernel width.

**`/api/adaptive/bursts/route.ts`** — GET: Burst window detection results.

**`/api/stkde/hotspots/route.ts`** — POST: Compute STKDE hotspots from crime data with configurable compute mode.

**`/api/neighbourhood/poi/route.ts`** — GET: Points of interest data.

**`/api/study/log/route.ts`** — POST: Study evaluation event logging.

## Error Handling

**Strategy:** Graceful degradation with fallback data.

**API Route Pattern:**
- DuckDB queries wrapped in try/catch
- On DuckDB failure: return mock data with `X-Data-Warning` header
- On validation failure: return 400 with descriptive error message
- Generic 500 fallback with logged error

**Client Hook Pattern:**
- TanStack Query provides `error`, `isLoading`, `isFetching` states
- Hooks normalize API errors into typed error fields
- Components display loading skeletons or error states based on these fields

**Store Pattern:**
- Async actions (e.g., `computeMaps`) set `isComputing`/`isLoading` flags
- Workers detect stale requests via `requestId` and discard out-of-order responses

**Logger** (`src/lib/logger.ts`):
- Centralized `LoggerService` class with queued, acknowledged writes
- Uses `navigator.sendBeacon` during page unload for reliability
- Fallback to `fetch` POST
- Study-specific write helpers (`sessionStart`, `sessionEnd`, `trialComplete`, etc.)

## Cross-Cutting Concerns

**Logging:**
- `src/lib/logger.ts` — `LoggerService` class with buffered, acknowledged event writes
- `src/hooks/useLogger.ts` — `useLogger` hook for component-level logging
- Backend logging via `/api/study/log` endpoint for study data

**Validation:**
- Query parameter sanitization in `src/lib/queries/sanitization.ts`
- STKDE request validation in `src/lib/stkde/contracts.ts` with `validateAndNormalizeStkdeRequest`
- Type guards in query builders for SQL injection prevention

**Coordinate Normalization:**
- `src/lib/coordinate-normalization.ts` — `lonLatToNormalized()` converts geographic coordinates to normalized (-50, +50) space for 3D cube

**Date Normalization:**
- `src/lib/date-normalization.ts` — Date to/from epoch conversion
- `src/lib/time-domain.ts` — Normalized time domain [0, 100] to epoch mapping

**Feature Flags:**
- `src/store/useFeatureFlagsStore.ts` — Client-side feature flag toggles
- `src/lib/feature-flags.ts` — Feature flag logic
- URL-based overrides via `useURLFeatureFlags` hook

**Theming:**
- `src/store/useThemeStore.ts` — Theme state (dark, light, colorblind)
- `src/components/layout/ThemeProvider.tsx` — Applies theme classes to `document.documentElement`

---

*Architecture analysis: 2026-06-25*
