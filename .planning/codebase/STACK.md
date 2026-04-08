# Technology Stack

**Analysis Date:** 2026-04-08

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (React components, hooks, stores, API routes)

**Secondary:**
- JavaScript/ES2017 - Configuration files, build tooling

## Runtime

**Environment:**
- Node.js 20+ (development)
- Next.js 16.1.6 (React framework runtime)

**Package Manager:**
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3

**State Management:**
- Zustand 5.0.10 - Lightweight state management with slices pattern
- TanStack Query (React Query) 5.90.21 - Server state management, data fetching/caching

**3D/Visualization:**
- Three.js 0.182.0 - 3D rendering
- React Three Fiber 9.5.0 - React renderer for Three.js
- React Three Drei 10.7.7 - Helper components for R3F
- @visx packages 3.12.0 - SVG-based visualization primitives (axis, brush, scale, shape, gradient, group, event, curve)
- MapLibre GL 5.17.0 - Map rendering
- React Map GL 8.1.0 - React wrapper for MapLibre

**UI Components:**
- Radix UI 1.4.3 - Unstyled, accessible primitives (dialog, popover, select, slider, switch, tabs, tooltip, alert-dialog, scroll-area)
- shadcn/ui - Component library built on Radix (via components.json)
- Tailwind CSS 4 - Utility-first CSS framework
- Tailwind CSS PostCSS 4 - CSS processing
- Lucide React 0.563.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- date-fns 4.1.0 - Date formatting/manipulation
- React Day Picker 9.13.0 - Date picker component
- React Resizable Panels 4.5.6 - Resizable panel layout
- Class Variance Authority 0.7.1 - Component variant management

**Data Processing:**
- DuckDB 1.4.4 - In-process OLAP database for crime data queries
- Apache Arrow 21.1.0 - Columnar data format
- @loaders.gl/arrow 4.3.4 - Arrow data loading
- @loaders.gl/core 4.3.4 - Generic data loading framework

**Geo/Math:**
- @math.gl/web-mercator 4.1.0 - Web Mercator projection utilities
- @types/geojson 7946.0.16 - GeoJSON type definitions
- D3 libraries 3.x/4.x - Data manipulation (d3-array, d3-scale, d3-time, d3-brush, d3-selection, d3-zoom)
- density-clustering 1.3.0 - Clustering algorithms for hotspot detection

**Utilities:**
- lodash.debounce 4.0.8 - Debounce utility
- clsx 2.1.1 - Conditional classNames
- tailwind-merge 3.4.0 - Tailwind class merging
- driver.js 1.4.0 - Interactive tour/guide library

**Testing:**
- Vitest 4.0.18 - Unit testing framework
- React Test Renderer 19.1.0 - Component testing
- jsdom 28.0.0 - DOM environment for tests

**Build/Dev:**
- ESLint 9 - Linting
- eslint-config-next 16.1.6 - Next.js ESLint configuration
- TypeScript - Static type checking
- patch-package 8.0.1 - Patching node_modules

## Key Dependencies

**Critical:**
- `duckdb` 1.4.4 - Local OLAP database for processing 8.5M+ crime records; serverExternalPackages configured in next.config.ts
- `next` 16.1.6 - Core framework; handles routing, API routes, SSR/SSG
- `react`/`react-dom` 19.2.3 - UI rendering
- `zustand` 5.0.10 - Global state management across views

**Infrastructure:**
- DuckDB for local data processing (no external database)
- Local CSV files for crime data (no cloud storage)

## Configuration

**Environment:**
- `.env` file with `USE_MOCK_DATA=false` (DuckDB enabled by default)
- Optional: `DUCKDB_PATH` env var for custom database location
- Optional: `DISABLE_DUCKDB` env var to force mock data

**Build:**
- `next.config.ts` - Next.js configuration (serverExternalPackages for duckdb)
- `tsconfig.json` - TypeScript with `@/*` path alias
- `postcss.config.mjs` - PostCSS with Tailwind
- `vitest.config.mts` - Vitest configuration
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript rules

**Path Aliases:**
- `@/*` maps to `./src/*`

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- 8GB+ RAM recommended for DuckDB operations

**Production:**
- Node.js server (Next.js standalone or Node server)
- ~500MB disk space for crime dataset + DuckDB cache
- 8GB+ RAM for optimal DuckDB performance

---

*Stack analysis: 2026-04-08*
