# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Client-heavy Next.js App Router with store-orchestrated timeline + visualization state and local DuckDB-backed APIs.

**Key Characteristics:**
- Data is fetched through React Query hooks (`src/hooks/useCrimeData.ts`) and mirrored into Zustand stores for visualization compatibility (`src/app/timeslicing/page.tsx`, `src/store/useDataStore.ts`).
- Timeline behavior is centered in a large orchestrator component (`src/components/timeline/DualTimeline.tsx`) that coordinates brush/zoom, viewport range, density maps, and selection stores.
- Adaptive time maps are computed in a Web Worker (`src/workers/adaptiveTime.worker.ts`) and consumed by timeline + scene components via `useAdaptiveStore`.

## Layers

**Route Layer (Next App Router):**
- Purpose: Define screens and API endpoints.
- Location: `src/app/**`
- Contains: `page.tsx` routes, API `route.ts` handlers.
- Depends on: hooks, stores, lib query modules.
- Used by: browser clients and internal fetch calls.

**Hook/Orchestration Layer:**
- Purpose: Fetch, debounce, derive, and synchronize state transitions.
- Location: `src/hooks/**`
- Contains: `useCrimeData`, `useViewportCrimeData`, `useSuggestionGenerator`, `useDebouncedDensity`.
- Depends on: React Query + Zustand stores + API endpoints.
- Used by: route pages and UI components.

**State Layer (Zustand):**
- Purpose: Cross-component state for data, filters, adaptive maps, slices, and suggestions.
- Location: `src/store/**`, `src/lib/stores/viewportStore.ts`
- Contains: domain stores (`useDataStore`, `useAdaptiveStore`, `useFilterStore`, `useSliceStore`, `useSuggestionStore`, `useWarpSliceStore`).
- Depends on: local utility functions and worker output.
- Used by: timeline components, viz components, route pages, hooks.

**Data Access Layer:**
- Purpose: Query crimes, counts, facets, bins, and adaptive caches.
- Location: `src/lib/db.ts`, `src/lib/queries.ts`, `src/app/api/**/route.ts`
- Contains: DuckDB initialization, SQL query composition, mock fallback generators.
- Depends on: local filesystem data files and DuckDB binding.
- Used by: API handlers and indirectly by client hooks.

## Data Flow

**`/timeslicing` flow:**
1. `src/app/timeslicing/page.tsx` derives domain from `useAdaptiveStore.mapDomain` with fallback to `useDataStore` timestamps.
2. It calls `useCrimeData` with `[domainStartSec, domainEndSec]` and options (`bufferDays`, `limit`).
3. `useCrimeData` calls `/api/crimes/range` and returns `CrimeRecord[]`.
4. The page mirrors fetched records into `useDataStore` (`data`, bounds, min/max timestamps).
5. The page triggers `useAdaptiveStore.computeMaps(timestamps, domain)`; worker computes `densityMap`, `burstinessMap`, `warpMap`.
6. `DualTimeline` reads `useDataStore` + `useAdaptiveStore` for rendering and interactions.

**`/timeline-test` flow:**
1. `src/app/timeline-test/page.tsx` defaults to generated mock timestamps/density and pushes them into `useDataStore` + `useAdaptiveStore` when `useMockData` is true.
2. User interactions update `useFilterStore` and trigger recompute via `useDebouncedDensity`.
3. `DualTimeline` renders with optional `adaptiveWarpMapOverride` from authored warp slices.
4. Slice overlays (`CommittedSliceLayer`, `SliceBoundaryHandlesLayer`, `SliceCreationLayer`) consume timeline scales and slice stores for create/adjust flows.

**`useCrimeData` + `/api/crimes/range` pipeline:**
1. `useCrimeData` (`src/hooks/useCrimeData.ts`) computes buffered epochs and query key.
2. It fetches `/api/crimes/range` with `startEpoch`, `endEpoch`, optional `crimeTypes`, `districts`, `limit`.
3. `/api/crimes/range` (`src/app/api/crimes/range/route.ts`) validates params, applies buffer, and either:
   - Generates mock records when `isMockDataEnabled()` is true, or
   - Calls `queryCrimeCount` + `queryCrimesInRange` from `src/lib/queries.ts`.
