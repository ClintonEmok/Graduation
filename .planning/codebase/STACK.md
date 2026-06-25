# Technology Stack

**Analysis Date:** 2026-06-25

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (React components, hooks, stores, API routes, workers, utilities)
- CSS (Tailwind v4) - Styling via `src/app/globals.css`

**Secondary:**
- JavaScript (ESNext) - Configuration files (`eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.mts`, `next.config.ts`)
- Python 3.x - Data preprocessing scripts in `datapreprocessing/` and `scripts/` (STKDE computation, burst analysis, figure generation)

## Runtime

**Environment:**
- Node.js 20+ (development runtime, as specified in `.nvmrc` not found but `@types/node` ^20.19.43 aligns)
- Next.js 16.2.9 (application server via `next dev` / `next start`)

**Package Manager:**
- pnpm (lockfile: `pnpm-lock.yaml` present, workspace: `pnpm-workspace.yaml`)
- `pnpm-workspace.yaml` configures `onlyBuiltDependencies: ['duckdb']`

## Frameworks

**Core:**
- Next.js 16.2.9 - Full-stack React framework with App Router
- React 19.2.7 - UI component library
- React DOM 19.2.7 - DOM rendering

**State Management:**
- Zustand 5.0.14 - Global state management across 57+ stores in `src/store/`
- TanStack Query (React Query) 5.101.0 - Server state/data fetching via `src/providers/QueryProvider.tsx`

**3D Visualization:**
- Three.js 0.182.0 - 3D rendering engine
- @react-three/fiber 9.6.1 - React renderer for Three.js (R3F)
- @react-three/drei 10.7.7 - R3F helper components

**2D/Maps/Data Visualization:**
- MapLibre GL JS 5.24.0 - Map rendering (via react-map-gl 8.1.1)
- react-map-gl 8.1.1 - React wrapper for MapLibre GL
- @visx packages 3.12.0 - SVG visualization primitives (axis, brush, scale, shape, gradient, group, event, curve, responsive)
- deck.gl 9.3.4 - WebGL-powered data layers (via @deck.gl/aggregation-layers, @deck.gl/mapbox)
- D3 libraries (d3-array 3.x, d3-scale 4.x, d3-time 3.x, d3-brush 3.x, d3-selection 3.x, d3-zoom 3.x)

**Component Library:**
- Radix UI (radix-ui ^1.6.0 + individual @radix-ui packages) - Unstyled, accessible primitives
- shadcn/ui - Component library built on Radix (via `components.json`)
- Tailwind CSS 4.3.1 - Utility-first CSS framework (via @tailwindcss/postcss)
- tw-animate-css 1.4.0 - Animation utilities
- Lucide React 0.563.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- React Resizable Panels 4.11.2 - Resizable panel layout

**Testing:**
- Vitest 4.1.9 - Test runner
- jsdom 28.1.0 - DOM environment for tests
- React Test Renderer 19.2.7 - Component rendering in tests

**Build/Dev:**
- TypeScript 5.9.3 - Type checking (`"strict": true`)
- ESLint 9.39.4 - Linting (`eslint.config.mjs`)
- eslint-config-next 16.2.9 - Next.js + TypeScript ESLint configs
- patch-package 8.0.1 - Patching node_modules (DuckDB binary path in `patches/duckdb+1.4.4.patch`)
- PostCSS with @tailwindcss/postcss 4.3.1

## Key Dependencies

**Critical:**
- `next` 16.2.9 - Core framework; handles routing, API routes, server components
- `react`/`react-dom` 19.2.7 - UI rendering
- `zustand` 5.0.14 - Global state across visualization stores
- `duckdb` 1.4.4 - Local OLAP database for processing ~8.5M crime records; server-external package in `next.config.ts`
- `apache-arrow` 21.1.0 - Columnar data format for streaming crime data from DuckDB to client
- `@tanstack/react-query` 5.101.0 - Server state/data fetching
- `three` 0.182.0 - 3D scene rendering
- `maplibre-gl` 5.24.0 - Map rendering
- `react-map-gl` 8.1.1 - Map component for React
- `deck.gl` 9.3.4 - WebGL overlay on MapLibre

**Infrastructure:**
- `@loaders.gl/arrow` / `@loaders.gl/core` 4.4.3 - Arrow data loading on client
- `@math.gl/web-mercator` 4.1.0 - Mercator projection math
- `density-clustering` 1.3.0 - DBSCAN for hotspot detection
- `date-fns` 4.4.0 - Date formatting/manipulation
- `react-day-picker` 9.14.0 - Date picker
- `class-variance-authority` 0.7.1 - Component variants (shadcn/ui pattern)
- `driver.js` 1.4.0 - Interactive tour/onboarding
- `lodash.debounce` 4.0.8 - Debounce utility
- `clsx` 2.1.1 - Conditional classNames
- `tailwind-merge` 3.6.0 - Tailwind class merging

## Configuration

**Environment:**
- `.env` with `USE_MOCK_DATA=false` (DuckDB enabled by default)
- Optional: `DUCKDB_PATH` env var for custom database location
- Optional: `DUCKDB_THREADS` env var (defaults to 2)
- Optional: `DISABLE_DUCKDB` env var to force mock data
- Optional: `STKDE_QA_FULL_POP_ENABLED` env var for STKDE full-population mode

**Build:**
- `next.config.ts` - Next.js configuration with `serverExternalPackages: ['duckdb']`
- `tsconfig.json` - TypeScript strict mode, `@/*` path alias mapping to `./src/*`
- `postcss.config.mjs` - PostCSS with `@tailwindcss/postcss`
- `vitest.config.mts` - Vitest config with `@/*` alias
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals + typescript rules

**Component Configuration:**
- `components.json` - shadcn/ui configuration (new-york style, RSC enabled, lucide icons)

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- macOS, Linux, or Windows (DuckDB native bindings)
- 8GB+ RAM recommended for DuckDB operations
- ~500MB disk space for crime dataset + DuckDB cache

**Production:**
- Node.js server (Next.js standalone deployment)
- 8GB+ RAM for optimal DuckDB performance
- Large CSV crime data file at `data/sources/Crimes_-_2001_to_Present_20260114.csv`

---

*Stack analysis: 2026-06-25*
