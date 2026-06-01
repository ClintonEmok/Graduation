# Codebase Structure

**Analysis Date:** 2026-06-01

## Directory Layout

```
Project/
├── data/                         # Local datasets (gitignored)
│   ├── sources/                  # Raw CSV/Parquet crime data
│   └── cache/                    # DuckDB database files
├── src/                          # Application source code
│   ├── app/                      # Next.js App Router pages + API routes
│   │   ├── api/                  # Route Handlers (backend)
│   │   ├── dashboard/            # Main dashboard page
│   │   ├── dashboard-demo/       # Refined demo workspace page
│   │   ├── dashboard-v2/         # Alternative dashboard version
│   │   ├── stkde-3d/             # 3D STKDE visualization page
│   │   ├── stkde/                # 2D STKDE analysis page
│   │   ├── stats/                # Statistics dashboard page
│   │   ├── timeline-test/        # Timeline interaction testing
│   │   ├── timeline-test-3d/     # 3D timeline testing
│   │   ├── timeslicing/          # Time slicing controls
│   │   ├── timeslicing-algos/    # Time slicing algorithm tests
│   │   ├── cube-sandbox/         # Cube interaction sandbox
│   │   ├── demo/                 # Demo routes
│   │   ├── docs/                 # Documentation page
│   │   ├── layout.tsx            # Root layout (providers)
│   │   ├── page.tsx              # Home / landing page
│   │   └── globals.css           # Global styles (Tailwind)
│   ├── components/              # Reusable React components
│   │   ├── viz/                 # 3D visualization (R3F, Three.js)
│   │   ├── map/                 # 2D map layers (MapLibre)
│   │   ├── timeline/            # Timeline components
│   │   │   ├── hooks/           # Timeline-specific hooks
│   │   │   ├── layers/          # SVG sub-layers
│   │   │   ├── lib/             # Timeline utilities
│   │   │   └── qa/              # Timeline QA models
│   │   ├── dashboard/           # Dashboard header
│   │   ├── dashboard-demo/      # Demo workspace components
│   │   │   └── lib/             # Demo-specific hooks/utilities
│   │   ├── layout/              # Layout components
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── settings/            # Settings panels
│   │   ├── stkde/               # STKDE panel
│   │   ├── study/               # Study controls
│   │   ├── onboarding/          # Onboarding tour
│   │   ├── binning/             # Binning UI
│   │   └── timeslicing/         # Time slicing UI
│   ├── hooks/                   # Shared React hooks
│   ├── lib/                     # Business logic + utilities
│   │   ├── queries/             # DuckDB query builders
│   │   ├── binning/             # Time binning engine
│   │   ├── stkde/               # STKDE computation
│   │   ├── adaptive/            # Adaptive binning mode
│   │   ├── kde/                 # KDE computation
│   │   ├── clustering/          # Cluster analysis
│   │   ├── suggestion/          # Suggestion events
│   │   ├── stats/               # Statistics aggregation
│   │   ├── data/                # Data selectors/types
│   │   ├── stores/              # Lib-level stores
│   │   ├── context-diagnostics/ # Spatial/temporal diagnostics
│   │   ├── motion/              # Easing/aging utilities
│   │   ├── neighbourhood/       # Chicago OSM data
│   │   ├── evolution/           # Evolution flow
│   │   └── ...                  # Top-level utility files
│   ├── store/                   # Zustand state stores
│   │   └── slice-domain/        # Slice store creators
│   ├── types/                   # Canonical TypeScript types
│   ├── workers/                 # Web Workers
│   ├── providers/               # React providers
│   └── utils/                   # Utility files
├── scripts/                     # Build/utility scripts
├── datapreprocessing/           # Python data prep scripts
├── patches/                     # patch-package patches
├── public/                      # Static assets
├── .planning/                   # GSD planning artifacts
│   └── codebase/                # Codebase analysis documents
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── vitest.config.mts            # Vitest test configuration
├── eslint.config.mjs            # ESLint configuration
├── postcss.config.mjs           # PostCSS configuration
├── components.json              # shadcn/ui configuration
├── package.json                 # Dependencies + scripts
├── pnpm-lock.yaml               # Lockfile
└── pnpm-workspace.yaml          # pnpm workspace config
```

