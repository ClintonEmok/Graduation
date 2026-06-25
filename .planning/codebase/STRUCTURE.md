# Codebase Structure

**Analysis Date:** 2026-06-25

## Directory Layout

```
project-root/
├── .planning/          # GSD planning artifacts (codebase maps, phase plans, milestons)
├── .github/            # GitHub workflows and templates
├── data/               # Crime dataset (CSV) and DuckDB cache
│   ├── sources/        # Raw CSV: Crimes_-_2001_to_Present_20260114.csv (~8.5M rows)
│   └── cache/          # DuckDB database file: crime.duckdb
├── docs/               # Project documentation
├── scripts/            # Build/utility scripts
├── patches/            # patch-package patches for node_modules
├── screenshots/        # UI screenshots
├── public/             # Static assets (favicon, images)
├── src/                # Application source code
│   ├── app/            # Next.js App Router pages, API routes, layout
│   ├── components/     # React components by feature domain
│   ├── hooks/          # React hooks (data fetching, interaction, utilities)
│   ├── lib/            # Business logic, utilities, computation modules
│   ├── providers/      # React context providers (QueryProvider)
│   ├── store/          # Zustand state stores
│   ├── types/          # Canonical TypeScript type definitions
│   ├── utils/          # Shared utility functions
│   └── workers/        # Web Workers for offloaded computation
├── node_modules/
├── next.config.ts      # Next.js configuration
├── tsconfig.json       # TypeScript configuration (@/* path alias to ./src/*)
├── eslint.config.mjs   # ESLint config (Next.js core-web-vitals + TypeScript)
├── postcss.config.mjs  # PostCSS with Tailwind CSS
├── vitest.config.mts   # Vitest test configuration
├── components.json     # shadcn/ui configuration
├── pnpm-workspace.yaml # pnpm workspace config
├── package.json        # Dependencies and scripts
└── pnpm-lock.yaml
```

## Directory Purposes

### `src/app/` — Next.js App Router Pages & API Routes

- Purpose: All page routes and API endpoints using Next.js App Router conventions
- Contains: Page files (`page.tsx`), layouts (`layout.tsx`), API route handlers (`route.ts`)
- Key files:
  - `src/app/layout.tsx` — Root layout with ThemeProvider, QueryProvider, Toaster, OnboardingTour
  - `src/app/page.tsx` — Landing page with navigation links to major views
  - `src/app/globals.css` — Global Tailwind CSS styles

**Page Routes:**

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Landing/navigation page |
| `/dashboard` | `src/app/dashboard/page.tsx` | Main visualization: map, cube, timeline |
| `/dashboard-demo` | `src/app/dashboard-demo/page.tsx` | Refined demo with rail tabs |
| `/dashboard-v2` | `src/app/dashboard-v2/page.tsx` | Alternative dashboard with STKDE |
| `/timeslicing` | `src/app/timeslicing/page.tsx` | Time slicing workflow with suggestions |
| `/stkde-3d` | `src/app/stkde-3d/page.tsx` | 3D STKDE visualization |
| `/stkde` | `src/app/stkde/page.tsx` | 2D STKDE analysis |
| `/stats` | `src/app/stats/page.tsx` | Statistical dashboard |
| `/timeline-test` | `src/app/timeline-test/page.tsx` | Timeline interaction testbed |
| `/demo/non-uniform-time-slicing` | `src/app/demo/non-uniform-time-slicing/page.tsx` | Adaptive time scaling demo |
| `/evaluation` | `src/app/evaluation/page.tsx` | User study evaluation |
| `/hotspot-evolution` | `src/app/hotspot-evolution/page.tsx` | Hotspot evolution flow |
| `/cube-sandbox` | `src/app/cube-sandbox/page.tsx` | 3D cube sandbox |
| `/algorithms` | `src/app/algorithms/page.tsx` | Algorithm complexity documentation |
| `/docs` | `src/app/docs/page.tsx` | Documentation page |
| `/figures/*` | `src/app/figures/` | Figure/timeline/map/cube standalone views |
| `/timeline-test-3d` | `src/app/timeline-test-3d/page.tsx` | 3D timeline test |
| `/timeslicing-algos` | `src/app/timeslicing-algos/page.tsx` | Timeline algorithm comparison |

