# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
neon-tiger/
├── src/
│   ├── app/                    # Next.js App Router (pages + API)
│   ├── components/             # React UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Business logic, utilities
│   ├── store/                  # Zustand state management
│   ├── types/                  # TypeScript type definitions
│   ├── workers/                # Web Workers
│   └── providers/              # React context providers
├── data/                      # Data files (CSVs, DuckDB cache)
├── public/                    # Static assets
├── scripts/                   # Build/utility scripts
├── patches/                   # Dependency patches
└── .planning/                 # Planning documents
```

## Directory Purposes

### src/app (Routes)
- **Purpose:** Next.js App Router pages and API endpoints
- **Contains:** `page.tsx` files for routes, `route.ts` for API handlers, `layout.tsx` for layouts
- **Key files:**
  - `src/app/dashboard/page.tsx` - Main dashboard entry
  - `src/app/api/crimes/range/route.ts` - Crime data API
  - `src/app/api/stkde/hotspots/route.ts` - STKDE API

### src/components (UI)
- **Purpose:** React components organized by feature domain
- **Contains:** JSX/TSX components, subdirectories for feature groups
- **Key directories:**
  - `src/components/map/` - Map visualizations (MapBase, MapVisualization, MapLayerManager)
  - `src/components/viz/` - 3D cube/scene components (CubeVisualization, Scene, MainScene)
  - `src/components/timeline/` - Timeline components (DualTimeline, TimelinePanel, TimelineBrush)
  - `src/components/layout/` - App layout (DashboardLayout, TopBar)
  - `src/components/ui/` - Shared UI (shadcn components)
  - `src/components/viz/shaders/` - GLSL shaders

### src/hooks (React Hooks)
- **Purpose:** Custom hooks for data fetching and UI logic
- **Contains:** Hook functions for crime data, selection, density
- **Key files:**
  - `src/hooks/useCrimeData.ts` - Crime data fetching with React Query
  - `src/hooks/useSliceStats.ts` - Slice statistics
  - `src/hooks/useDebouncedDensity.ts` - Density calculations

### src/lib (Business Logic)
- **Purpose:** Core application logic, database access, utilities
- **Contains:** Query builders, DuckDB integration, algorithms
- **Key directories:**
  - `src/lib/queries/` - SQL query builders
  - `src/lib/binning/` - Time binning logic
  - `src/lib/stkde/` - STKDE computation
  - `src/lib/context-diagnostics/` - Context comparison
  - `src/lib/adaptive/` - Adaptive algorithms
  - `src/lib/neighbourhood/` - Geographic neighborhoods
  - `src/lib/stats/` - Statistical operations

### src/store (State Management)
- **Purpose:** Zustand stores for application state
- **Contains:** Store definitions and slice implementations
- **Key files:**
  - `src/store/useSliceDomainStore.ts` - Time slice management
  - `src/store/useCoordinationStore.ts` - Cross-component coordination
  - `src/store/useAdaptiveStore.ts` - Adaptive state
  - `src/store/useFilterStore.ts` - Filter state
  - `src/store/slice-domain/` - Slice sub-domain types and creators

### src/types (TypeScript)
- **Purpose:** Type definitions and interfaces
- **Contains:** Domain types, API types
- **Key files:**
  - `src/types/crime.ts` - CrimeRecord, CrimeDataMeta types
  - `src/types/index.ts` - Re-exports

### src/workers (Web Workers)
- **Purpose:** Background computation off main thread
- **Contains:** Worker entry points
- **Key files:**
  - `src/workers/stkdeHotspot.worker.ts` - STKDE hotspot filtering
  - `src/workers/adaptiveTime.worker.ts` - Adaptive time computation

### src/providers (React Context)
- **Purpose:** React context providers
- **Contains:** QueryProvider, ThemeProvider
- **Key files:**
  - `src/providers/QueryProvider.tsx` - TanStack Query setup

### data/ (Data Files)
- **Purpose:** Crime data CSVs and DuckDB cache
- **Contains:**
  - `data/sources/` - Source CSV files
  - `data/cache/` - DuckDB database file

## Key File Locations

### Entry Points
- **Main Dashboard:** `src/app/dashboard/page.tsx`
- **STKDE View:** `src/app/stkde/page.tsx`
- **Stats View:** `src/app/stats/page.tsx`

### Configuration
- **Next.js:** `next.config.ts`
- **TypeScript:** `tsconfig.json`
- **Testing:** `vitest.config.mts`
- **Linting:** `eslint.config.mjs`
- **Package Manager:** `pnpm-workspace.yaml`

### Core Logic
- **Database:** `src/lib/db.ts`
- **Queries:** `src/lib/queries.ts`
- **Slice Store:** `src/store/useSliceDomainStore.ts`
- **Coordination:** `src/store/useCoordinationStore.ts`

### Testing
- Test files co-located with source (`.test.ts`, `.test.tsx`)
- Example: `src/hooks/useCrimeData.test.ts`

## Naming Conventions

### Files
- **Components:** PascalCase (`MapVisualization.tsx`, `TimelinePanel.tsx`)
- **Hooks:** camelCase with `use` prefix (`useCrimeData.ts`, `useSliceStats.ts`)
- **Stores:** camelCase with `use` prefix (`useSliceStore.ts`, `useFilterStore.ts`)
- **Utils:** camelCase (`utils.ts`, `binning.ts`)
- **Types:** PascalCase (`CrimeRecord.ts`, `TimeSlice.ts`)
- **Workers:** camelCase (`.worker.ts`)
- **API Routes:** kebab-case (`crimes/range/route.ts`)

### Directories
- **General:** kebab-case (`slice-domain`, `context-diagnostics`, `binning-rules`)
- **Components:** kebab-case (`map/`, `viz/`, `timeline/`)

### Variables/Functions
- **Functions:** camelCase (`queryCrimesInRange`, `buildDensityBinsQuery`)
- **Types/Interfaces:** PascalCase (`CrimeRecord`, `TimeSlice`, `UseCrimeDataOptions`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_DB_PATH`, `MOCK_CRIME_TYPES`)

