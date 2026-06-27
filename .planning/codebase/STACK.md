# Technology Stack

**Analysis Date:** 2026-06-27

## Languages

**Primary:**
- TypeScript 5.9.3 — All application code (`src/**/*.ts`, `src/**/*.tsx`), strict mode, ES2017 target, JSX via `react-jsx`

**Secondary:**
- JavaScript (ES2017) — Config files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.mts`), build tooling, `scripts/setup-data.js` (Node-side data setup), patches
- Python 3.x — Offline batch data pipeline in `datapreprocessing/pipeline.py` (Chicago CSV → cleaned CSV), Goh-Barabási bursty CSV generator in `scripts/synthetic/generate_bursty.py`, STKDE experiment scripts in `scripts/*.py`, Jupyter notebooks in `datapreprocessing/*.ipynb`
- CSS — Tailwind CSS 4 via `@tailwindcss/postcss` (`postcss.config.mjs`), `tw-animate-css` for animations, `src/app/globals.css`

## Runtime

**Environment:**
- Node.js 20+ (development)
- Next.js 16.2.9 (React framework runtime, App Router)
- pnpm 9.x (package manager)
- React 19.2.7 (UI library)
- React DOM 19.2.7

**Package Manager:**
- pnpm 9.x
- Lockfile: `pnpm-lock.yaml` (present, ~437KB)
- `pnpm-workspace.yaml` configures `onlyBuiltDependencies: [duckdb]`
- `postinstall` script runs `patch-package` and creates a symlink for the DuckDB native binding at `node_modules/duckdb/lib/binding/3/duckdb.node`

**Python:**
- Standalone venv (`.venv` referenced in `datapreprocessing/.venv/`)
- Dependencies declared in `datapreprocessing/requirements-stkde.txt`:
  - `numpy>=2.0`, `pandas>=2.0`, `matplotlib>=3.8`, `seaborn>=0.13`, `scipy>=1.11`, `jupyter>=1.0`, `ipykernel>=6.0`
- `.ruff_cache/` is present (Ruff linter cache; no committed Ruff config)

## Frameworks

**Core:**
- Next.js 16.2.9 — Full-stack React framework with App Router
- React 19.2.7 — UI library
- React DOM 19.2.7

**State Management:**
- Zustand 5.0.14 — Lightweight global state with slice-domain pattern (`src/store/slice-domain/`)
- TanStack React Query 5.101.0 — Server state, data fetching, caching

**3D Rendering:**
- three 0.182.0 — WebGL engine
- @react-three/fiber 9.6.1 — React renderer for Three.js
- @react-three/drei 10.7.7 — Helper components for R3F
- deck.gl 9.3.4 — GPU-accelerated visualization layers
- @deck.gl/aggregation-layers 9.3.4 — Heatmap / Hexagon / Grid aggregation
- @deck.gl/mapbox 9.3.4 — Interop with MapLibre

**2D Visualization (visx):**
- @visx/axis 3.12.0, @visx/brush 3.12.0, @visx/curve 3.12.0, @visx/event 3.12.0, @visx/gradient 3.12.0, @visx/group 3.12.0, @visx/responsive 3.12.0, @visx/scale 3.12.0, @visx/shape 3.12.0 — SVG primitives

**Mapping:**
- maplibre-gl 5.24.0 — Map renderer
- react-map-gl 8.1.1 — React wrapper for MapLibre
- leaflet 1.9.4 — Alternate map renderer (legacy/sandbox views)
- react-leaflet 5.0.0 — React wrapper for Leaflet
- leaflet-draw 1.0.4, leaflet.fullscreen 5.3.1, leaflet.markercluster 1.5.3, react-leaflet-markercluster 5.0.0-rc.0 — Leaflet plugins
- @math.gl/web-mercator 4.1.0 — Web Mercator projection utilities

**UI Components:**
- @radix-ui/react-alert-dialog 1.1.17
- @radix-ui/react-dialog 1.1.17
- @radix-ui/react-popover 1.1.17
- @radix-ui/react-scroll-area 1.2.12
- @radix-ui/react-select 2.3.1
- @radix-ui/react-slider 1.4.1
- @radix-ui/react-switch 1.3.1
- @radix-ui/react-tabs 1.1.15
- @radix-ui/react-tooltip 1.2.10
- radix-ui 1.6.0 — Meta package
- shadcn/ui — Installed via `components.json` (`new-york` style, `lucide` icons, `@shadcn-map` registry). Components live in `src/components/ui/`
- cmdk 1.1.1 — Command palette
- lucide-react 0.563.0 — Icon library
- sonner 2.0.7 — Toast notifications
- react-day-picker 9.14.0 — Date picker
- next-themes 0.4.6 — Theme management
- react-resizable-panels 4.11.2 — Resizable panel layout
- class-variance-authority 0.7.1 — Component variant management
- clsx 2.1.1 — Conditional classNames
- tailwind-merge 3.6.0 — Tailwind class merging
- tw-animate-css 1.4.0 — Tailwind animation plugin

**Data Layer:**
- duckdb 1.4.4 — In-process OLAP database (configured via `serverExternalPackages` in `next.config.ts`)
- apache-arrow 21.1.0 — Columnar data format (IPC streaming)
- @loaders.gl/core 4.4.3, @loaders.gl/arrow 4.4.3 — Arrow data loading
- @types/geojson 7946.0.16 — GeoJSON types

**D3 utilities (for visx and timeline math):**
- d3-array 3.2.4
- d3-brush 3.0.0
- d3-scale 4.0.2
- d3-selection 3.0.0
- d3-time 3.1.0
- d3-zoom 3.0.0

**Other utilities:**
- date-fns 4.4.0 — Date formatting/manipulation
- density-clustering 1.3.0 — Hotspot clustering (DBSCAN)
- lodash.debounce 4.0.8 — Debounce
- driver.js 1.4.0 — Onboarding tour
- @tanstack/react-query 5.101.0 — Server state

**Testing:**
- vitest 4.1.9 — Unit test runner
- @vitest config — `vitest.config.mts` (Node environment, includes `src/**/*.test.ts` and `src/**/*.test.tsx`)
- react-test-renderer 19.2.7 + @types/react-test-renderer 19.1.0 — Component testing
- jsdom 28.1.0 — DOM environment (declared as dependency; current vitest config uses `environment: 'node'`)

**Linting & Type Checking:**
- eslint 9.39.4 — Linter
- eslint-config-next 16.2.9 — Next.js preset (core-web-vitals + typescript)
- typescript 5.9.3 — Static type checking (strict mode)

**Build/Patch Tooling:**
- patch-package 8.0.1 — Applies `patches/duckdb+1.4.4.patch` after install (fixes DuckDB native binding path for napi v3)
- @tailwindcss/postcss 4.3.1 — Tailwind PostCSS plugin

## Key Dependencies

**Critical:**
- `next` 16.2.9 — Core framework
- `react`/`react-dom` 19.2.7 — UI rendering
- `duckdb` 1.4.4 — Local OLAP for 8.5M+ crime records; patched in `patches/duckdb+1.4.4.patch`; configured as `serverExternalPackages` in `next.config.ts` so it isn't bundled
- `apache-arrow` 21.1.0 — IPC streaming for `/api/crime/stream` (`application/vnd.apache.arrow.stream`)
- `zustand` 5.0.14 — Cross-component state coordination
- `three` 0.182.0 + `@react-three/fiber` 9.6.1 — 3D space-time cube rendering
- `maplibre-gl` 5.24.0 + `react-map-gl` 8.1.1 — 2D map

**Infrastructure:**
- `tanstack/react-query` 5.101.0 — Server state cache
- `radix-ui` 1.6.0 + `cmdk` 1.1.1 + `sonner` 2.0.7 — UI primitives
- `tailwindcss` 4.3.1 (dev) — Styling
- `patch-package` 8.0.1 (dev) — Native binding patch

**Synthetic Data Generator (Lehmer LCG PRNG):**
- `src/lib/synthetic/prng.ts` — `createSeededRandom(seed)` implements the Park-Miller LCG: `state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000`
- `src/lib/synthetic/goh-barabasi.ts` — Hybrid Goh-Barabási bursty generator (priority queue for type + power-law IET for timestamps), produces `CrimeRecord[]` and `BurstinessMetrics`
- `src/lib/synthetic/csv-export.ts` — RFC 4180 CSV serializer (events + burstiness ground truth)
- `src/lib/synthetic/types.ts` — `BurstyGeneratorConfig`, `BurstySequence`, `BurstinessMetrics`, `RollingBurstinessPoint`, `TypeBurstinessProfile`
- `scripts/synthetic/generate_bursty.py` — Python sibling, mirrors the same LCG, priorities, and power-law inverse transform. Output CSV column order matches `csv-export.ts` exactly so both runtimes feed the same downstream consumers

**Clustering:**
- `density-clustering` 1.3.0 — DBSCAN-style hotspot detection

## Configuration

**Environment:**
- `.env` — Sets `USE_MOCK_DATA=false` (DuckDB enabled by default)
- No `.env.local` or other env files committed (gitignored via `.env*.local`)
- Optional env vars (all read at runtime, no committed defaults):
  - `USE_MOCK_DATA` — `0|1|true|false|yes|no|on|off` (truthy forces mock data; falsy uses DuckDB). Falls back to `DISABLE_DUCKDB`. Read in `src/lib/db.ts:39`
  - `DISABLE_DUCKDB` — Same semantics as `USE_MOCK_DATA`; honored when `USE_MOCK_DATA` is unset
  - `DUCKDB_PATH` — Override for the DuckDB file location (absolute or cwd-relative). Default `data/cache/crime.duckdb`. Read in `src/lib/db.ts:89`
  - `DUCKDB_THREADS` — `SET threads=N` at DuckDB init. Default `2`. Read in `src/lib/db.ts:97`
  - `STKDE_QA_FULL_POP_ENABLED` — `0|1|true|false|...` enables the full-population STKDE compute path. Default `true`. Read in `src/app/api/stkde/hotspots/route.ts:11`
  - `NODE_ENV` — Standard Next.js env

**Build:**
- `next.config.ts` — Next.js config; `serverExternalPackages: ['duckdb']`, `turbopack.root: process.cwd()`
- `tsconfig.json` — TypeScript with `@/*` → `./src/*` path alias, strict mode, `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`
- `postcss.config.mjs` — PostCSS with `@tailwindcss/postcss`
- `vitest.config.mts` — Vitest with Node env, `src/**/*.test.{ts,tsx}` patterns, `@` alias
- `eslint.config.mjs` — ESLint flat config; `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`; ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`, `datapreprocessing/.venv/**`
- `components.json` — shadcn/ui config (`new-york` style, `neutral` base, `lucide` icon library, `@/components`/`@/lib`/`@/hooks` aliases, `@shadcn-map` registry)
- `pnpm-workspace.yaml` — `onlyBuiltDependencies: [duckdb]`
- `next-env.d.ts` — Next.js type reference (gitignored)