**API Routes:**

| Route | File | Purpose |
|-------|------|---------|
| `/api/crime/stream` | `src/app/api/crime/stream/route.ts` | Crime data as Arrow IPC stream |
| `/api/crime/bins` | `src/app/api/crime/bins/route.ts` | Aggregated 3D bins |
| `/api/crime/facets` | `src/app/api/crime/facets/route.ts` | Faceted crime stats |
| `/api/crime/meta` | `src/app/api/crime/meta/route.ts` | Dataset metadata |
| `/api/crime/overview` | `src/app/api/crime/overview/route.ts` | Dataset overview |
| `/api/crime/stats-summary` | `src/app/api/crime/stats-summary/route.ts` | Statistical summary |
| `/api/crime/around` | `src/app/api/crime/around/route.ts` | Crime data near point |
| `/api/crimes/range` | `src/app/api/crimes/range/route.ts` | Crime records in date range |
| `/api/adaptive/global` | `src/app/api/adaptive/global/route.ts` | Precomputed adaptive maps |
| `/api/adaptive/bursts` | `src/app/api/adaptive/bursts/route.ts` | Burst window detection |
| `/api/stkde/hotspots` | `src/app/api/stkde/hotspots/route.ts` | STKDE hotspot computation |
| `/api/neighbourhood/poi` | `src/app/api/neighbourhood/poi/route.ts` | Points of interest |
| `/api/study/log` | `src/app/api/study/log/route.ts` | Study event logging |

### `src/components/` — React Components

- Purpose: Reusable UI components organized by feature domain
- Contains: Presentation and container components
- Key subdirectories:

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `ui/` | shadcn/ui primitives (button, card, dialog, slider, etc.) | `button.tsx`, `card.tsx`, `dialog.tsx`, `slider.tsx`, `select.tsx`, `tabs.tsx` |
| `map/` | MapLibre GL map components | `MapBase.tsx`, `MapVisualization.tsx`, `MapHeatmapOverlay.tsx`, `MapLayerManager.tsx`, `MapStkdeHeatmapLayer.tsx` |
| `viz/` | 3D visualization (Three.js/R3F) components | `CubeVisualization.tsx`, `MainScene.tsx`, `Scene.tsx`, `TimePlane.tsx`, `TimeSlices.tsx`, `SlicePlane.tsx`, `DataPoints.tsx` |
| `timeline/` | Timeline/adaptive time components | `DualTimeline.tsx`, `TimelinePanel.tsx`, `DualTimelineSurface.tsx`, `DensityHeatStrip.tsx`, `DensityTrack.tsx` |
| `layout/` | Layout components | `DashboardLayout.tsx`, `ThemeProvider.tsx`, `TopBar.tsx` |
| `dashboard-demo/` | Dashboard demo shell and panels | `DashboardDemoShell.tsx`, `DemoMapVisualization.tsx`, `Demo3dSpatialView.tsx`, `DemoTimelinePanel.tsx`, `DemoSlicePanel.tsx` |
| `dashboard/` | Dashboard header | `DashboardHeader.tsx` |
| `binning/` | Binning controls | `BinningControls.tsx` |
| `stkde/` | STKDE-related components | `DashboardStkdePanel.tsx` |
| `evaluation/` | Study evaluation components | `EvaluationShell.tsx`, `EvaluationQuestionnaire.tsx`, `EvaluationTaskCard.tsx` |
| `study/` | Study controls | `StudyControls.tsx` |
| `settings/` | Settings/feature flags | `SettingsPanel.tsx`, `FeatureFlagItem.tsx`, `URLConflictDialog.tsx` |
| `onboarding/` | Tour/guide | `OnboardingTour.tsx` |

### `src/store/` — Zustand State Stores

- Purpose: All client-side global state management
- Contains: ~40+ Zustand store files, slice-domain subdirectory
- Pattern: Each store is a standalone `create()` call with typed interface
- Key stores:

