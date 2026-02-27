# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- TypeScript 5.9.x - App, API routes, stores, hooks, workers in `src/**/*.ts` and `src/**/*.tsx`

**Secondary:**
- JavaScript (Node/CommonJS) - Data setup scripts in `scripts/setup-data.js`
- SQL (DuckDB dialect) - Query strings in `src/lib/queries.ts`, `src/lib/db.ts`, `src/app/api/crime/*.ts`
- CSS (Tailwind v4 + CSS vars) - Global theme and utility layers in `src/app/globals.css`

## Runtime

**Environment:**
- Node.js runtime for Next.js app and server routes (explicit `runtime = 'nodejs'` in `src/app/api/crimes/range/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/adaptive/global/route.ts`)
- Browser runtime for React UI + Web Worker in `src/workers/adaptiveTime.worker.ts`

**Package Manager:**
- pnpm (lockfile present at `pnpm-lock.yaml`)
- Lockfile: present

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router web application (`src/app/**`)
- React 19.2.3 - Client rendering and interactive UI (`src/components/**`, `src/app/**`)
- Zustand 5.0.10 - Client state stores (`src/store/**`, `src/lib/stores/viewportStore.ts`)
- TanStack React Query 5.90.x - API query caching and revalidation (`src/providers/QueryProvider.tsx`, `src/hooks/useCrimeData.ts`)

**Visualization/UI:**
- D3 (array/brush/scale/time/selection/zoom) - Timeline interactions (`src/components/timeline/DualTimeline.tsx`)
- React Three Fiber + Drei + Three.js - 3D scene rendering (`src/components/viz/**`)
- Tailwind CSS v4 + shadcn/ui + Radix UI - Design system and primitives (`src/components/ui/**`, `components.json`, `src/app/globals.css`)

**Data/Storage:**
- DuckDB 1.4.4 - Local analytical DB for CSV-backed queries (`src/lib/db.ts`, `src/lib/queries.ts`)
- Apache Arrow 21.x + loaders.gl - Arrow stream handling (`src/app/api/crime/stream/route.ts`, `src/store/useDataStore.ts`)

**Testing:**
- Vitest 4.0.x + jsdom dependency - Unit tests in `src/**/*.test.ts` configured by `vitest.config.ts`

**Build/Dev:**
- ESLint 9 + `eslint-config-next` - Linting in `eslint.config.mjs`
- PostCSS + Tailwind plugin - CSS pipeline in `postcss.config.mjs`
- `patch-package` - Local dependency patching via `postinstall` in `package.json`

## Key Dependencies

**Critical:**
- `next`, `react`, `react-dom` - App platform (`package.json`)
- `zustand` - Shared cross-view state (`src/store/**`)
- `@tanstack/react-query` - `useCrimeData` query orchestration (`src/hooks/useCrimeData.ts`)
- `duckdb` - Server-side query backend (`src/lib/db.ts`, `src/lib/queries.ts`)

**Infrastructure:**
- `apache-arrow` - Streamed columnar transport (`src/app/api/crime/stream/route.ts`)
- `d3-*` packages - Brush/zoom and adaptive scales (`src/components/timeline/DualTimeline.tsx`)
- `@react-three/fiber` + `three` - 3D rendering in viz scene (`src/components/viz/MainScene.tsx`)

## Configuration

**Environment:**
- `USE_MOCK_DATA` / `DISABLE_DUCKDB` toggle mock mode in `src/lib/db.ts`
- `DUCKDB_PATH` overrides DB file location in `src/lib/db.ts`
- `next.config.ts` sets `serverExternalPackages: ["duckdb"]` for native module support

**Build:**
- TypeScript strict mode and `@/*` alias in `tsconfig.json`
- Next lint defaults + custom ignore for `datapreprocessing/.venv/**` in `eslint.config.mjs`
- Vitest include pattern `src/**/*.test.ts` in `vitest.config.ts`
- Tailwind v4 imports and CSS variable theme in `src/app/globals.css`

## Platform Requirements

**Development:**
- Node.js required (version not pinned in repo; inferred modern Node from Next 16 + `@types/node` 20)
- Native DuckDB binding compatibility required when mock mode is disabled (symlink setup in `package.json` `postinstall`)
- Local data paths expected by runtime code:
  - CSV path: `data/sources/Crimes_-_2001_to_Present_20260114.csv` from `src/lib/db.ts`
  - Parquet path: `data/crime.parquet` from `src/app/api/crime/facets/route.ts` and `scripts/setup-data.js`

**Production:**
- Next.js Node deployment (APIs are dynamic and Node runtime)
- No cloud infra integrations detected; current design assumes local filesystem-backed data

---

*Stack analysis: 2026-02-26*
