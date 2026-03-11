# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
neon-tiger/
├── src/                 # Application source (routes, components, hooks, stores, libs)
├── data/                # Runtime data artifacts (CSV sources, cache DB)
├── scripts/             # Data setup and support scripts
├── datapreprocessing/   # Offline Python/notebook preprocessing assets
├── patches/             # patch-package patches (DuckDB)
└── .planning/codebase/  # Codebase mapping docs used by GSD planning/execution
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next App Router pages/layouts and API routes
- Contains: Route components in `src/app/*/page.tsx`, API handlers in `src/app/api/**/route.ts`
- Key files: `src/app/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/timeslicing/page.tsx`, `src/app/api/crimes/range/route.ts`

**`src/components/`:**
- Purpose: UI feature modules and reusable primitives
- Contains: Domain components in `src/components/map/`, `src/components/timeline/`, `src/components/viz/`; shadcn-style primitives in `src/components/ui/`
- Key files: `src/components/map/MapVisualization.tsx`, `src/components/timeline/DualTimeline.tsx`, `src/components/viz/MainScene.tsx`

**`src/store/`:**
- Purpose: Global and feature-scoped Zustand state
- Contains: Store modules (`use*Store.ts`) and slice-domain composition under `src/store/slice-domain/`
- Key files: `src/store/useAdaptiveStore.ts`, `src/store/useTimelineDataStore.ts`, `src/store/useSliceDomainStore.ts`

**`src/lib/`:**
- Purpose: Shared domain logic, query builders, math/normalization, and helpers
- Contains: Query stack (`src/lib/queries.ts`, `src/lib/queries/*`), DB integration (`src/lib/db.ts`), orchestration logic
- Key files: `src/lib/queries.ts`, `src/lib/db.ts`, `src/lib/full-auto-orchestrator.ts`

**`src/hooks/`:**
- Purpose: Client hooks for data, interaction, and state synchronization
- Contains: Data hooks, UI utility hooks, suggestion generation hooks
- Key files: `src/hooks/useCrimeData.ts`, `src/hooks/useSuggestionGenerator.ts`, `src/hooks/useViewportCrimeData.ts`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Global app shell and providers
- `src/app/page.tsx`: Landing entry page
- `src/app/dashboard/page.tsx`: Main integrated dashboard view
- `src/app/timeslicing/page.tsx`: Advanced timeslicing workflow route

**Configuration:**
- `package.json`: scripts + dependency graph
- `tsconfig.json`: TypeScript strict config and `@/*` alias
- `next.config.ts`: Next runtime package externals
- `vitest.config.mts`: test runner include + alias
- `eslint.config.mjs`: lint configuration

**Core Logic:**
- `src/lib/queries.ts`: data access/query orchestration
- `src/store/useAdaptiveStore.ts`: adaptive map state and worker integration
- `src/workers/adaptiveTime.worker.ts`: adaptive compute worker

**Testing:**
- `src/**/*.test.ts` and `src/**/*.test.tsx`: colocated tests
- `src/app/api/crimes/range/route.test.ts`: API contract tests
- `src/lib/queries.test.ts`: query safety/contract tests

## Naming Conventions

**Files:**
- Feature/hooks/stores use camelCase + prefix patterns: `useCrimeData.ts`, `useFilterStore.ts`, `createSliceCoreSlice.ts`
- React components use PascalCase: `DualTimeline.tsx`, `MapVisualization.tsx`
- Tests use `.test.ts` or `.test.tsx` suffix next to source files

**Directories:**
- Domain-oriented lower-case folders under `src/components/` and `src/app/` (`map`, `timeline`, `viz`, `timeslicing`)
- Specialized nested modules for slice state under `src/store/slice-domain/`

## Where to Add New Code

**New Feature:**
- Primary code: add route shell in `src/app/<feature>/page.tsx`, domain components in `src/components/<domain>/`
- Tests: add colocated tests as `*.test.ts` / `*.test.tsx` near changed modules

**New Component/Module:**
- Implementation: put domain components in `src/components/<domain>/` and shared primitives in `src/components/ui/`

**Utilities:**
- Shared helpers: `src/lib/` (pure logic) and `src/hooks/` (React-specific logic)

## Special Directories

**`src/app/api/`:**
- Purpose: Internal backend surface for frontend requests
- Generated: No
- Committed: Yes

**`data/`:**
- Purpose: Input dataset + local cache DB (`data/sources/`, `data/cache/`)
- Generated: Partially (cache DB may be generated locally)
- Committed: Yes (includes source CSV in current repo state)

**`datapreprocessing/`:**
- Purpose: Offline ETL/notebook experimentation
- Generated: Mixed (notebooks/images generated artifacts)
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Planner/executor reference docs
- Generated: Yes (by mapping workflow)
- Committed: Yes

---

*Structure analysis: 2026-03-11*