| Store | Purpose |
|-------|---------|
| `useCoordinationStore.ts` | Cross-panel selection synchronization, brush range, sync status |
| `useAdaptiveStore.ts` | Adaptive time scaling (warp factor, density/burstiness maps, worker communication) |
| `useSliceDomainStore.ts` | Time slice CRUD with composable slice domains (core, selection, creation, adjustment) |
| `useFilterStore.ts` | Data filters (crime types, districts, time range, spatial bounds) |
| `useTimeStore.ts` | Timeline playback state (current time, speed, resolution, play/pause) |
| `useTimelineDataStore.ts` | Timeline summary data cache |
| `useLayoutStore.ts` | Resizable panel layout proportions |
| `useThemeStore.ts` | Theme mode (dark, light, colorblind) |
| `useStkdeStore.ts` | STKDE computation results, hotspot selection |
| `useClusterStore.ts` | DBSCAN clustering results |
| `useWarpProposalStore.ts` | Adaptive warp proposals |
| `useIntervalProposalStore.ts` | Burst interval proposals |
| `useBinningStore.ts` | Binning configuration |
| `useCubeSpatialConstraintsStore.ts` | 3D cube spatial constraints |
| `useSuggestionStore.ts` | Auto-generated slicing suggestions |
| `useContextProfileStore.ts` | Context profiles for adaptive suggestions |
| `useFeatureFlagsStore.ts` | Feature flag toggles |
| `useHeatmapStore.ts` | Heatmap configuration |
| `useMapLayerStore.ts` | Map layer visibility |

### `src/store/slice-domain/` — Composable Slice Store

- Purpose: Composable Zustand slice pattern for time slice management
- Contains: Four slice creators composed into `useSliceDomainStore`
- Files:
  - `types.ts` — All type definitions including `TimeSlice`, `SliceCoreState`, `SliceSelectionState`, `SliceCreationState`, `SliceAdjustmentState`, `SliceDomainState`
  - `createSliceCoreSlice.ts` — Core CRUD operations for time slices (add, remove, update, merge, clear, burst slice creation)
  - `createSliceSelectionSlice.ts` — Selection state (select, deselect, toggle, selectAll)
  - `createSliceCreationSlice.ts` — Creation workflow (start, preview, commit, cancel) with snap/preview feedback
  - `createSliceAdjustmentSlice.ts` — Drag-to-adjust handles, snap modes, tooltip, limit cues
  - `selectors.ts` — Extracted selector functions for granular subscriptions

### `src/hooks/` — React Hooks

- Purpose: Data fetching hooks, interaction hooks, utility hooks
- Contains: 20 hooks
- Key hooks:

| Hook | Purpose |
|------|---------|
| `useCrimeData.ts` | Main crime data fetching via TanStack Query |
| `useViewportCrimeData.ts` | Viewport-aware crime data fetching (deprecated wrapper) |
| `useCrimeStream.ts` | Direct Arrow stream consumption |
| `useCrimePointCloud.ts` | Point cloud data for 3D rendering |
| `useAdaptiveScale.ts` | Adaptive scale calculations |
| `useDualTimelineScales.ts` | Timeline scale computations |
| `useBurstWindows.ts` | Burst window detection (from components/) |
| `useDebouncedDensity.ts` | Debounced density computation |
| `useDraggable.ts` | Generic drag interaction |
| `useHotspotEvolution.ts` | Hotspot evolution flow |
| `useSliceStats.ts` | Statistical summaries for slices |
| `useSuggestionGenerator.ts` | Auto-suggestion generation |
| `useSelectionSync.ts` | Selection sync across views |
| `useSmartProfiles.ts` | Smart context profiles |
| `useLogger.ts` | Component-level logging interface |
| `useMeasure.ts` | Element measurement via ResizeObserver |
| `useDebounce.ts` | Debounced value |
| `useURLFeatureFlags.ts` | URL-based feature flag overrides |
| `useContextExtractor.ts` | Context feature extraction |

### `src/lib/` — Business Logic & Utilities