## Directory Purposes

**`src/app/` — Pages and Routes:**
- Purpose: Next.js App Router pages and API Route Handlers
- Contains: Route directories, each with `page.tsx` (pages) or `route.ts` (API endpoints)
- Key files:
  - `src/app/layout.tsx`: Root layout with ThemeProvider, QueryProvider, Toaster, OnboardingTour
  - `src/app/page.tsx`: Landing page with links to `/demo/non-uniform-time-slicing` and `/stkde-3d`
  - `src/app/globals.css`: Tailwind CSS v4 globals
  - `src/app/dashboard/page.tsx`: Main dashboard with Map + Cube + Timeline layout
  - `src/app/dashboard-demo/page.tsx`: Demo workspace shell
  - `src/app/stkde-3d/page.tsx`: 3D STKDE visualization

**`src/app/api/` — Route Handlers:**
- Purpose: Backend endpoints for data serving
- Contains: Route files organized by data domain
- Key files:
  - `src/app/api/crime/stream/route.ts`: Arrow IPC streaming
  - `src/app/api/crime/bins/route.ts`: 3D spatial-temporal bin aggregation
  - `src/app/api/crime/meta/route.ts`: Dataset metadata
  - `src/app/api/crime/overview/route.ts`: Sampled timeline overview
  - `src/app/api/crime/stats-summary/route.ts`: Temporal statistics
  - `src/app/api/crime/facets/route.ts`: Type/district facets
  - `src/app/api/crimes/range/route.ts`: Viewport-based crime data (primary endpoint)
  - `src/app/api/adaptive/global/route.ts`: Adaptive scaling maps
  - `src/app/api/adaptive/bursts/route.ts`: Burst windows
  - `src/app/api/stkde/hotspots/route.ts`: STKDE hotspot computation
  - `src/app/api/neighbourhood/poi/route.ts`: Points of interest
  - `src/app/api/study/log/route.ts`: User study logging

**`src/components/` — React Components:**
- Purpose: UI components organized by feature/domain
- Contains: Feature-based subdirectories
- Key feature dirs:
  - `viz/`: 3D visualization — CubeVisualization, Scene, MainScene, Grid, TimeSlices, SlicePlane, DataPoints, PointInspector, ClusterHighlights, HeatmapOverlay, BurstDetails, Trajectory, shaders
  - `map/`: 2D map — MapVisualization, MapBase, MapLayerManager, MapHeatmapOverlay, MapStkdeHeatmapLayer, MapTrajectoryLayer, MapClusterHighlights, MapEventLayer, MapDistrictLayer, MapPoiLayer, MapSelectionMarker, MapSelectionOverlay
  - `timeline/`: Timeline components — DualTimeline, TimelinePanel, DensityHistogram, DensityTrack, DensityAreaChart, DensityHeatStrip, TimelineBrush, TimelinePoints, AdaptiveAxis, DualTimelineSurface, TimelineContainer. Subdirs: `hooks/` (useBrushZoomSync, usePointSelection, useScaleTransforms, useDualTimelineViewModel), `layers/` (AxisLayer, HistogramLayer, MarkerLayer), `lib/` (burst-score-series, tick-ux, interaction-guards), `qa/` (timeline-qa-model, TimelineQaContextCard)
  - `dashboard-demo/`: Demo workspace — DashboardDemoShell, DashboardDemoRailTabs, DemoTimelinePanel, DemoMapVisualization, Demo3dSpatialView, DemoSlicePanel, DemoConfigurePanel, DemoDetectPanel, DemoInspectPanel, DemoStatsPanel, DemoStatsMapOverlay, DemoStkdePanel, DemoPendingDraftList, SliceComparisonCard, DemoTimelineSettingsCard. Subdir: `lib/` (useDemoStkde, useDemoBurstWindows, useDemoEvolutionSequence, demo-burst-generation, buildDashboardDemoSelectionStory, etc.)
  - `ui/`: shadcn primitives + custom — button, card, dialog, accordion, alert-dialog, badge, breadcrumb, calendar, input, label, popover, scroll-area, select, separator, sheet, skeleton, slider, switch, tabs, tooltip, error-dialog, loading-overlay, TimeControls, Overlay
  - `layout/`: DashboardLayout (resizable panels), ThemeProvider, TopBar

