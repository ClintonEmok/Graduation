# Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_MOCK_DATA` | `false` | When `true`, bypasses DuckDB and uses mock crime data |
| `DISABLE_DUCKDB` | (unset) | When set (any value), forces mock data regardless of `USE_MOCK_DATA` |
| `DUCKDB_PATH` | (unset) | Custom path to DuckDB database file |

<!-- VERIFY: DUCKDB_PATH usage — confirm from lib/db.ts -->
All env vars are loaded from `.env` at the project root.

## Next.js Configuration

**File:** `next.config.ts`

Configures `serverExternalPackages: ["duckdb"]` to ensure the DuckDB native addon runs correctly on the server. No other Next.js options are currently set.

## TypeScript Configuration

**File:** `tsconfig.json`

- Strict mode enabled (`"strict": true`)
- Path alias: `@/*` maps to `./src/*`
- Target: ES2017 (or later, check actual file)

## Tailwind CSS

**File:** `postcss.config.mjs`

Uses `@tailwindcss/postcss` (Tailwind CSS v4). No custom `tailwind.config.*` file — v4 uses CSS-based configuration.

## Vitest

**File:** `vitest.config.mts`

<!-- VERIFY: exact config details — check vitest.config.mts for environment, setup files, coverage settings -->

Configured with jsdom environment. Check the file for exact settings.

## ESLint

**File:** `eslint.config.mjs`

Uses `eslint-config-next` with core-web-vitals and TypeScript rules. Flat config format (ESLint 9).

## shadcn/ui

**File:** `components.json`

Standard shadcn/ui configuration for component resolution and styling.

## DuckDB

The DuckDB native addon is installed via pnpm and requires a postinstall symlink:
```
patch-package && mkdir -p node_modules/duckdb/lib/binding/3 && ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node
```

Crime data is loaded from local CSV files. The database is built at runtime on first access.

## Patch Package

**File:** `patches/`

Uses `patch-package` to apply patches to `node_modules` dependencies. Run `pnpm run postinstall` after `pnpm install`.