- Purpose: Pure function modules, algorithm implementations, data processing
- Contains: 68 entries (files + subdirectories)
- Key subdirectories:

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `queries/` | DuckDB query builders with sanitization | `builders.ts`, `filters.ts`, `sanitization.ts`, `aggregations.ts` |
| `stkde/` | STKDE computation pipeline | `compute.ts`, `contracts.ts`, `full-population-pipeline.ts`, `adjacent-slice-comparison.ts`, `burst-evolution.ts`, `heatmap-scale.ts` |
| `binning/` | Time binning engine | `engine.ts`, `types.ts`, `rules.ts`, `warp-scaling.ts`, `burst-taxonomy.ts` |
| `adaptive/` | Adaptive time scaling mode routing | `route-binning-mode.ts` |
| `stats/` | Statistical analysis | `aggregation.ts`, `temporal-pulses.ts` |
| `study/` | Evaluation study protocol | `protocol.ts`, `condition-order.ts`, `storage.ts`, `resetTargets.ts` |
| `kde/` | Slice KDE computation | `compute-slice-kde.ts`, `types.ts` |
| `clustering/` | DBSCAN cluster analysis | `cluster-analysis.ts` |
| `evolution/` | Burst evolution flow | `evolution-flow.ts` |
| `motion/` | Motion/animation utilities | `aging.ts`, `easing.ts` |
| `stores/` | Additional stores (non-Zustand) | `viewportStore.ts` |
| `neighbourhood/` | Chicago neighborhood data | `chicago.ts`, `osm.ts`, `types.ts` |
| `context-diagnostics/` | Context profile diagnostics | `compare.ts`, `profile.ts`, `spatial.ts`, `temporal.ts` |
| `data/` | Data type selectors | `selectors.ts`, `types.ts` |

- Key standalone files:
  - `db.ts` — DuckDB connection management, path resolution, mock detection
  - `duckdb-aggregator.ts` — Aggregated bin computation
  - `coordinate-normalization.ts` — `lonLatToNormalized()` coordinate conversion
  - `date-normalization.ts` — Date-to-epoch conversion utilities
  - `time-domain.ts` — Normalized time domain [0, 100] ↔ epoch mapping
  - `slice-utils.ts` — Slice comparison, tolerance calculation
  - `slice-allocator.ts` — Bin-to-slice allocation logic
  - `interval-detection.ts` — Burst interval detection algorithm
  - `confidence-scoring.ts` — Confidence scoring for suggestions
  - `burst-detection.ts` — Burst detection algorithm
  - `hotspot-evolution.ts` — Hotspot evolution tracking
  - `trajectories.ts` — Hotspot trajectory computation
  - `projection.ts` — Geographic projection utilities
  - `logger.ts` — `LoggerService` class for study logging
  - `downsample.ts` — Data downsampling for performance
  - `timeline-series.ts` — Timeline series computation
  - `time-range.ts` — Time range utilities
  - `warp-generation.ts` — Warp map generation
  - `full-auto-orchestrator.ts` — Full auto-suggestion orchestrator

### `src/types/` — TypeScript Type Definitions

- Purpose: Canonical type definitions shared across all layers
- Contains:
  - `crime.ts` — `CrimeRecord`, `CrimeViewport`, `UseCrimeDataOptions`, `UseCrimeDataResult`, `CrimeDataMeta`
  - `adaptive.ts` — `AdaptiveBinningMode`
  - `autoProposalSet.ts` — Auto-proposal set types
  - `suggestion.ts` — Suggestion types
  - `data.ts` — `ColumnarData`
  - `index.ts` — Re-exports from all type modules

### `src/workers/` — Web Workers

- Purpose: Offload computation from main thread
- Contains: 3 workers + 2 test files
- Files:
  - `adaptiveTime.worker.ts` — Computes density map, burstiness map, warp map from timestamps using configurable KDE
  - `stkdeHotspot.worker.ts` — Filters and sorts STKDE hotspot results by intensity, support, temporal/spatial bounds
  - `kdeSlice.worker.ts` — KDE computation per time slice

### `src/providers/` — React Context Providers

- Purpose: React context wrappers for application-wide services
- Contains:
  - `QueryProvider.tsx` — TanStack Query client provider with 5-min stale time, 10-min GC

### `src/utils/` — Utility Functions

- Purpose: Small utility functions
- Contains: `binning.ts` — Binning utility functions

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — Root layout with providers
- `src/app/page.tsx` — Landing page
- `src/app/api/crime/stream/route.ts` — Primary crime data API entry point

**Configuration:**
- `next.config.ts` — Next.js configuration (serverExternalPackages for duckdb)
- `tsconfig.json` — TypeScript with `@/*` path alias to `./src/*`
- `eslint.config.mjs` — ESLint rules
- `vitest.config.mts` — Vitest configuration
- `postcss.config.mjs` — PostCSS with Tailwind CSS
- `components.json` — shadcn/ui configuration
- `.env` — Environment variables (USE_MOCK_DATA, DUCKDB_PATH, etc.)

