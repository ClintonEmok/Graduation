# Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_MOCK_DATA` | `false` | When `true`, bypasses DuckDB and uses mock crime data |
| `DISABLE_DUCKDB` | (unset) | When set (any value), forces mock data regardless of `USE_MOCK_DATA` |
| `DUCKDB_PATH` | `data/cache/crime.duckdb` | Custom path to DuckDB database file |

All env vars are loaded from `.env` at the project root.

## Next.js Configuration

**File:** `next.config.ts`

Configures `serverExternalPackages: ["duckdb"]` to ensure the DuckDB native addon runs correctly on the server.

## TypeScript Configuration

**File:** `tsconfig.json`

- Strict mode enabled (`"strict": true`)
- Path alias: `@/*` maps to `./src/*`
- Target: ES2017
- Module resolution: `bundler`

## Tailwind CSS

**File:** `postcss.config.mjs`

Uses `@tailwindcss/postcss` (Tailwind CSS v4). No custom `tailwind.config.*` file — v4 uses CSS-based configuration.

Additional animation support via `tw-animate-css` in devDependencies.

## Vitest

**File:** `vitest.config.mts`

- **Environment:** `node`
- **Include patterns:** `src/**/*.test.ts`, `src/**/*.test.tsx`
- **Path alias:** `@/` maps to `./src/`
- No global setup files or coverage configuration currently configured

## ESLint

**File:** `eslint.config.mjs`

Uses `eslint-config-next` with core-web-vitals and TypeScript rules. Flat config format (ESLint 9).

## shadcn/ui

**File:** `components.json`

Standard shadcn/ui configuration with New York style, `neutral` base color, and Lucide icon library.

## DuckDB

The DuckDB native addon is installed via pnpm and requires a postinstall symlink:
```
patch-package && mkdir -p node_modules/duckdb/lib/binding/3 && ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node
```

Crime data is loaded from local CSV files. The database is built at runtime on first access.

## Patch Package

**File:** `patches/`

Uses `patch-package` to apply patches to `node_modules` dependencies. Run `pnpm run postinstall` after `pnpm install`.