**`src/hooks/` — Shared React Hooks:**
- Purpose: Reusable hooks for data fetching, interaction, and utilities
- Contains: Top-level hook files
- Key files:
  - `useCrimeData.ts`: Unified crime data fetching via TanStack Query
  - `useCrimeStream.ts`: Arrow stream data loading
  - `useCrimePointCloud.ts`: Point cloud data management
  - `useViewportCrimeData.ts`: Viewport-bounded crime data
  - `useDebouncedDensity.ts`: Debounced density computation
  - `useDualTimelineScales.ts`: D3 scale management for timeline
  - `useSelectionSync.ts`: Cross-panel selection sync
  - `useSuggestionGenerator.ts`: Auto-suggestion generation
  - `useLogger.ts`: Logger hook wrapper
  - `useSmartProfiles.ts`: Context profile management
  - `useDraggable.ts`: Drag interaction
  - `useURLFeatureFlags.ts`: URL-based feature flags

**`src/lib/` — Business Logic and Utilities:**
- Purpose: Core application logic, database access, analytical computations
- Contains: Feature-subdirectories and top-level utility modules
- Key files:
  - `db.ts`: DuckDB connection management, `isMockDataEnabled()`, path resolution
  - `duckdb-aggregator.ts`: 3D bin aggregation via DuckDB
  - `queries/`: Query build pipeline — `builders.ts`, `filters.ts`, `sanitization.ts`, `types.ts`, `index.ts`, `aggregations.ts`
  - `binning/`: Time binning engine — `engine.ts`, `rules.ts`, `types.ts`, `warp-scaling.ts`, `burst-taxonomy.ts`
  - `stkde/`: STKDE computation — `compute.ts`, `contracts.ts`, `burst-evolution.ts`, `adjacent-slice-comparison.ts`, `full-population-pipeline.ts`, `heatmap-scale.ts`, `slice-stkde.phase2.test.ts`
  - `selection.ts`: Point selection and nearest-neighbor search
  - `slice-utils.ts`: Time slice utility functions
  - `full-auto-orchestrator.ts`: Auto-generation of ranked proposal sets
  - `burst-detection.ts`: Burst detection algorithms (temporal, spatial, combined)
  - `warp-generation.ts`: Warp profile generation
  - `interval-detection.ts`: Interval boundary detection
  - `time-domain.ts`: Normalized time ↔ epoch conversion
  - `coordinate-normalization.ts`: Geographic ↔ normalized coordinate mapping
  - `date-normalization.ts`: Date parsing utilities
  - `mockData.ts`: Mock crime data generation
  - `logger.ts`: Client-side logging with sendBeacon

**`src/store/` — Zustand State Stores:**
- Purpose: Global state management
- Contains: Top-level store files + `slice-domain/` subdirectory
- Key stores:
  - `useCoordinationStore.ts`: Cross-panel sync (selected index, brush range, sync status)
  - `useSliceDomainStore.ts`: Composite slice store (persisted). Composed from `slice-domain/createSliceCoreSlice`, `createSliceSelectionSlice`, `createSliceCreationSlice`, `createSliceAdjustmentSlice`
  - `useFilterStore.ts`: Filter state with localStorage preset persistence
  - `useTimeStore.ts`: Time control state (current time, playback, resolution)
  - `useAdaptiveStore.ts`: Adaptive scaling state and worker management
  - `useTimelineDataStore.ts`: Timeline columnar data and metadata
  - `useStkdeStore.ts`: STKDE computation state
  - `useMapLayerStore.ts`: Map layer visibility
  - `useLayoutStore.ts`: Resizable panel layout sizes
  - `useThemeStore.ts`: Theme state
  - `useStatsStore.ts`: Statistics filter state
  - `useBinningStore.ts`: Binning configuration
  - `useSliceStore.ts`: Slice state
  - `useWarpSliceStore.ts`: Warp slice state
  - `useClusterStore.ts`: Cluster state
  - `useSuggestionStore.ts`: Suggestion state
  - `useHeatmapStore.ts`: Heatmap state
  - `useTrajectoryStore.ts`: Trajectory state
  - `useFeatureFlagsStore.ts`: Feature flags
  - `useCubeSpatialConstraintsStore.ts`: 3D cube spatial bounds
  - `useAggregationStore.ts`: Aggregation settings
  - Dashboard demo stores: `useDashboardDemoCoordinationStore`, `useDashboardDemoFilterStore`, `useDashboardDemoTimeStore`, `useDashboardDemoTimeslicingModeStore`, `useDashboardDemoMapLayerStore`

