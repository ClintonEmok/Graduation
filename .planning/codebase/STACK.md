# Technology Stack

**Analysis Date:** 2026-06-01

## Languages

**Primary:**
- TypeScript 5.9.3 — All application code (React components, hooks, stores, API routes, Web Workers, test files)
  - Strict mode enabled in `tsconfig.json`: `"strict": true`
  - Module resolution: `"bundler"` with path alias `@/*` → `./src/*`

**Secondary:**
- JavaScript/ES2017 — Configuration files (`eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.mts`)
- CSS — Tailwind CSS v4 with CSS variables in `src/app/globals.css`

## Runtime

**Environment:**
- Node.js 20+ (development and production)
- Next.js 16.1.6 application server (Node.js runtime)

**Package Manager:**
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` (present, committed)
- Workspace config: `pnpm-workspace.yaml` (only `duckdb` as built dependency)
- Postinstall: `patch-package` + symlink for `duckdb` native binding compatibility

## Frameworks

**Core:**
- **Next.js 16.1.6** — Full-stack React framework; App Router with file-based routing at `src/app/`
  - All API routes use `export const runtime = 'nodejs'` for DuckDB compatibility
  - All API routes use `export const dynamic = 'force-dynamic'` to prevent static optimization
- **React 19.2.3** — UI library
- **React DOM 19.2.3** — DOM rendering

**State Management:**
- **Zustand 5.0.10** — Global state management across all views
  - Single-store pattern with slice helpers in `src/store/`
  - ~35 stores across 55 files including coordinated stores, feature flags, layout, theme, and test files
  - `persist` middleware used in `useStudyStore.ts` and `useDashboardDemoTimeslicingModeStore.ts`
  - No external middleware (no devtools, no immer, no redux)
- **TanStack Query 5.90.21** — Server state management for API data fetching
  - Configured in `src/providers/QueryProvider.tsx` with 5min staleTime, 10min gcTime, no refetch on focus
  - Used in `src/hooks/useCrimeData.ts`, `src/hooks/useViewportCrimeData.ts`, and other data hooks

**3D Visualization:**
- **Three.js 0.182.0** — 3D rendering engine
- **React Three Fiber 9.5.0** — React renderer for Three.js
- **React Three Drei 10.7.7** — Helper components for R3F
- **@types/three 0.182.0** — Type definitions

**2D/Map Visualization:**
- **MapLibre GL 5.17.0** — Map rendering engine
- **React Map GL 8.1.0** — React wrapper for MapLibre GL
- **@visx/* 3.12.0** — D3-based SVG visualization primitives (axis, brush, curve, event, gradient, group, responsive, scale, shape)
- **deck.gl 9.3.2** — WebGL-powered layers (`@deck.gl/aggregation-layers`, `@deck.gl/mapbox`)
- **@math.gl/web-mercator 4.1.0** — Web Mercator projection math
- **@types/geojson 7946.0.16** — GeoJSON type definitions

**Data & Analytics:**
- **DuckDB 1.4.4** — In-process OLAP database for crime data queries
  - Configured as `serverExternalPackages: ['duckdb']` in `next.config.ts`
  - Source data: ~8.5M rows from CSV at `data/sources/Crimes_-_2001_to_Present_20260114.csv`
  - Cached database at `data/cache/crime.duckdb`
  - Also queries Parquet at `data/crime.parquet`
  - Custom `patch-package` patch at `patches/duckdb+1.4.4.patch`
- **Apache Arrow 21.1.0** — Columnar data format for streaming crime data
  - Used in `/api/crime/stream` endpoint for IPC streaming
- **@loaders.gl/arrow 4.3.4** — Arrow data loading utilities
- **@loaders.gl/core 4.3.4** — Data loading framework
- **d3-array 3.2.4, d3-scale 4.0.2, d3-time 3.1.0, d3-brush 3.0.0, d3-selection 3.0.0, d3-zoom 3.0.0** — Data manipulation and scale utilities
- **density-clustering 1.3.0** — Clustering algorithms for hotspot detection
- **date-fns 4.1.0** — Date formatting/manipulation

**UI Components:**
- **Radix UI 1.4.3** — Unstyled accessible primitives (dialog, popover, select, slider, switch, tabs, tooltip, alert-dialog, scroll-area)
- **shadcn/ui** — Component library built on Radix; configured in `components.json` with "new-york" style
  - Aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`
  - Icon library: Lucide React
  - CSS variables: enabled, base color: neutral
