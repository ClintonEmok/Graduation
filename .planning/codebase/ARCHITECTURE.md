# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Client-heavy modular monolith (Next App Router + local analytics backend)

**Key Characteristics:**
- UI composition is route-driven (`src/app/*`) with most interaction/state on the client (`"use client"` pages and components)
- Data access is internal API first (`src/app/api/*`) with a shared query core (`src/lib/queries.ts`)
- Cross-view coordination is centralized in Zustand stores (`src/store/*`, `src/lib/stores/viewportStore.ts`)

## Layers

**Route/UI Layer:**
- Purpose: Define user-facing pages and compose feature modules
- Location: `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/timeline-test/page.tsx`, `src/app/timeline-test-3d/page.tsx`, `src/app/timeslicing/page.tsx`
- Contains: Next route components, feature shells, layout wrappers
- Depends on: `src/components/*`, `src/hooks/*`, `src/store/*`
- Used by: Next.js App Router runtime

**Component Layer:**
- Purpose: Render map, timeline, 3D scene, controls, and local UI flows
- Location: `src/components/*`
- Contains: Domain components (`map`, `timeline`, `viz`) and UI primitives (`ui`)
- Depends on: Zustand stores, hooks, and utility/lib modules
- Used by: Route pages under `src/app/*`

**State/Domain Layer:**
- Purpose: Manage shared state and cross-panel interaction contracts
- Location: `src/store/*` and `src/store/slice-domain/*`
- Contains: Feature stores (adaptive, filters, timeline data, slices, suggestion state)
- Depends on: Utility modules from `src/lib/*` and worker output contracts
- Used by: Components and hooks across map/timeline/3D views

**Data/Service Layer:**
- Purpose: Fetch and transform data from internal APIs and local DB/query APIs
- Location: `src/hooks/useCrimeData.ts`, `src/hooks/useViewportCrimeData.ts`, `src/lib/queries.ts`, `src/lib/db.ts`
- Contains: Query key logic, data normalization, SQL builder orchestration, DB setup
- Depends on: Next API routes (`/api/*`), DuckDB package, Apache Arrow serialization
- Used by: Store hydration and UI components

**Backend API Layer:**
- Purpose: Expose data/compute endpoints to the client
- Location: `src/app/api/**/route.ts`
- Contains: Parameter validation, range buffering, fallback behavior, response contracts
- Depends on: `src/lib/db.ts`, `src/lib/queries.ts`, `src/lib/duckdb-aggregator.ts`
- Used by: `fetch()` calls in `src/hooks/*` and `src/components/*`

## Data Flow

**Viewport Data Flow (primary hot path):**

1. UI updates range/filters in stores (`src/lib/stores/viewportStore.ts`, `src/store/useFilterStore.ts`)
2. `useCrimeData` builds request and calls `/api/crimes/range` (`src/hooks/useCrimeData.ts`, `src/app/api/crimes/range/route.ts`)
3. API queries DuckDB or mock path via `queryCrimeCount`/`queryCrimesInRange` (`src/lib/queries.ts`) and returns `{ data, meta }`
4. Components/stores consume results and sync map/timeline/3D interactions (`src/components/map/MapVisualization.tsx`, `src/components/timeline/DualTimeline.tsx`, `src/store/useTimelineDataStore.ts`)

**State Management:**
- Use feature-scoped Zustand stores; sync across stores through explicit helper contracts (for example `applyRangeToStoresContract` in `src/components/timeline/DualTimeline.tsx`)

## Key Abstractions

**Unified Crime Query Hook:**
- Purpose: Canonical client data-fetch API with buffering/filter support
- Examples: `src/hooks/useCrimeData.ts`, `src/hooks/useViewportCrimeData.ts`
- Pattern: Wrapper hook over TanStack Query with typed response metadata

**Adaptive Time Maps:**
- Purpose: Compute density/burst/warp maps for timeline scaling
- Examples: `src/store/useAdaptiveStore.ts`, `src/workers/adaptiveTime.worker.ts`, `src/app/api/adaptive/global/route.ts`
- Pattern: Dual compute mode (client worker for local/viewport, server precompute for global)

**Slice Domain Store Composition:**
- Purpose: Combine slice core/creation/selection/adjustment into one persistent domain store
- Examples: `src/store/useSliceDomainStore.ts`, `src/store/slice-domain/createSliceCoreSlice.ts`, `src/store/slice-domain/createSliceCreationSlice.ts`
- Pattern: Slice factory composition with exported selectors

## Entry Points

**Root App Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every app route render
- Responsibilities: Global providers, theme, query client, toaster, onboarding bootstrap

**Dashboard Route:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: `/dashboard`
- Responsibilities: Compose map + cube + timeline panels and study controls

**Timeslicing Route:**
- Location: `src/app/timeslicing/page.tsx`
- Triggers: `/timeslicing`
- Responsibilities: Fetch/sync timeline data, generate suggestions, drive adaptive + slice workflows

**API Entry Points:**
- Location: `src/app/api/crimes/range/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/adaptive/global/route.ts`
- Triggers: Browser fetches from hooks/components
- Responsibilities: Validate params, execute query layer, return response contracts, provide mock fallback headers

## Error Handling

**Strategy:** Defensive fallback over fail-fast

**Patterns:**
- Try/catch at API boundary with JSON error or mock fallback payloads (`src/app/api/crime/*/route.ts`)
- Client hooks throw on non-OK and expose error through query state (`src/hooks/useCrimeData.ts`)

## Cross-Cutting Concerns

**Logging:** Console-based diagnostics and optional study event buffering (`src/lib/logger.ts`, `src/app/api/study/log/route.ts`)
**Validation:** Route-level parameter guards in API handlers (`src/app/api/crimes/range/route.ts`, `src/app/api/crime/facets/route.ts`)
**Authentication:** Not detected; endpoints are open within app context

---

*Architecture analysis: 2026-03-11*
