# Architecture

**Analysis Date:** 2026-04-08

## Pattern Overview

**Overall:** App Router feature shells + shared reactive state + compute-heavy domain services.

**Key Characteristics:**
- Route entry points live in `src/app/**/page.tsx` and assemble shared feature components.
- Client state is centralized in Zustand stores under `src/store/` and `src/lib/stores/`.
- Data-intensive work is pushed into `src/lib/**`, `src/workers/**`, and `src/app/api/**/route.ts`.

## Layers

**Routing and shells:**
- Purpose: define pages, route-local orchestration, and top-level composition.
- Location: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard-v2/page.tsx`, `src/app/timeslicing/page.tsx`, `src/app/timeslicing-algos/page.tsx`, `src/app/stkde/page.tsx`.
- Contains: page shells, route-specific panels, Suspense boundaries, URL syncing.
- Depends on: shared components, hooks, stores, and API routes.
- Used by: the Next.js App Router.

**Shared UI components:**
- Purpose: render maps, timelines, 3D scenes, controls, and panels.
- Location: `src/components/map/`, `src/components/timeline/`, `src/components/viz/`, `src/components/layout/`, `src/components/study/`, `src/components/binning/`.
- Contains: canvas/map visualizations, layout shells, controls, legends, overlays.
- Depends on: stores, hooks, and shared domain helpers.
- Used by: route shells and other feature modules.

**Domain state:**
- Purpose: keep cross-view state synchronized.
- Location: `src/store/useTimelineDataStore.ts`, `src/store/useAdaptiveStore.ts`, `src/store/useFilterStore.ts`, `src/store/useCoordinationStore.ts`, `src/store/useTimeslicingModeStore.ts`, `src/store/useSliceDomainStore.ts`, `src/store/useWarpSliceStore.ts`, `src/store/useBinningStore.ts`, `src/store/useStkdeStore.ts`.
- Contains: selection state, filters, generated slices, adaptive maps, workflow phase, persisted UI state.
- Depends on: `zustand`, browser storage, and compute helpers.
- Used by: most client components.

**Domain compute and data access:**
- Purpose: query crime data, build derived maps, and compute STKDE results.
- Location: `src/lib/queries/`, `src/lib/stkde/`, `src/lib/db.ts`, `src/lib/projection.ts`, `src/lib/selection.ts`, `src/lib/time-domain.ts`.
- Contains: SQL builders, sanitizers, caching logic, projection math, data contracts.
- Depends on: DuckDB, Apache Arrow, runtime env vars, and normalization helpers.
- Used by: API routes, stores, and route shells.

**Workers:**
- Purpose: offload expensive adaptive-map and hotspot projection work.
- Location: `src/workers/adaptiveTime.worker.ts`, `src/workers/stkdeHotspot.worker.ts`.
- Contains: pure compute functions and `self.onmessage` handlers.
- Depends on: typed inputs and transferables.
- Used by: `src/store/useAdaptiveStore.ts`, `src/app/stkde/lib/StkdeRouteShell.tsx`.

**API layer:**
- Purpose: provide server-backed crime streams and precomputed analysis payloads.
- Location: `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crimes/range/route.ts`, `src/app/api/adaptive/global/route.ts`, `src/app/api/stkde/hotspots/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, `src/app/api/study/log/route.ts`.
- Contains: dynamic Node.js handlers, mock-data fallbacks, JSON/Arrow serialization.
- Depends on: `src/lib/db.ts`, `src/lib/queries/`, `src/lib/stkde/`, `src/lib/neighbourhood`.
- Used by: stores and route shells through fetch.

## Data Flow

**Initial bootstrap:**

1. `src/app/layout.tsx` mounts `ThemeProvider`, `QueryProvider`, `Toaster`, and `OnboardingTour`.
2. `src/app/page.tsx` routes users into `src/app/timeline-test/page.tsx`, `src/app/timeline-test-3d/page.tsx`, `src/app/timeslicing/page.tsx`, or `src/app/timeslicing-algos/page.tsx`.
3. Route shells query crime data through `useCrimeData` or STKDE payloads through `/api/stkde/hotspots`.

**Crime data path:**

1. `src/app/api/crimes/range/route.ts` validates epoch range, buffers the interval, and calls `queryCrimesInRange` / `queryCrimeCount` from `src/lib/queries/index.ts`.
2. `src/lib/db.ts` resolves DuckDB and CSV paths, or switches to mock data when `USE_MOCK_DATA` / `DISABLE_DUCKDB` is enabled.
3. `useTimelineDataStore` stores the result as either row objects or Apache Arrow columnar arrays.
4. `src/components/map/MapVisualization.tsx`, `src/components/viz/CubeVisualization.tsx`, and `src/components/timeline/DualTimeline.tsx` render against the shared store state.

**Adaptive time flow:**

