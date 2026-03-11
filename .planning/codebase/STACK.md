# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**
- TypeScript (strict mode) - frontend, hooks, stores, API routes, and tests in `src/**/*.ts` and `src/**/*.tsx`

**Secondary:**
- JavaScript (Node scripts) - data/bootstrap scripts in `scripts/setup-data.js`, `scripts/capture-refactor-baseline.mjs`, and `scripts/test-*.ts`
- Python (data preprocessing) - offline ETL notebook/script workflow in `datapreprocessing/pipeline.py` and `datapreprocessing/*.ipynb`

## Runtime

**Environment:**
- Node.js runtime (required for DuckDB-backed routes) in `src/app/api/**/route.ts` with `export const runtime = 'nodejs'`

**Package Manager:**
- pnpm lockfile present (`pnpm-lock.yaml`), workspace metadata present (`pnpm-workspace.yaml`)
- npm-compatible scripts declared in `package.json`
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- Next.js 16 (`next`) - App Router web application in `src/app/*`
- React 19 (`react`, `react-dom`) - client UI and hooks across `src/components/*` and `src/hooks/*`
- Zustand 5 (`zustand`) - client state layers in `src/store/*` and `src/lib/stores/viewportStore.ts`

**Testing:**
- Vitest 4 (`vitest`) - unit/integration tests in `src/**/*.test.ts` and `src/**/*.test.tsx`
- react-test-renderer - hook/component harness tests in `src/hooks/useCrimeData.test.ts`

**Build/Dev:**
- Next build/dev server via `package.json` scripts (`dev`, `build`, `start`)
- ESLint 9 + `eslint-config-next` in `eslint.config.mjs`
- Tailwind CSS v4 via PostCSS in `postcss.config.mjs` and `src/app/globals.css`
- patch-package for third-party patching in `patches/duckdb+1.4.4.patch`

## Key Dependencies

**Critical:**
- `duckdb` - local analytical query engine used by API routes and query layer in `src/lib/db.ts`, `src/lib/queries.ts`, and `src/app/api/crime/*/route.ts`
- `apache-arrow` - Arrow stream serialization/deserialization in `src/app/api/crime/stream/route.ts` and `src/store/useTimelineDataStore.ts`
- `@tanstack/react-query` - client query caching in `src/providers/QueryProvider.tsx` and `src/hooks/useCrimeData.ts`

**Infrastructure:**
- `react-map-gl` + `maplibre-gl` - map rendering in `src/components/map/MapBase.tsx` and map layer components under `src/components/map/*`
- `@react-three/fiber` + `@react-three/drei` + `three` - 3D scene and controls in `src/components/viz/*`
- D3 packages (`d3-array`, `d3-scale`, `d3-time`, `d3-brush`, `d3-zoom`) - timeline interactions in `src/components/timeline/*`

## Configuration

**Environment:**
- Runtime toggles and DB path are read from `process.env.USE_MOCK_DATA`, `process.env.DISABLE_DUCKDB`, and `process.env.DUCKDB_PATH` in `src/lib/db.ts`
- `process.env.NODE_ENV` gates dev-only behavior in `src/app/timeslicing/page.tsx` and `src/app/timeslicing/components/SuggestionToolbar.tsx`
- Required local data paths are hardcoded in `src/lib/db.ts` (`data/sources/*.csv` and `data/cache/crime.duckdb`)

**Build:**
- Next config in `next.config.ts` (`serverExternalPackages: ["duckdb"]`)
- TypeScript path alias (`@/*`) in `tsconfig.json`
- ESLint ruleset and ignore policy in `eslint.config.mjs`
- Vitest config and alias mirroring in `vitest.config.mts`
- Tailwind/PostCSS config in `src/app/globals.css` and `postcss.config.mjs`

## Platform Requirements

**Development:**
- Node.js environment that can load native DuckDB binaries (plus postinstall symlink workaround in `package.json`)
- Writable local filesystem for `data/cache/` and `logs/` paths used by `src/lib/db.ts` and `src/app/api/study/log/route.ts`
- Local datasets expected in `data/sources/` for full-data mode (`src/lib/db.ts`)

**Production:**
- Node-based Next.js deployment target (Edge runtime is not suitable for DuckDB-dependent routes)
- Deployment must include local data artifacts or run with mock-data mode via env toggles in `src/lib/db.ts`

---

*Stack analysis: 2026-03-11*