**`src/store/slice-domain/` — Slice Store Slices:**
- Purpose: Modular slice creators for the composite slice domain store
- Contains: `types.ts`, `selectors.ts`, `createSliceCoreSlice.ts`, `createSliceSelectionSlice.ts`, `createSliceCreationSlice.ts`, `createSliceAdjustmentSlice.ts`

**`src/types/` — TypeScript Type Definitions:**
- Purpose: Canonical type definitions shared across all layers
- Contains: `crime.ts`, `adaptive.ts`, `autoProposalSet.ts`, `data.ts`, `suggestion.ts`, `index.ts` (re-exports)

**`src/workers/` — Web Workers:**
- Purpose: Off-main-thread computation
- Contains: `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`, `kdeSlice.worker.ts`, plus test files
- Pattern: Workers are instantiated by stores or hooks. They import from lib modules (serialized), receive data via `postMessage`, and post results back.

**`src/providers/` — React Providers:**
- Purpose: Context providers
- Contains: `QueryProvider.tsx` (TanStack Query client setup with 5-minute staleTime, refetchOnWindowFocus disabled)

**`src/utils/` — Utility Functions:**
- Contains: `binning.ts`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout — mounts ThemeProvider, QueryProvider, Toaster, OnboardingTour
- `src/app/page.tsx`: Home/landing page

**Configuration:**
- `next.config.ts`: Next.js config (`serverExternalPackages: ["duckdb"]`)
- `tsconfig.json`: TypeScript config with `@/*` alias to `./src/*`
- `vitest.config.mts`: Vitest config for unit tests
- `eslint.config.mjs`: ESLint config with Next.js + TypeScript rules
- `postcss.config.mjs`: PostCSS with Tailwind CSS v4
- `components.json`: shadcn/ui component registry config
- `.env`: Environment variables (`USE_MOCK_DATA`, `DUCKDB_PATH`)

**Core Logic:**
- `src/lib/db.ts`: DuckDB initialization and configuration
- `src/lib/queries/builders.ts`: SQL query builder with sanitization
- `src/lib/coordinate-normalization.ts`: Coordinate system mapping
- `src/lib/binning/engine.ts`: Time binning algorithm
- `src/lib/burst-detection.ts`: Temporal/spatial burst detection
- `src/lib/full-auto-orchestrator.ts`: Auto-proposal generation and ranking
- `src/lib/stkde/compute.ts`: STKDE computation
- `src/store/useCoordinationStore.ts`: Cross-panel synchronization
- `src/store/useSliceDomainStore.ts`: Composite slice state
- `src/hooks/useCrimeData.ts`: Unified crime data fetching

**Testing:**
- Colocated alongside source files as `*.test.ts` or `*.test.tsx`
- `src/lib/queries.test.ts`
- `src/lib/slice-utils.test.ts`
- `src/lib/adaptive-scale.test.ts`
- `src/lib/burst-detection.test.ts`
- `src/lib/date-normalization.test.ts`
- `src/lib/stkde/compute.test.ts`
- `src/store/useCoordinationStore.test.ts`
- `src/store/useAdaptiveStore.test.ts`
- `src/store/useSliceStore.test.ts`
- `src/store/useFilterStore.test.ts`
- `src/workers/adaptiveTime.worker.test.ts`
- `src/workers/stkdeHotspot.worker.test.ts`
- `src/app/stkde-3d/page.stkde.test.tsx`
- `src/app/dashboard/page.shell.test.tsx`

## Naming Conventions

