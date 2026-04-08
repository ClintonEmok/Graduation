# Codebase Structure

**Analysis Date:** 2026-04-08

## Directory Layout

```
/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # API Route Handlers
│   │   │   ├── adaptive/
│   │   │   ├── crime/
│   │   │   ├── crimes/
│   │   │   ├── neighbourhood/
│   │   │   ├── stkde/
│   │   │   └── study/
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── dashboard-v2/       # Alternative dashboard
│   │   ├── stats/              # Statistics page
│   │   ├── stkde/              # STKDE analysis page
│   │   ├── timeline-test/      # Timeline testing page
│   │   ├── timeline-test-3d/   # 3D timeline page
│   │   ├── timeslicing/        # Time slicing page
│   │   ├── timeslicing-algos/  # Algorithm testing page
│   │   ├── cube-sandbox/       # Sandbox page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home/landing page
│   ├── components/
│   │   ├── binning/            # Binning controls
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── layout/             # Layout components (ThemeProvider, DashboardLayout, TopBar)
│   │   ├── map/                # Map visualization components
│   │   ├── onboarding/         # Onboarding tour
│   │   ├── settings/           # Settings panel, feature flags
│   │   ├── stkde/              # STKDE panel components
│   │   ├── story/              # Study controls
│   │   ├── timeline/           # Timeline components
│   │   │   └── layers/         # Timeline rendering layers (Axis, Histogram, Marker)
│   │   ├── timeslicing/        # Time slicing components
│   │   ├── ui/                 # Reusable UI primitives (button, dialog, select, etc.)
│   │   └── viz/                # Visualization components (CubeVisualization, MainScene, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Business logic modules
│   │   ├── adaptive/           # Adaptive time scaling logic
│   │   ├── binning/            # Time binning engine
│   │   ├── context-diagnostics/# Context profiling
│   │   ├── neighbourhood/     # Neighborhood/POI data
│   │   ├── queries/            # Query building and execution
│   │   ├── stats/             # Statistics aggregation
│   │   ├── stkde/             # STKDE computation
│   │   └── stores/             # Non-Zustand stores (viewportStore)
│   ├── providers/              # React context providers
│   ├── store/                  # Zustand state stores
│   │   └── slice-domain/       # Slice factory functions for complex stores
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── workers/                # Web Workers for heavy computation
├── data/                       # Data files (DuckDB cache, source CSVs)
├── public/                     # Static assets
├── scripts/                    # Build/dev scripts
├── .github/                    # GitHub workflows
└── [config files]              # package.json, tsconfig.json, next.config.ts, etc.
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router structure
- Contains: Page components, layouts, API routes
- Key files: `page.tsx`, `layout.tsx`, `api/**/route.ts`

**`src/components/`:**
- Purpose: React UI components
- Contains: Feature-specific and reusable components
- Key files: `viz/CubeVisualization.tsx`, `map/MapVisualization.tsx`, `timeline/TimelinePanel.tsx`

**`src/lib/`:**
- Purpose: Business logic and data processing
- Contains: Query builders, binning engine, STKDE compute, interval detection
- Key files: `db.ts`, `queries/index.ts`, `full-auto-orchestrator.ts`, `interval-detection.ts`

**`src/store/`:**
- Purpose: Client-side state management with Zustand
- Contains: Individual store files and slice-domain factories
- Key files: `useCoordinationStore.ts`, `useSliceStore.ts`, `useFilterStore.ts`

**`src/hooks/`:**
- Purpose: Custom React hooks for data fetching and integration
- Key files: `useCrimeData.ts`, `useLogger.ts`, `useDebouncedDensity.ts`

**`src/types/`:**
- Purpose: Canonical TypeScript type definitions
- Key files: `crime.ts`, `autoProposalSet.ts`, `index.ts`

**`src/workers/`:**
- Purpose: Web Workers for CPU-intensive computation
- Key files: `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`

**`src/providers/`:**
- Purpose: React context providers
- Key files: `QueryProvider.tsx`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Home page with navigation links
- `src/app/layout.tsx`: Root layout with providers
- `src/app/dashboard/page.tsx`: Main dashboard

**Configuration:**
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration with `@/*` path alias
- `next.config.ts`: Next.js configuration
- `vitest.config.mts`: Test configuration

**Core Logic:**
- `src/lib/db.ts`: DuckDB initialization and data path management
- `src/lib/queries/index.ts`: Query builder exports
- `src/lib/full-auto-orchestrator.ts`: Main adaptive time orchestration
- `src/lib/interval-detection.ts`: Boundary detection algorithms

**State Management:**
- `src/store/useCoordinationStore.ts`: Cross-panel coordination
- `src/store/useFilterStore.ts`: Crime type/district filters
- `src/store/useSliceStore.ts`: Time slice management
- `src/store/slice-domain/types.ts`: Slice state type definitions

**Visualization:**
- `src/components/viz/CubeVisualization.tsx`: 3D space-time cube
- `src/components/map/MapVisualization.tsx`: MapLibre map
- `src/components/timeline/TimelinePanel.tsx`: Timeline controls

**Testing:**
- Tests co-located with source: `*.test.ts`, `*.test.tsx`

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `MapVisualization.tsx`, `TimelinePanel.tsx`)
- Stores: `camelCase.ts` with `use` prefix (e.g., `useFilterStore.ts`)
- Lib modules: `camelCase.ts` (e.g., `interval-detection.ts`, `confidence-scoring.ts`)
- Types: `PascalCase.ts` (e.g., `crime.ts`, `autoProposalSet.ts`)
- Workers: `camelCase.worker.ts`

**Directories:**
- Feature modules: `kebab-case` (e.g., `timeslicing/`, `slice-domain/`)
- Components: `kebab-case` (e.g., `map/`, `timeline/`)

**Functions:**
- Hooks: `useCamelCase` (e.g., `useCrimeData`, `useLogger`)
- Store actions: `camelCase` (e.g., `setSelectedIndex`, `toggleSlice`)
- Lib functions: `camelCase` or `PascalCase` for classes (e.g., `detectBoundaries`, `generateRankedAutoProposalSets`)

**Types:**
- Interfaces: `PascalCase` with optional `I` prefix avoided (e.g., `CrimeRecord`, `TimeSlice`)
- Type aliases: `PascalCase` (e.g., `CrimeRecordInput`, `BoundaryMethod`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/lib/` (business logic) or `src/components/[feature]/`
- Tests: Co-located `*.test.ts` or `*.test.tsx`

**New Component:**
- Implementation: `src/components/[feature]/NewComponent.tsx`
- Types: `src/types/` if shared, or inline if local

**New Store:**
- Implementation: `src/store/useNewStoreName.ts`
- If complex with multiple slices: Add factory functions to `src/store/slice-domain/`

**New API Route:**
- Implementation: `src/app/api/[resource]/route.ts`
- Query logic: `src/lib/queries/` if reusable

**New Utility:**
- Shared utilities: `src/lib/` or `src/utils/`
- Keep `src/utils/` for generic helpers, `src/lib/` for domain-specific logic

**New Hook:**
- Implementation: `src/hooks/useNewHook.ts`

**New Worker:**
- Implementation: `src/workers/newWorker.worker.ts`
- Test: `src/workers/newWorker.worker.test.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: Reusable UI primitives (Radix UI based)
- Contains: `button.tsx`, `dialog.tsx`, `select.tsx`, `tooltip.tsx`, etc.
- Generated: Partially - some manually maintained

**`src/lib/stkde/`:**
- Purpose: Space-Time Kernel Density Estimation
- Contains: `compute.ts`, `full-population-pipeline.ts`, `contracts.ts`

**`src/lib/binning/`:**
- Purpose: Time interval binning and burst detection
- Contains: `engine.ts`, `rules.ts`, `burst-taxonomy.ts`

**`src/store/slice-domain/`:**
- Purpose: Factory functions for creating complex store slices
- Contains: `createSliceCoreSlice.ts`, `createSliceCreationSlice.ts`, etc.

**`data/`:**
- Purpose: Crime data CSVs and DuckDB cache
- Generated: Yes, created at runtime
- Committed: Partial (source CSVs may be gitignored)

---

*Structure analysis: 2026-04-08*