## Where to Add New Code

### New Feature (Page Route)
- Implementation: `src/app/[feature]/page.tsx`
- API endpoints: `src/app/api/[feature]/route.ts`
- Components: `src/components/[feature]/`

### New Component
- Primary: `src/components/[domain]/ComponentName.tsx`
- Tests: `src/components/[domain]/ComponentName.test.tsx`

### New Hook
- Implementation: `src/hooks/useFeatureName.ts`
- Tests: `src/hooks/useFeatureName.test.ts`

### New Store Slice
- Implementation: `src/store/useFeatureStore.ts`
- Slice implementation: `src/store/slice-domain/createFeatureSlice.ts`
- Types: `src/store/slice-domain/types.ts`

### New Query/API
- Query logic: `src/lib/queries.ts` or `src/lib/queries/[feature].ts`
- API route: `src/app/api/[endpoint]/route.ts`

### New Utility
- Implementation: `src/lib/feature-utils.ts` or `src/utils/feature-utils.ts`

### New Worker
- Implementation: `src/workers/feature.worker.ts`

### New Type
- Definition: `src/types/feature.ts`
- Re-export: `src/types/index.ts`

## Special Directories

### src/app/api
- **Purpose:** Next.js API routes (server-side endpoints)
- **Generated:** No (codewritten)
- **Committed:** Yes

### data/cache
- **Purpose:** DuckDB database file
- **Generated:** Yes (at runtime)
- **Committed:** No (in .gitignore)

### data/sources
- **Purpose:** Source CSV data files
- **Generated:** No (downloaded/provided)
- **Committed:** Yes (sample data)

### .planning
- **Purpose:** GSD planning documents
- **Generated:** Yes (by GSD commands)
- **Committed:** Yes (version controlled)

### patches
- **Purpose:** Dependency patches (e.g., duckdb version fix)
- **Generated:** No (manually created)
- **Committed:** Yes

---

*Structure analysis: 2026-03-30*