**Files:**
- `PascalCase.tsx` for React components (e.g., `DualTimeline.tsx`, `DashboardDemoShell.tsx`, `CubeVisualization.tsx`)
- `camelCase.ts` for utilities, lib modules, hooks (e.g., `slice-utils.ts`, `date-normalization.ts`, `useCrimeData.ts`)
- `usePascalCaseStore.ts` for Zustand stores (e.g., `useSliceStore.ts`, `useCoordinationStore.ts`, `useDashboardDemoFilterStore.ts`)
- `*Store.ts` in `src/store/` — always prefixed with `use` for hook access
- `*.worker.ts` for Web Workers (e.g., `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- `route.ts` for API Route Handlers (Next.js convention)
- `page.tsx` for page components (Next.js convention)
- `layout.tsx` for layout components (Next.js convention)
- `*.test.ts` / `*.test.tsx` for test files, colocated with source
- `*.spec.ts` not used — all tests use `.test.` suffix

**Directories:**
- `kebab-case` for feature directories (e.g., `dashboard-demo/`, `timeline-test/`, `non-uniform-time-slicing/`, `context-diagnostics/`)
- Single-word or noun-based for src top-level dirs: `app/`, `components/`, `hooks/`, `lib/`, `store/`, `types/`, `workers/`, `providers/`, `utils/`
- `/` in component subdirs: `components/timeline/hooks/`, `components/timeline/layers/`, `components/timeline/lib/`
- `/` in lib subdirs: `lib/queries/`, `lib/binning/`, `lib/stkde/`, `lib/stats/`

## Where to Add New Code

**New Feature/Route:**
- Page: `src/app/<feature-name>/page.tsx`
- Route-specific components: `src/app/<feature-name>/components/`
- Route-specific hooks: `src/app/<feature-name>/hooks/`
- Route-specific lib: `src/app/<feature-name>/lib/`
- API endpoints: `src/app/api/<domain>/<endpoint>/route.ts`
- Example pattern: see `src/app/stkde-3d/`, `src/app/stats/`, `src/app/timeline-test/`
- Tests: colocated as `page.<feature-name>.test.tsx` in the route directory

**New Component:**
- Shared/Reusable component: `src/components/<domain>/<ComponentName>.tsx`
- Domain-specific components add subdirs: `src/components/<domain>/<subdir>/<ComponentName>.tsx`
- Example: `src/components/timeline/hooks/useBrushZoomSync.ts` or `src/components/timeline/layers/AxisLayer.tsx`
- Tests: colocated as `<ComponentName>.test.tsx`

**New Store:**
- Location: `src/store/use<Name>Store.ts`
- For composite stores with multiple slices: create slice files in `src/store/<domain>/` and compose in `src/store/use<Name>Store.ts`
- Tests: colocated as `use<Name>Store.test.ts`

**New Lib Module:**
- Domain-specific module: create subdir in `src/lib/<domain>/`
- Top-level utility: create file at `src/lib/<name>.ts`
- Tests: colocated as `<name>.test.ts`

**New Hook:**
- Location: `src/hooks/use<Name>.ts`
- Tests: colocated as `use<Name>.test.ts`

**New Web Worker:**
- Location: `src/workers/<name>.worker.ts`
- Tests: colocated as `<name>.worker.test.ts`

**New Type:**
- Location: `src/types/<name>.ts`
- Add re-export to `src/types/index.ts`

## Special Directories

**`data/`:**
- Purpose: Local data files (CSV, Parquet, DuckDB databases)
- Contains: `data/sources/Crimes_-_2001_to_Present_20260114.csv` (~8.5M rows), `data/cache/crime.duckdb`
- Generated: No (CSV is original data, DuckDB is cached)
- Committed: No (gitignored, large dataset)

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (by pnpm install)
- Committed: No

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by next build/dev)
- Committed: No

**`.planning/`:**
- Purpose: GSD workflow planning artifacts and codebase analysis documents
- Contains: `.planning/codebase/` with STRUCTURE.md, ARCHITECTURE.md, STACK.md, CONVENTIONS.md, INTEGRATIONS.md, TESTING.md, CONCERNS.md
- Generated: Yes (by `/gsd/map-codebase`)
- Committed: Yes (planning artifacts are tracked)

**`patches/`:**
- Purpose: `patch-package` patches for overridden node_modules dependencies
- Generated: No (manual patches)
- Committed: Yes

**`datapreprocessing/`:**
- Purpose: Python scripts for data preprocessing and analysis
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root
- Committed: Yes

---

*Structure analysis: 2026-06-01*
