# Codebase Structure

**Analysis Date:** 2026-04-08

## Directory Layout

```text
neon-tiger/
├── .planning/            # Planning and codebase maps
├── data/                 # Source CSVs and DuckDB cache files
├── datapreprocessing/    # Data preparation scripts and assets
├── patches/              # patch-package patches
├── public/               # Static assets
├── scripts/              # Utility scripts
├── src/                  # Application source
├── .github/              # GitHub workflows/config
├── package.json          # Package manifest and scripts
├── next.config.ts        # Next.js config
├── vitest.config.mts     # Vitest config
└── tsconfig.json         # TypeScript config
```

## Directory Purposes

**`src/app/`:**
- Purpose: App Router pages, route-local shells, and API handlers.
- Contains: `page.tsx`, `layout.tsx`, nested route folders, `route.ts` handlers, route-local `components/`, `hooks/`, and `lib/` folders.
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard-v2/page.tsx`, `src/app/timeslicing/page.tsx`, `src/app/timeslicing-algos/page.tsx`, `src/app/stkde/page.tsx`, `src/app/api/**/route.ts`.

**`src/components/`:**
- Purpose: Shared UI and visualization modules.
- Contains: map layers, timeline canvases, 3D scene pieces, controls, layout chrome, onboarding, and study UI.
- Key files: `src/components/layout/DashboardLayout.tsx`, `src/components/layout/TopBar.tsx`, `src/components/map/MapVisualization.tsx`, `src/components/viz/CubeVisualization.tsx`, `src/components/timeline/DualTimeline.tsx`, `src/components/timeline/Timeline.tsx`.

**`src/hooks/`:**
- Purpose: reusable client hooks for data loading, measuring, logging, selection sync, and generators.
- Contains: fetch hooks, layout helpers, selection helpers, and debounced compute orchestration.
- Key files: `src/hooks/useCrimeData.ts`, `src/hooks/useViewportCrimeData.ts`, `src/hooks/useSelectionSync.ts`, `src/hooks/useDebouncedDensity.ts`, `src/hooks/useSuggestionGenerator.ts`.

**`src/lib/`:**
- Purpose: shared domain logic and low-level helpers.
- Contains: query builders, STKDE compute, database access, normalization, geometry/projection, adaptive logic, and constants.
- Key files: `src/lib/queries/index.ts`, `src/lib/queries/builders.ts`, `src/lib/db.ts`, `src/lib/stkde/compute.ts`, `src/lib/stkde/full-population-pipeline.ts`, `src/lib/time-domain.ts`, `src/lib/projection.ts`, `src/lib/selection.ts`.

**`src/providers/`:**
- Purpose: client providers mounted at the root.
- Contains: React Query provider.
- Key files: `src/providers/QueryProvider.tsx`.

**`src/store/`:**
- Purpose: Zustand stores for app-wide state.
- Contains: feature stores, persisted stores, and slice-domain composition.
- Key files: `src/store/useAdaptiveStore.ts`, `src/store/useFilterStore.ts`, `src/store/useTimelineDataStore.ts`, `src/store/useCoordinationStore.ts`, `src/store/useSliceDomainStore.ts`, `src/store/useTimeslicingModeStore.ts`, `src/store/useWarpSliceStore.ts`, `src/store/useBinningStore.ts`, `src/store/useStkdeStore.ts`.

**`src/store/slice-domain/`:**
- Purpose: slice state implemented as composable slice factories.
- Contains: core, selection, creation, and adjustment slices plus selectors.
- Key files: `src/store/slice-domain/createSliceCoreSlice.ts`, `src/store/slice-domain/createSliceSelectionSlice.ts`, `src/store/slice-domain/createSliceCreationSlice.ts`, `src/store/slice-domain/createSliceAdjustmentSlice.ts`, `src/store/slice-domain/selectors.ts`, `src/store/slice-domain/types.ts`.

**`src/workers/`:**
- Purpose: worker-backed compute.
- Contains: adaptive map computation and STKDE hotspot projection.
- Key files: `src/workers/adaptiveTime.worker.ts`, `src/workers/stkdeHotspot.worker.ts`.

**`src/types/`:**
- Purpose: shared type definitions that are not feature-specific.
- Key files: `src/types/crime.ts`, `src/types/autoProposalSet.ts`, `src/types/index.ts`.

**`src/utils/`:**
- Purpose: small generic helpers used outside the core domain layer.
- Key files: `src/utils/binning.ts`.

**`data/`:**
- Purpose: source datasets and derived DuckDB caches.
- Contains: `data/sources/Crimes_-_2001_to_Present_20260114.csv` and `data/cache/crime.duckdb`.

**`datapreprocessing/`:**
- Purpose: ETL and dataset preparation assets.
- Contains: preprocessing scripts and notes.

**`public/`:**
- Purpose: static assets served directly by Next.js.
- Contains: images and SVGs used by the app shell.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: root provider composition.
- `src/app/page.tsx`: landing page routing.
- `src/app/dashboard/page.tsx`: main dashboard shell.
- `src/app/timeslicing/page.tsx`: timeslice workflow shell.
- `src/app/timeslicing-algos/page.tsx`: algorithm exploration shell.
- `src/app/stkde/page.tsx`: STKDE route shell.
- `src/app/api/**/route.ts`: server endpoints.

**Configuration:**
- `package.json`: scripts, dependencies, postinstall symlink.
- `tsconfig.json`: TypeScript strictness and `@/*` alias.
- `vitest.config.mts`: test environment and alias resolution.
- `next.config.ts`: DuckDB server external package declaration.
- `eslint.config.mjs`: linting rules.

**Core Logic:**
- `src/lib/queries/`: SQL assembly and safe query helpers.
- `src/lib/stkde/`: STKDE contracts, compute, and full-population pipeline.
- `src/store/`: cross-view state and workflow state.
- `src/components/timeline/`: brush, histogram, density, and sync layers.
- `src/components/map/`: map layers, overlays, and MapLibre wrappers.
- `src/components/viz/`: 3D scene and cube rendering.

**Testing:**
- `src/**/*.test.ts` and `src/**/*.test.tsx`: colocated Vitest specs.
- `src/app/**/page.*.test.ts*`: route-level QA and workflow tests.
- `src/components/**/**/*.test.ts*`: component and interaction tests.
- `src/lib/**/*.test.ts`: core algorithm tests.

## Naming Conventions

**Files:**
- React components use `PascalCase.tsx`: `src/components/map/MapVisualization.tsx`.
- Stores use `useXStore.ts`: `src/store/useAdaptiveStore.ts`.
- Route handlers use `route.ts`: `src/app/api/crimes/range/route.ts`.
- Tests use `.test.ts` / `.test.tsx` next to the target file.

**Directories:**
- Feature folders are lowercase and domain-oriented: `timeline`, `map`, `stkde`, `timeslicing`, `stats`.
- Route-local support folders are nested beside the route: `src/app/timeslicing/components/`, `src/app/stkde/lib/`, `src/app/dashboard-v2/hooks/`.

## Where to Add New Code

**New page or route shell:**
- Primary code: `src/app/<route>/page.tsx`.
- Route-local helpers: `src/app/<route>/components/`, `src/app/<route>/hooks/`, `src/app/<route>/lib/`.

**New shared visual component:**
- Implementation: `src/components/<domain>/`.
- Prefer colocating related layers or overlays inside the same domain folder.

**New client state:**
- Implementation: `src/store/use<Name>Store.ts`.
- If the state is slice-based, add slice factories in `src/store/slice-domain/` and re-export through `src/store/useSliceDomainStore.ts`.

**New computation or query logic:**
- Implementation: `src/lib/<domain>/`.
- Workerized versions belong in `src/workers/`.

**New API endpoint:**
- Implementation: `src/app/api/<resource>/route.ts`.
- Keep request validation near the route or in shared contracts under `src/lib/`.

**New tests:**
- Place beside the implementation with the same basename and `.test.ts` / `.test.tsx` suffix.

## Special Directories

**`.planning/`:**
- Purpose: generated analysis and roadmap files.
- Generated: Yes.
- Committed: Yes.

**`data/`:**
- Purpose: large source and cache files for DuckDB-backed features.
- Generated: Mixed.
- Committed: Mixed; source CSVs are checked in, runtime caches are disposable.

**`patches/`:**
- Purpose: `patch-package` overrides.
- Generated: Yes, but committed.

**`public/`:**
- Purpose: static assets.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-04-08*
