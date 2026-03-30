# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Next.js 14 App Router with layered architecture and Zustand state management

**Key Characteristics:**
- Server-side API routes with Node.js runtime for DuckDB operations
- Client-side React components with TanStack Query for data fetching
- Zustand stores for reactive state management across domains
- Web Workers for computationally intensive operations (STKDE hotspot detection)
- 3D visualization layer using React-Three-Fiber

## Layers

### Routes Layer (src/app)
- **Purpose:** Next.js App Router pages and API endpoints
- Location: `src/app/`
- Contains: Route pages, layouts, API route handlers
- Depends on: Components, hooks, stores
- Used by: Browser navigation

**Key Routes:**
- `src/app/dashboard/page.tsx` - Main dashboard with map, cube visualization, timeline
- `src/app/stkde/page.tsx` - STKDE hotspot analysis view
- `src/app/stats/page.tsx` - Statistics view
- `src/app/timeslicing/page.tsx` - Time slicing interface
- `src/app/api/crimes/range/route.ts` - Crime data API endpoint
- `src/app/api/stkde/hotspots/route.ts` - STKDE computation endpoint
- `src/app/api/adaptive/global/route.ts` - Adaptive binning endpoint

### Components Layer (src/components)
- **Purpose:** Reusable UI components organized by feature
- Location: `src/components/`
- Contains: React components for map, timeline, visualization, UI
- Depends on: Hooks, stores, types
- Used by: Routes, other components

**Component Groups:**
- `src/components/map/` - Map visualization (MapVisualization, MapBase, MapLayerManager)
- `src/components/viz/` - 3D cube visualization (CubeVisualization, Scene, MainScene)
- `src/components/timeline/` - Timeline components (DualTimeline, TimelinePanel, TimelineBrush)
- `src/components/layout/` - Layout components (DashboardLayout, TopBar)
- `src/components/ui/` - Shared UI primitives (shadcn/ui components)
- `src/components/study/` - Study/analysis controls

### Hooks Layer (src/hooks)
- **Purpose:** Custom React hooks for data fetching and state interactions
- Location: `src/hooks/`
- Contains: Data hooks (useCrimeData), UI hooks (useDraggable, useMeasure)
- Depends on: Stores, types, lib utilities
- Used by: Components

**Key Hooks:**
- `src/hooks/useCrimeData.ts` - Unified crime data fetching with React Query
- `src/hooks/useSliceStats.ts` - Slice statistics computation
- `src/hooks/useDebouncedDensity.ts` - Debounced density calculations
- `src/hooks/useSmartProfiles.ts` - Context profile management

### Store Layer (src/store)
- **Purpose:** Zustand stores for application state management
- Location: `src/store/`
- Contains: State slices for slices, selection, coordination, filters
- Depends on: Types, lib utilities
- Used by: Components, hooks

**Key Stores:**
- `src/store/useSliceDomainStore.ts` - Time slice management (core, selection, creation, adjustment slices)
- `src/store/useCoordinationStore.ts` - Cross-component coordination (selection sync, workflow phase)
- `src/store/useAdaptiveStore.ts` - Adaptive binning state
- `src/store/useTimeStore.ts` - Time range and viewport state
- `src/store/useFilterStore.ts` - Crime type/district filters
- `src/store/slice-domain/` - Slice sub-domain implementations

### Library Layer (src/lib)
- **Purpose:** Business logic, database access, utilities
- Location: `src/lib/`
- Contains: Query builders, DuckDB integration, data transformations
- Used by: API routes, hooks, stores

**Key Modules:**
- `src/lib/db.ts` - DuckDB initialization and connection management
- `src/lib/queries.ts` - Crime data queries with mock fallback
- `src/lib/queries/` - Query builders (aggregations, filters, builders)
- `src/lib/binning/` - Time binning logic and rules
- `src/lib/context-diagnostics/` - Context comparison diagnostics
- `src/lib/stkde/` - STKDE computation pipelines
- `src/lib/adaptive/` - Adaptive binning algorithms
- `src/lib/time-domain.ts` - Time domain conversions

