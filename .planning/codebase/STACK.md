# Technology Stack

**Analysis Date:** 2026-04-08

## Languages

**Primary:**
- TypeScript 5.9.3 - App Router pages, API routes, hooks, stores, workers, and domain logic in `src/app/**`, `src/components/**`, `src/lib/**`, `src/store/**`, and `src/workers/**`.

**Secondary:**
- JavaScript - Node scripts such as `scripts/setup-data.js`, `scripts/test-maps.ts`, and `scripts/test-filter-store.ts`.
- Markdown - Planning and dataset notes in `.planning/**` and `data/README.md`.

## Runtime

**Environment:**
- Next.js server runtime with Node.js for DuckDB-backed route handlers in `src/app/api/**/route.ts`.
- Browser runtime for client components in `src/app/**`, React Query hooks in `src/providers/QueryProvider.tsx`, and Web Workers in `src/workers/*.ts`.
- Node.js 20+ is the effective baseline (`@types/node: ^20`, `tsconfig.json`, `vitest.config.mts`).

**Package Manager:**
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router application and API surface (`src/app/page.tsx`, `src/app/api/crime/stream/route.ts`)
- React 19.2.3 / React DOM 19.2.3 - UI runtime

**State/Data Fetching:**
- `@tanstack/react-query` 5.90.21 - Server-state cache and request lifecycle in `src/providers/QueryProvider.tsx` and `src/hooks/useCrimeData.ts`
- `zustand` 5.0.10 - Client stores in `src/store/*.ts`

**Visualization:**
- `three` 0.182.0 + `@react-three/fiber` 9.5.0 + `@react-three/drei` 10.7.7 - 3D cube and visual layers in `src/components/viz/**` and `src/app/timeline-test-3d/**`
- `maplibre-gl` 5.17.0 + `react-map-gl` 8.1.0 - Map views in `src/components/map/**`
- `@visx/*` + D3 packages - Timeline, charts, brush/zoom, and scales in `src/components/timeline/**`

**Build/Dev:**
- ESLint 9 with `eslint-config-next` - linting via `eslint.config.mjs`
- TypeScript strict mode - compile-time checks via `tsconfig.json`
- Tailwind CSS 4 + `@tailwindcss/postcss` - styling via `postcss.config.mjs` and `src/app/globals.css`
- Vitest 4 + jsdom - test runner in `vitest.config.mts`
- patch-package - postinstall patching for native dependency setup

## Key Dependencies

**Critical:**
- `duckdb` 1.4.4 - Embedded analytical database and CSV query engine used by `src/lib/db.ts`, `src/lib/queries.ts`, and `src/app/api/**` routes
- `apache-arrow` 21.1.0 - Arrow stream serialization in `src/app/api/crime/stream/route.ts`
- `next`, `react`, `react-dom` - Application framework/runtime

**Infrastructure:**
- `@loaders.gl/core`, `@loaders.gl/arrow` - Arrow/data loading utilities
- `class-variance-authority`, `clsx`, `tailwind-merge` - UI composition helpers
- `radix-ui`, `lucide-react`, `sonner`, `driver.js`, `react-day-picker`, `react-resizable-panels` - UI primitives and interaction affordances
- `date-fns`, `d3-array`, `d3-scale`, `d3-brush`, `d3-zoom`, `d3-time`, `d3-selection`, `lodash.debounce`, `density-clustering` - date, geometry, and clustering helpers

## Configuration

**Environment:**
- Mock-data mode is controlled by `USE_MOCK_DATA` or `DISABLE_DUCKDB` in `src/lib/db.ts`.
- DuckDB file path is controlled by `DUCKDB_PATH` in `src/lib/db.ts`.
- STKDE full-population QA mode is controlled by `STKDE_QA_FULL_POP_ENABLED` in `src/app/api/stkde/hotspots/route.ts`.
- Root `.env` is present; treat it as local configuration only.

**Build:**
- `next.config.ts` sets `serverExternalPackages: ["duckdb"]` for native module compatibility.
- `package.json` uses `postinstall` to run `patch-package` and symlink `duckdb.node` into `node_modules/duckdb/lib/binding/3/`.
- `tsconfig.json` defines the `@/* -> ./src/*` path alias.
- `components.json` configures shadcn/ui (`new-york`, `src/app/globals.css`, `lucide`, `@/components`, `@/lib`, `@/hooks`).

## Platform Requirements

**Development:**
- Node.js 20+ and pnpm
- Native build support for `duckdb`
- Browser WebGL support for `three`/React Three Fiber views
- Web Worker support for `src/workers/adaptiveTime.worker.ts` and `src/workers/stkdeHotspot.worker.ts`

**Production:**
- Next.js-compatible Node hosting; DuckDB routes are not edge-safe
- Writable local filesystem for `data/cache/crime.duckdb`, `data/sources/*.csv`, and `logs/study-sessions.jsonl`
- Stable access to large local crime datasets under `data/`

---

*Stack analysis: 2026-04-08*