- **Tailwind CSS 4** — Utility-first CSS framework via `@tailwindcss/postcss`
  - Configured in `postcss.config.mjs` with `@tailwindcss/postcss` plugin
  - CSS at `src/app/globals.css` with `@import "tailwindcss"` and `@import "tw-animate-css"`
- **Lucide React 0.563.0** — Icon library
- **Sonner 2.0.7** — Toast notification component
- **Class Variance Authority 0.7.1** — Component variant management
- **clsx 2.1.1** — Conditional classNames utility
- **tailwind-merge 3.4.0** — Tailwind class merging utility
- **tw-animate-css 1.4.0** — Animation CSS for Tailwind
- **React Day Picker 9.13.0** — Date picker component
- **React Resizable Panels 4.5.6** — Resizable panel layout

**Animation:**
- **GSAP 3.15.0** — GreenSock Animation Platform (in `package.json` dependencies)
- **driver.js 1.4.0** — Interactive tour/guide library for onboarding

**Utilities:**
- **lodash.debounce 4.0.8** — Debounce utility
- **APACHE-2.0** license (not explicitly stated, inferred from private use)

**Testing:**
- **Vitest 4.0.18** — Unit test runner
  - Config: `vitest.config.mts` with `@` path alias, `node` environment
  - Pattern: `src/**/*.test.ts` and `src/**/*.test.tsx`
  - Run: `pnpm test` (maps to `vitest`)
- **jsdom 28.0.0** — DOM environment for component tests
- **React Test Renderer 19.1.0** — Component test rendering
- **@types/react-test-renderer 19.1.0** — Type definitions

**Build/Dev:**
- **TypeScript 5.9.3** — Type checking via `tsc --noEmit`
- **ESLint 9** — Linting with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
  - Config: `eslint.config.mjs`
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`, `datapreprocessing/.venv/`
- **patch-package 8.0.1** — Patches `node_modules` for DuckDB native binding
- **Next.js 16.1.6** built-in build system (Turbopack explicitly disabled via `NEXT_DISABLE_TURBOPACK=1`)

## Key Dependencies

**Critical:**
| Package | Version | Purpose | Why It Matters |
|---------|---------|---------|----------------|
| `next` | 16.1.6 | Core framework, routing, API routes | All pages and endpoints depend on it |
| `duckdb` | 1.4.4 | Local OLAP analytics database | Processes 8.5M+ crime records; server-side only |
| `zustand` | 5.0.10 | Global state management | Coordinates state across 3D, map, and timeline views |
| `@tanstack/react-query` | 5.90.21 | Server state/data fetching | All crime data flows through it |
| `react`/`react-dom` | 19.2.3 | UI rendering | Foundation of all frontend |
| `three`/`@react-three/fiber` | 0.182.0/9.5.0 | 3D space-time cube rendering | Core visualization component |

**Infrastructure:**
| Package | Version | Purpose |
|---------|---------|---------|
| `apache-arrow` | 21.1.0 | Columnar data streaming from API |
| `maplibre-gl` | 5.17.0 | 2D map rendering |
| `react-map-gl` | 8.1.0 | React wrapper for MapLibre |
| `@radix-ui/*` | 1.x | Accessible UI primitives |
| `lucide-react` | 0.563.0 | Icon set |
| `gsap` | 3.15.0 | Motion/animation |
| `density-clustering` | 1.3.0 | Hotspot detection |

## Configuration

**Environment:**
| File | Key Variables | Purpose |
|------|--------------|---------|
| `.env` | `USE_MOCK_DATA=false` | Controls DuckDB vs mock data mode |
| - | `DUCKDB_PATH` (optional) | Custom DuckDB database file path |
| - | `DISABLE_DUCKDB` (optional) | Force mock data mode |
| - | `STKDE_QA_FULL_POP_ENABLED=true` (default) | Toggle full-population STKDE computation |

**Build:**
| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config; marks `duckdb` as server external package |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias |
| `postcss.config.mjs` | PostCSS with `@tailwindcss/postcss` |
| `vitest.config.mts` | Vitest with `@` alias, node environment |
| `eslint.config.mjs` | ESLint with Next.js + TypeScript rules |
| `components.json` | shadcn/ui configuration |
| `pnpm-workspace.yaml` | pnpm workspace settings |

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- 8GB+ RAM recommended for DuckDB operations
- macOS/Linux (DuckDB native binding)

**Production:**
- Node.js server (Next.js standalone mode or Node server)
- 8GB+ RAM for optimal DuckDB performance
- ~500MB disk space for crime dataset + DuckDB cache
- No external database required (DuckDB processes local files)

---

*Stack analysis: 2026-06-01*