1. `src/app/timeslicing/page.tsx` and `src/app/timeline-test/page.tsx` collect timestamps and call `useAdaptiveStore.getState().computeMaps(...)`.
2. `src/store/useAdaptiveStore.ts` posts to `src/workers/adaptiveTime.worker.ts` for binning, smoothing, burstiness scoring, and warp-map generation.
3. `src/app/api/adaptive/global/route.ts` can hydrate the same store with DB-precomputed maps.
4. `src/lib/adaptive/route-binning-mode.ts` chooses `uniform-time` vs `uniform-events` by route.

**STKDE flow:**

1. `src/app/stkde/lib/StkdeRouteShell.tsx` resolves URL state, posts to `/api/stkde/hotspots`, and guards against stale responses with request IDs and `AbortController`.
2. `src/app/api/stkde/hotspots/route.ts` validates the request in `src/lib/stkde/contracts.ts`, selects sampled or full-population execution, and computes a response with `src/lib/stkde/compute.ts` or `src/lib/stkde/full-population-pipeline.ts`.
3. `src/workers/stkdeHotspot.worker.ts` filters and sorts hotspots for the UI.
4. `src/store/useStkdeStore.ts` and `src/components/map/MapStkdeHeatmapLayer.tsx` keep the selected hotspot synchronized across map and panels.

**Timeline and slice flow:**

1. `src/components/timeline/DualTimeline.tsx` reads data, slices, burst windows, and warp slices from stores.
2. It writes brush ranges back into `useFilterStore`, `useTimeStore`, and `useCoordinationStore`.
3. `src/store/useSliceDomainStore.ts` composes `src/store/slice-domain/createSliceCoreSlice.ts`, `createSliceSelectionSlice.ts`, `createSliceCreationSlice.ts`, and `createSliceAdjustmentSlice.ts` into one persisted slice model.

## Key Abstractions

**Query fragments:**
- Purpose: safely assemble parameterized SQL.
- Examples: `src/lib/queries/types.ts`, `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts`, `src/lib/queries/sanitization.ts`.
- Pattern: small fragment objects with `{ sql, params }` and allowlisted table names.

**View-model shells:**
- Purpose: convert query state and store state into render-ready models.
- Examples: `src/app/stkde/lib/stkde-view-model.ts`, `src/app/stats/lib/stats-view-model.ts`, `src/app/timeslicing-algos/lib/mode-selection.ts`.
- Pattern: memoized route-local orchestration with URL serialization.

**Projection and normalization helpers:**
- Purpose: keep map, cube, and timeline coordinates consistent.
- Examples: `src/lib/projection.ts`, `src/lib/selection.ts`, `src/lib/time-domain.ts`, `src/lib/coordinate-normalization.ts`.
- Pattern: pure functions shared by UI and route logic.

**Store slices and selectors:**
- Purpose: reduce rerenders and keep feature boundaries explicit.
- Examples: `src/store/slice-domain/selectors.ts`, `src/store/slice-domain/createSliceCoreSlice.ts`, `src/store/slice-domain/createSliceSelectionSlice.ts`.
- Pattern: selector exports from `src/store/useSliceDomainStore.ts` and feature-specific store hooks.

## Entry Points

**Application shell:**
- Location: `src/app/layout.tsx`
- Triggers: every route render.
- Responsibilities: global providers, fonts, toaster, onboarding.

**Home route:**
- Location: `src/app/page.tsx`
- Triggers: `/`
- Responsibilities: launchpad links into the main workflows.

**Interactive dashboard:**
- Location: `src/app/dashboard/page.tsx`, `src/components/layout/DashboardLayout.tsx`.
- Triggers: dashboard route.
- Responsibilities: compose map, 3D cube, and timeline in a resizable layout.

**Analysis routes:**
- Location: `src/app/stkde/page.tsx`, `src/app/timeslicing/page.tsx`, `src/app/timeslicing-algos/page.tsx`, `src/app/timeline-test/page.tsx`, `src/app/timeline-test-3d/page.tsx`.
- Triggers: route navigation.
- Responsibilities: load data, compute derived state, and expose review/apply workflows.

**Server data routes:**
- Location: `src/app/api/**/route.ts`.
- Triggers: fetch requests from hooks and route shells.
- Responsibilities: query data, compute aggregates, and return JSON or Arrow streams.

## Error Handling

**Strategy:** Prefer safe fallback data and explicit request validation over hard failures.

**Patterns:**
- API routes return mock payloads when DuckDB or source files are unavailable, as in `src/app/api/crime/meta/route.ts` and `src/app/api/crime/stream/route.ts`.
- Client fetches in `src/app/stkde/lib/StkdeRouteShell.tsx` use request IDs, abort signals, and response-size guards.
- Validation and clamping happen before compute in `src/lib/stkde/contracts.ts` and `src/lib/queries/sanitization.ts`.

## Cross-Cutting Concerns

**Logging:** `console.*` is used in route handlers, stores, and route shells; `src/hooks/useLogger.ts` adds event-style logging.

**Validation:** Input checks are centralized in `src/lib/stkde/contracts.ts`, `src/app/api/crimes/range/route.ts`, and `src/lib/queries/sanitization.ts`.

**Authentication:** Not detected; routes are public and data access is controlled by runtime checks and env vars.

---

*Architecture analysis: 2026-04-08*