4. API returns `{ data, meta }`; hook exposes `data`, `meta`, loading/error state, and buffered range.

**DualTimeline store dependencies:**
- `useDataStore`: source points/columns and domain (`minTimestampSec`, `maxTimestampSec`) in `src/components/timeline/DualTimeline.tsx`.
- `useAdaptiveStore`: `warpFactor`, `warpMap`, `mapDomain`, `densityMap`, `isComputing` in `src/components/timeline/DualTimeline.tsx`.
- `useViewportStore`: default detail window and brush/zoom sync via `setViewport`.
- `useFilterStore` + `useTimeStore` + `useCoordinationStore`: brush range, current cursor time, and point selection state.

**State Management:**
- Global state is Zustand-first; React Query is used for remote data caching, then bridged into stores where needed.
- `useAdaptiveStore` uses request-id cancellation semantics for worker responses to prevent stale map overwrites.

## Key Abstractions

**Adaptive map computation:**
- Purpose: Build density, burstiness, and warp maps for adaptive time scaling.
- Examples: `src/store/useAdaptiveStore.ts`, `src/workers/adaptiveTime.worker.ts`
- Pattern: Store dispatches timestamp arrays to worker; worker returns typed arrays keyed by `requestId`.

**Suggestion workflow (phase 35/36 path):**
- Purpose: Generate and manage warp profile + interval boundary suggestions.
- Examples: `src/hooks/useSuggestionGenerator.ts`, `src/store/useSuggestionStore.ts`, `src/lib/warp-generation.ts`, `src/lib/interval-detection.ts`, `src/app/timeslicing/components/*.tsx`
- Pattern: Toolbar trigger -> hook fetches crimes -> algorithm modules compute suggestions -> store drives panel/cards/actions.

**Slice lifecycle abstraction:**
- Purpose: Create, auto-create (burst), adjust, merge, and render timeline slices.
- Examples: `src/store/useSliceStore.ts`, `src/store/useSliceAdjustmentStore.ts`, `src/store/useSliceCreationStore.ts`, `src/app/timeline-test/components/*`
- Pattern: Store-centric mutation + overlay layers bound to timeline scale.

## Entry Points

**Timeslicing Route:**
- Location: `src/app/timeslicing/page.tsx`
- Triggers: user navigation to `/timeslicing`
- Responsibilities: fetch crimes, mirror into stores for timeline parity, expose suggestion generation UI.

**Timeline Test Route:**
- Location: `src/app/timeline-test/page.tsx`
- Triggers: user navigation to `/timeline-test`
- Responsibilities: evaluate timeline rendering, density visuals, slice creation/adjustment interactions, authored warp slices.

**Crime Range API:**
- Location: `src/app/api/crimes/range/route.ts`
- Triggers: `useCrimeData` and `useViewportCrimeData` calls.
- Responsibilities: validate query params, query/mocking, return `{ data, meta }`.

## Error Handling

**Strategy:** Fail closed on invalid input; fail open to mock/demo data for DB/data availability failures.

**Patterns:**
- Parameter validation returns `400` in API routes (e.g., `/api/crimes/range`).
- DB unavailability often returns `200` with mock payload + `X-Data-Warning` headers (`src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`).
- Client hooks surface fetch errors directly (`useCrimeData`) and rely on UI route components for display.

## Cross-Cutting Concerns

**Logging:** Ad hoc `console.*` in hooks/components/routes (`src/hooks/useCrimeData.ts`, `src/components/layout/TopBar.tsx`, `src/lib/queries.ts`).
**Validation:** API query param checks + domain clamping in stores and timeline math.
**Authentication:** Not detected.

---

*Architecture analysis: 2026-02-26*
