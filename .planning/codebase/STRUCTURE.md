# Codebase Structure

**Analysis Date:** 2026-03-06

## Directory Layout

```
neon-tiger/
├── src/                     # Application source
│   ├── app/                 # Next.js App Router routes + API endpoints
│   ├── components/          # UI and visualization components
│   ├── hooks/               # Data and interaction hooks
│   ├── lib/                 # Data/query utilities and algorithm modules
│   ├── providers/           # App-level providers (React Query)
│   ├── store/               # Zustand stores
│   ├── types/               # Typed domain contracts
│   ├── utils/               # Utility functions
│   └── workers/             # Web Worker compute modules
├── data/                    # Local dataset area (README + generated/ignored data files)
├── scripts/                 # Data setup and local test scripts
├── .planning/codebase/      # Codebase mapping docs consumed by GSD planner/executor
└── package.json             # Scripts + dependency graph
```

## Directory Purposes

**`src/app/`:**
- Purpose: Feature routes and API route handlers.
- Contains: UI route pages (`/timeslicing`, `/timeline-test`, `/timeline-test-3d`) and API endpoints (`/api/**`).
- Key files: `src/app/timeslicing/page.tsx`, `src/app/timeline-test/page.tsx`, `src/app/timeline-test-3d/page.tsx`, `src/app/api/crimes/range/route.ts`.

**`src/app/timeline-test-3d/` (New):**
- Purpose: Dedicated 3D route with route-local orchestration helpers.
- Contains: Page component, route-orchestration helpers, suggestion panel components.
- Key files: `src/app/timeline-test-3d/page.tsx`, `src/app/timeline-test-3d/lib/route-orchestration.ts`, `src/app/timeline-test-3d/components/TimelineTest3DScene.tsx`, `src/app/timeline-test-3d/components/SuggestionPanel.tsx`.

**`src/components/timeline/`:**
- Purpose: Timeline rendering and interaction components.
- Contains: `DualTimeline.tsx`, density tracks, axes, layers.
- Key files: `src/components/timeline/DualTimeline.tsx`, `src/components/timeline/DensityHeatStrip.tsx`.

**`src/app/timeline-test/`:**
- Purpose: QA route for timeline/slice interaction experiments.
- Contains: feature-specific components and libs for slice creation/adjustment.
- Key files: `src/app/timeline-test/page.tsx`, `src/app/timeline-test/lib/slice-adjustment.ts`, `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx`.

**`src/app/timeslicing/`:**
- Purpose: Semi-automated timeslicing workflow route.
- Contains: suggestion panel/toolbar/cards, full-auto acceptance, route layout.
- Key files: `src/app/timeslicing/page.tsx`, `src/app/timeslicing/components/SuggestionToolbar.tsx`, `src/app/timeslicing/components/SuggestionPanel.tsx`, `src/app/timeslicing/full-auto-acceptance.ts`.

**`src/store/`:**
- Purpose: Persistent/shared state.
- Contains: data, adaptive, filter, slice, suggestion, warp, and UI stores.
- Key files: `src/store/useDataStore.ts`, `src/store/useAdaptiveStore.ts`, `src/store/useSliceStore.ts`, `src/store/useSuggestionStore.ts`, `src/store/useWarpSliceStore.ts`.

**`src/lib/`:**
- Purpose: Query/data-access and algorithm modules.
- Contains: DuckDB setup, SQL query functions, confidence/boundary/warp generators, full-auto orchestrator.
- Key files: `src/lib/db.ts`, `src/lib/queries.ts`, `src/lib/warp-generation.ts`, `src/lib/interval-detection.ts`, `src/lib/confidence-scoring.ts`, `src/lib/full-auto-orchestrator.ts`.