**Scripts (`package.json`):**
- `pnpm dev` — `next dev`
- `pnpm build` — `NEXT_DISABLE_TURBOPACK=1 next build` (Turbopack explicitly disabled for production build)
- `pnpm start` — `next start`
- `pnpm lint` — `eslint`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — `vitest`
- `postinstall` — `patch-package && mkdir -p node_modules/duckdb/lib/binding/3 && ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node`

**Data Setup:**
- `scripts/setup-data.js` — One-off Node script: generates `data/source.csv` (100K random points), uses DuckDB to convert to `data/crime.parquet` with pre-computed `x`/`z`/`y` normalized coordinates
- `datapreprocessing/pipeline.py` — Python chunked ETL: reads raw Chicago CSV (`Crimes_-_2001_to_Present_*.csv`), filters to last 5 years, normalizes district keys, maps IUCR, writes `data/source.csv`
- `datapreprocessing/run_jupyter.sh` — Launches Jupyter in the local venv

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9.x
- Python 3.x + `datapreprocessing/requirements-stkde.txt` (for offline analysis only — not required to run the Next.js app)
- 8GB+ RAM recommended for DuckDB operations
- Xcode CLI tools / build essentials required by DuckDB native binding

**Production:**
- Node.js server (Next.js standalone or `next start`)
- ~500MB disk for the crime dataset + DuckDB cache
- 8GB+ RAM for optimal DuckDB performance
- No external services required (no DB server, no auth provider, no SaaS dependencies)

**Browser Support:**
- Modern evergreen browsers (WebGL2 required for Three.js cube and deck.gl layers)
- Mobile not a target — desktop-first internal prototype

---

*Stack analysis: 2026-06-27*