### Types Layer (src/types)
- **Purpose:** TypeScript type definitions
- Location: `src/types/`
- Contains: Domain types, API response types

**Key Types:**
- `src/types/crime.ts` - CrimeRecord, CrimeDataMeta, UseCrimeDataOptions
- `src/types/autoProposalSet.ts` - Auto-proposal types
- `src/types/index.ts` - Re-exports

### Workers Layer (src/workers)
- **Purpose:** Web Workers for off-main-thread computation
- Location: `src/workers/`
- Contains: STKDE hotspot worker, adaptive time worker

## Data Flow

**Crime Data Flow:**

1. User navigates to dashboard
2. Component calls `useCrimeData(startEpoch, endEpoch)` hook
3. Hook triggers React Query to fetch from `/api/crimes/range`
4. API route (`src/app/api/crimes/range/route.ts`):
   - Validates viewport parameters
   - Calls `queryCrimesInRange()` from `src/lib/queries.ts`
   - Queries DuckDB or returns mock data
5. Data flows back through React Query cache
6. Components consume crime data for visualization

**State Management Flow:**

1. User interaction triggers store action
2. Zustand store updates state
3. Components re-render via selectors
4. `useCoordinationStore` handles cross-component sync:
   - Tracks `selectedSource` (cube|timeline|map)
   - Manages `workflowPhase` (generate|review|applied|refine)
   - Maintains `syncStatus` (syncing|synchronized|partial)

**STKDE Computation Flow:**

1. User requests hotspot detection
2. API route `src/app/api/stkde/hotspots/route.ts` receives request
3. Calls STKDE pipeline in `src/lib/stkde/full-population-pipeline.ts`
4. Heavy computation runs server-side (Node.js runtime)
5. Results cached in DuckDB for future requests

## Key Abstractions

**CrimeRecord (canonical data model):**
- Purpose: Unified format for crime data across all components
- Examples: `src/types/crime.ts`, `src/lib/queries.ts`
- Pattern: TypeScript interface with normalized spatial coordinates

**TimeSlice (domain model):**
- Purpose: Represents time ranges selected by users
- Examples: `src/store/slice-domain/types.ts`
- Pattern: Zustand-managed with sub-slices (core, selection, creation, adjustment)

**Query Builders:**
- Purpose: SQL query construction with parameterization
- Examples: `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts`
- Pattern: Builder pattern returning { sql, params }

## Entry Points

**Client Entry:**
- `src/app/dashboard/page.tsx` - Main application view
- Triggers: Browser navigation to /dashboard
- Responsibilities: Layout composition, component orchestration

**API Entry:**
- `src/app/api/crimes/range/route.ts` - Crime data endpoint
- Triggers: HTTP GET /api/crimes/range?startEpoch=X&endEpoch=Y
- Responsibilities: Viewport-based query, buffering, sampling

**Worker Entry:**
- `src/workers/stkdeHotspot.worker.ts` - STKDE filtering
- Triggers: postMessage from main thread
- Responsibilities: Hotspot filtering, sorting by intensity

## Error Handling

**Strategy:** Try-catch with typed error responses

**Patterns:**
- API routes return JSON error with status codes
- React Query provides error state via useCrimeData hook
- Zustand actions are synchronous with no error boundary
- DuckDB errors logged and re-thrown as descriptive errors

**Example from `src/app/api/crimes/range/route.ts`:**
```typescript
try {
  // ... query logic
} catch (error) {
  console.error('API Error (/api/crimes/range):', error);
  return NextResponse.json(
    { error: 'Failed to fetch crime data', details: error.message },
    { status: 500 }
  );
}
```

## Cross-Cutting Concerns

**Logging:** Custom logger in `src/lib/logger.ts`

**Validation:** Input validation in API routes (epoch ranges, parameters)

**Authentication:** Not implemented (local data only)

**Feature Flags:** URL-based feature flags via `src/hooks/useURLFeatureFlags.ts`

---

*Architecture analysis: 2026-03-30*
