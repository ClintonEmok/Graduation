# Architecture

**Analysis Date:** 2026-04-08

## Pattern Overview

**Overall:** Modular Monolith with Feature-Based Organization

This is a Next.js 16 application (App Router) with a clear separation between:
- **Pages/Routes**: Dashboard-centric with multiple specialized views (`/dashboard`, `/timeline-test`, `/timeslicing`, `/stkde`, `/stats`)
- **State Management**: Zustand stores with slice-domain pattern for complex state
- **Business Logic**: Pure functions in `src/lib/` modules
- **Data Layer**: API routes + DuckDB for analytics, Apache Arrow for streaming

**Key Characteristics:**
- Client-heavy visualization with server-side data processing
- Coordination store pattern for cross-component synchronization
- Web Workers for heavy computation (STKDE, adaptive time)
- Multiple independent "apps" within the same Next.js instance

## Layers

**UI Layer (Components):**
- Location: `src/components/`
- Contains: React components organized by feature (`map/`, `timeline/`, `viz/`, `ui/`)
- Depends on: Stores, hooks, lib utilities
- Used by: Pages

**State Layer (Stores):**
- Location: `src/store/`
- Contains: Zustand stores for UI state, filters, slice management, adaptive settings
- Depends on: Types, lib utilities
- Used by: Components, other stores

**Business Logic Layer (Lib):**
- Location: `src/lib/`
- Contains: `queries/` (data fetching), `binning/` (time binning), `stkde/` (hotspot detection), `adaptive/` (time scaling), `interval-detection.ts`, `confidence-scoring.ts`
- Depends on: Types, database
- Used by: Stores, API routes, workers

**Data Layer (API Routes):**
- Location: `src/app/api/`
- Contains: Next.js Route Handlers for `/api/crime/*`, `/api/stkde/*`, `/api/adaptive/*`, `/api/neighbourhood/*`
- Depends on: DuckDB, external data files
- Used by: Client hooks (`useCrimeData`, etc.)

**Worker Layer:**
- Location: `src/workers/`
- Contains: Web Workers for heavy computation (`adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- Depends on: Lib modules
- Used by: Stores via worker instantiation

**Types Layer:**
- Location: `src/types/`
- Contains: Canonical type definitions (`crime.ts`, `autoProposalSet.ts`)
- Depends on: None
- Used by: All layers

## Data Flow

**Crime Data Flow:**

1. `useCrimeData` hook in `src/hooks/useCrimeData.ts` calls `/api/crime/stream`
2. API route (`src/app/api/crime/stream/route.ts`) queries DuckDB or returns mock data
3. Data returned as Apache Arrow stream
4. Hook parses Arrow to `CrimeRecord[]` array
5. Stored in `useTimelineDataStore` and `useFilterStore`
6. Consumed by visualization components

**Slice Creation Flow:**

1. User interacts with timeline (`src/components/timeline/TimelinePanel.tsx`)
2. `useSliceCreationStore` tracks creation state (drag, preview, snap)
3. On commit, creates `TimeSlice` via `addSlice()` in `useSliceStore`
4. Slice appears in `CubeVisualization` and is coordinated via `useCoordinationStore`

**Adaptive Time Scaling Flow:**

1. `useAdaptiveStore` holds warp factor and mode
2. `full-auto-orchestrator.ts` generates ranked proposal sets
3. `interval-detection.ts` finds natural breakpoints
4. `warp-generation.ts` creates warp profiles
5. Applied to timeline via `useWarpProposalStore`

**Coordination Flow:**

1. `useCoordinationStore` tracks `selectedIndex`, `selectedSource`, `brushRange`
2. Sources: cube, timeline, map components
3. `reconcileSelection()` handles cross-panel synchronization
4. `syncStatus` tracks panel alignment state

## Key Abstractions

**CrimeRecord (Type):**
- Purpose: Canonical crime data format across all components
- Examples: `src/types/crime.ts`
- Pattern: Normalized coordinates (x, z) alongside geographic (lat, lon)

**TimeSlice (Type):**
- Purpose: Represents a time selection (point or range)
- Examples: `src/store/slice-domain/types.ts`
- Pattern: Immutable-ish with `isLocked`, `isVisible` flags

**AutoProposalSet (Type):**
- Purpose: Container for adaptive time proposals
- Examples: `src/types/autoProposalSet.ts`
- Pattern: Includes ranking, confidence scoring, and reason metadata

**Zustand Store Pattern:**
- Purpose: Client state management
- Examples: `src/store/useCoordinationStore.ts`, `src/store/useSliceStore.ts`
- Pattern: Single store with multiple slices via `slice-domain/` helper functions

**Query Builder Pattern:**
- Purpose: Build type-safe database queries
- Examples: `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts`
- Pattern: Fluent API with sanitization

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page routes
- Responsibilities: Theme provider, query provider, toaster, onboarding tour

**Dashboard Page:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: `/dashboard` route
- Responsibilities: Main visualization layout with Map, Cube, Timeline panels

**Specialized Pages:**
- `src/app/timeline-test/page.tsx` - Timeline testing interface
- `src/app/timeline-test-3d/page.tsx` - 3D timeline visualization
- `src/app/timeslicing/page.tsx` - Time slicing controls
- `src/app/stkde/page.tsx` - STKDE hotspot analysis
- `src/app/stats/page.tsx` - Statistics dashboard

**API Routes:**
- `src/app/api/crime/stream/route.ts` - Crime data streaming
- `src/app/api/crime/bins/route.ts` - Binned crime data
- `src/app/api/stkde/hotspots/route.ts` - STKDE computation
- `src/app/api/adaptive/global/route.ts` - Adaptive scaling data

## Error Handling

**Strategy:** Graceful degradation with fallback to mock data

**Patterns:**
- API routes catch errors and return mock data with `X-Data-Warning` header
- DuckDB failures trigger mock data generation
- Stores handle loading/error states for async operations
- `isLoading`, `isFetching`, `error` properties in hook results

**Logging:**
- `src/lib/logger.ts` - Centralized logging utility
- `useLogger` hook for component-level logging
- Backend logging via `/api/study/log` endpoint

## Cross-Cutting Concerns

**Authentication:** Not implemented (internal tool)

**Validation:**
- Query sanitization in `src/lib/queries/sanitization.ts`
- Type guards in query builders

**Logging:**
- `src/lib/logger.ts` exports logging functions
- `useLogger` hook in `src/hooks/useLogger.ts`

**Data Normalization:**
- Coordinate normalization in `src/lib/coordinate-normalization.ts`
- Date normalization in `src/lib/date-normalization.ts`

---

*Architecture analysis: 2026-04-08*
