# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code (frontend, backend APIs, utilities)
- JavaScript - Test files and configuration

**Secondary:**
- Python - Data preprocessing scripts (in `datapreprocessing/` directory)

## Runtime

**Environment:**
- Node.js 20+ (as specified in `@types/node: ^20`)
- Browser runtime (React 19 client-side)

**Package Manager:**
- pnpm 9.x (pnpm-lock.yaml present)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3 - React rendering for DOM

**3D Visualization:**
- Three.js 0.182.0 - 3D graphics engine
- @react-three/fiber 9.5.0 - React renderer for Three.js
- @react-three/drei 10.7.7 - Useful helpers for react-three-fiber

**Mapping:**
- maplibre-gl 5.17.0 - Open-source map rendering (MapLibre GL JS)
- react-map-gl 8.1.0 - React wrapper for maplibre-gl
- @math.gl/web-mercator 4.1.0 - Web Mercator projection utilities
- @visx 3.x - D3-based chart/scales library for data visualization

**Data Processing:**
- DuckDB 1.4.4 - In-memory/embedded analytical SQL database
- Apache Arrow 21.1.0 - Columnar data format
- @loaders.gl/arrow 4.3.4 - Arrow loader for loaders.gl

**State Management:**
- Zustand 5.0.10 - Lightweight state management
- @tanstack/react-query 5.90.21 - Server state management/caching

**UI Components:**
- Radix UI 1.4.3 - Unstyled accessible component primitives
- Lucide React 0.563.0 - Icon library
- Tailwind CSS 4 - Utility-first CSS framework

## Key Dependencies

**Critical:**
- `next` 16.1.6 - Framework
- `react` 19.2.3 - UI library
- `three` 0.182.0 - 3D graphics
- `duckdb` 1.4.4 - Database (configured as external package in next.config.ts)

**Data Visualization:**
- `@visx/axis` 3.12.0 - Chart axes
- `@visx/brush` 3.12.0 - Brush selection
- `@visx/scale` 3.12.0 - D3 scales
- `@visx/shape` 3.12.0 - Chart shapes
- `d3-array`, `d3-brush`, `d3-scale`, `d3-selection`, `d3-time`, `d3-zoom` - D3 utilities

**Maps & Geospatial:**
- `maplibre-gl` 5.17.0 - Map rendering
- `react-map-gl` 8.1.0 - React map wrapper
- `@types/geojson` - GeoJSON type definitions

**Utilities:**
- `date-fns` 4.1.0 - Date manipulation
- `lodash.debounce` 4.0.8 - Debounce utility
- `clsx`, `tailwind-merge` - Class name utilities
- `class-variance-authority` - CVA for component variants
- `sonner` 2.0.7 - Toast notifications

## Configuration

**Environment:**
- `.env` file with `USE_MOCK_DATA=false` flag
- DuckDB path configurable via `DUCKDB_PATH` env var
- Mock data toggle via `USE_MOCK_DATA` or `DISABLE_DUCKDB` env vars

**Build:**
- `next.config.ts` - Next.js configuration (serverExternalPackages: ["duckdb"])
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS for Tailwind CSS
- `tailwind.config` - Tailwind CSS (v4 uses CSS-based config)
- `vitest.config.mts` - Vitest testing configuration
- `components.json` - shadcn/ui component registry config

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- 8GB+ RAM (for DuckDB operations on large datasets)

**Production:**
- Next.js compatible hosting (Vercel, Node.js server, Docker)
- File system access for DuckDB data cache
- ~2GB storage for crime data CSV (~8.5M rows)

---

*Stack analysis: 2026-03-30*