**Core Logic:**
- `src/lib/db.ts` — DuckDB connection management
- `src/lib/queries/builders.ts` — Type-safe query construction
- `src/lib/stkde/compute.ts` — STKDE algorithm
- `src/lib/binning/engine.ts` — Time binning engine
- `src/lib/adaptive-utils.ts` — Adaptive constants
- `src/lib/coordinate-normalization.ts` — Geographic coordinate normalization
- `src/lib/interval-detection.ts` — Burst interval detection
- `src/lib/logger.ts` — Logging service

**Testing:**
- `vitest.config.mts` — Vitest configuration
- Test files co-located with source (`*.test.ts`, `*.test.tsx`) or in `__tests__/` adjacent

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `DualTimeline.tsx`, `SuggestionPanel.tsx`)
- Hooks: `usePascalCase.ts` (e.g., `useCrimeData.ts`, `useAdaptiveScale.ts`)
- Stores: `usePascalCaseStore.ts` (e.g., `useAdaptiveStore.ts`, `useSliceDomainStore.ts`)
- Workers: `*.worker.ts` (e.g., `adaptiveTime.worker.ts`)
- Types: `camelCase.ts` (e.g., `crime.ts`, `adaptive.ts`)
- Tests: `*.test.ts` or `*.test.tsx` (e.g., `slice-utils.test.ts`)
- Page files: `page.tsx` (Next.js convention)
- Layout files: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)

**Directories:**
- Feature directories: `camelCase/` (e.g., `dashboard-demo/`, `timeline-test/`, `slice-domain/`)
- Component group directories: `camelCase/` (e.g., `ui/`, `map/`, `viz/`, `timeline/`)
- Lib subdirectories: `camelCase/` (e.g., `queries/`, `stkde/`, `binning/`, `adaptive/`)

## Where to Add New Code

**New Feature/Page:**
- Page component: `src/app/<feature-name>/page.tsx`
- Feature-specific components: `src/app/<feature-name>/components/` (co-located with page)
- Feature-specific lib: `src/app/<feature-name>/lib/`
- Shared components: `src/components/<domain>/<ComponentName>.tsx`
- Tests: co-located as `*.test.ts` or `*.test.tsx`

**New Component:**
- shadcn/ui primitives: `src/components/ui/<name>.tsx` (also update `components.json`)
- Feature-specific: `src/components/<domain>/<ComponentName>.tsx`
- 3D visualization: `src/components/viz/<ComponentName>.tsx`
- Map: `src/components/map/<ComponentName>.tsx`
- Timeline: `src/components/timeline/<ComponentName>.tsx`

**New Store:**
- `src/store/use<PascalCase>Store.ts`
- If composable (slice pattern): `src/store/slice-domain/<slice-creator>.ts`

**New Hook:**
- `src/hooks/use<PascalCase>.ts`

**New API Route:**
- `src/app/api/<domain>/<action>/route.ts`

**New Lib Module:**
- Single file: `src/lib/<name>.ts`
- Module with multiple files: `src/lib/<module-name>/<file>.ts`

**New Worker:**
- `src/workers/<name>.worker.ts`
- Tests: `src/workers/<name>.worker.test.ts`

**New Types:**
- Add to existing file in `src/types/` or create new file and re-export from `src/types/index.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts — codebase documents, phase plans, milestones
- Generated: Yes (by GSD tools)
- Committed: Yes

**`node_modules/`:**
- Purpose: Third-party dependencies
- Generated: Yes (`pnpm install`)
- Committed: No

**`data/sources/`:**
- Purpose: Raw CSV crime dataset (~8.5M rows, 2001-2026)
- Generated: No (manually placed)
- Committed: Yes (project datasets)

**`data/cache/`:**
- Purpose: DuckDB database file (compiled from CSV)
- Generated: Yes (first DuckDB query)
- Committed: No (gitignored)

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (`next build` or `next dev`)
- Committed: No

**`patches/`:**
- Purpose: patch-package overrides for node_modules
- Generated: No (manually created)
- Committed: Yes

---

*Structure analysis: 2026-06-25*