**`src/types/`:**
- Purpose: TypeScript type definitions.
- Contains: Domain types for crime data, auto proposal sets.
- Key files: `src/types/crime.ts`, `src/types/autoProposalSet.ts`, `src/types/index.ts`.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: root providers (`ThemeProvider`, `QueryProvider`, `Toaster`).
- `src/app/page.tsx`: home route.
- `src/app/timeline-test/page.tsx`: timeline test harness.
- `src/app/timeline-test-3d/page.tsx`: 3D timeline test route (new).
- `src/app/timeslicing/page.tsx`: timeslicing route.

**Configuration:**
- `package.json`: scripts (`dev`, `build`, `test`, `typecheck`, `lint`) and `postinstall` DuckDB symlink.
- `tsconfig.json`: strict TS and `@/*` alias.
- `eslint.config.mjs`: lint rules and ignores.
- `vitest.config.ts`: test include pattern and alias.

**Core Logic:**
- `src/hooks/useCrimeData.ts`: canonical client fetch hook.
- `src/app/api/crimes/range/route.ts`: canonical range API.
- `src/components/timeline/DualTimeline.tsx`: brush/zoom/tick/selection orchestration.
- `src/store/useAdaptiveStore.ts`: adaptive map store + worker integration.
- `src/lib/full-auto-orchestrator.ts`: new full-auto proposal generation and ranking.

**Testing:**
- Co-located tests in `src/**/*.test.ts`.
- Representative test hubs: `src/store/useSliceStore.test.ts`, `src/store/useSliceAdjustmentStore.test.ts`, `src/lib/db.test.ts`, `src/lib/crime-api.test.ts`, `src/lib/full-auto-orchestrator.test.ts` (new).

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `DualTimeline.tsx`, `SuggestionPanel.tsx`).
- Hooks/stores: `useXxx.ts` (e.g., `useCrimeData.ts`, `useAdaptiveStore.ts`).
- API handlers: `route.ts` under feature directories (e.g., `src/app/api/crimes/range/route.ts`).
- Tests: co-located `*.test.ts` (e.g., `src/lib/slice-utils.test.ts`).
- Algorithm modules: `*-orchestrator.ts`, `*-generation.ts`, `*-detection.ts`, `*-scoring.ts`.

**Directories:**
- Feature folders are kebab-case in app routes (`src/app/timeline-test`, `src/app/timeline-test-3d`, `src/app/timeslicing`).
- Domain folders are lower-case (`src/store`, `src/hooks`, `src/lib`).

## Where to Add New Code

**New feature page (timeline/time slicing/3D):**
- Primary code: `src/app/<feature>/page.tsx`
- Route-specific components: `src/app/<feature>/components/`
- Route-specific utilities: `src/app/<feature>/lib/`

**New suggestion/workflow module:**
- Store contract/state: `src/store/useSuggestionStore.ts` (or `src/store/use<Feature>Store.ts`)
- Orchestration hook: `src/hooks/useSuggestionGenerator.ts`
- Pure algorithms: `src/lib/<algorithm>.ts` (e.g., `full-auto-orchestrator.ts`)
- Type definitions: `src/types/<feature>.ts` (e.g., `autoProposalSet.ts`)
- UI controls/cards: `src/app/timeslicing/components/` or `src/app/timeline-test-3d/components/`

**New API-backed data flow:**
- Client hook: `src/hooks/use<Domain>Data.ts`
- API route: `src/app/api/<domain>/<action>/route.ts`
- Query/data-access helper: `src/lib/queries.ts` (or a new focused module under `src/lib/`)

**Utilities:**
- Shared cross-feature helpers: `src/lib/`
- Viewport-specific store utilities: `src/lib/stores/`
- Shared utility functions: `src/utils/`

## Special Directories

**`data/`:**
- Purpose: Local data assets and docs.
- Generated: Yes (via `scripts/setup-data.js` for `data/source.csv` and `data/crime.parquet`).
- Committed: README is committed; large data files are ignored by `.gitignore`.

**`patches/`:**
- Purpose: `patch-package` patch files applied on install.
- Generated: Yes (when patching dependencies).
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Codebase maps for GSD planning/execution.
- Generated: No (manual/agent-authored docs).
- Committed: Yes.

---

*Structure analysis: 2026-03-06*
