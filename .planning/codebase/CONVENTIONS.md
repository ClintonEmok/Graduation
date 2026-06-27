# Coding Conventions

**Analysis Date:** 2026-06-27

## Language & Tooling

- **TypeScript 5.9.3** — Strict mode is on (`"strict": true` in `tsconfig.json`). Target `ES2017`, `module: esnext`, `moduleResolution: bundler`. JSX is `react-jsx`.
- **React 19.2.3** + **Next.js 16.1.6** (App Router). The shadcn config in `components.json` uses the `new-york` style with `tsx: true`, RSC enabled, and aliases for `components`/`ui`/`lib`/`hooks`.
- **Tailwind CSS v4** (PostCSS pipeline in `postcss.config.mjs`).
- **ESLint 9** via `eslint.config.mjs` — composes `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`; uses `globalIgnores` for `.next/**`, `out/**`, `build/**`, `next-env.d.ts`, and `datapreprocessing/.venv/**`.
- **Vitest 4.0.18** as the TypeScript test runner. Configured in `vitest.config.mts` with `environment: 'node'` and an `@` alias mirror of `tsconfig.json`.
- **Python 3** for the synthetic-data sibling (`scripts/synthetic/`). No `pyproject.toml`/`ruff`/`pytest` is checked in — the Python file is shipped as a self-contained stdlib script (the `.ruff_cache/` exists in the workspace, hinting that `ruff` has been run ad hoc, but no config file is committed).

### Tooling scripts

```bash
# package.json
pnpm dev          # next dev
pnpm build        # NEXT_DISABLE_TURBOPACK=1 next build
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest
```

```bash
# Python sibling
python scripts/synthetic/generate_bursty.py
python scripts/synthetic/test_generate_bursty.py
python -m unittest scripts.synthetic.test_generate_bursty
```

## TypeScript Path Aliases

Defined in `tsconfig.json` and mirrored in `vitest.config.mts`:

| Alias | Maps to |
|---|---|
| `@/*` | `./src/*` |

Additional shadcn aliases from `components.json`:

| Alias | Maps to |
|---|---|
| `@/components` | `src/components` |
| `@/components/ui` | `src/components/ui` |
| `@/lib` | `src/lib` |
| `@/lib/utils` | `src/lib/utils.ts` |
| `@/hooks` | `src/hooks` |

Use `@/` for **all** internal imports; do not reach up with `../../` chains. Example: `import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization'`.

## Naming Conventions

### Files

| Pattern | Example | Rule |
|---|---|---|
| React components | `DualTimeline.tsx`, `SuggestionPanel.tsx`, `CubeVisualization.tsx` | `PascalCase.tsx` |
| Hooks | `useCrimeData.ts`, `useSliceStore.ts`, `useLogger.ts` | `camelCase.ts` starting with `use` |
| Stores (Zustand) | `useCoordinationStore.ts`, `useAdaptiveStore.ts` | `usePascalCaseStore.ts` |
| Pure utilities | `slice-utils.ts`, `date-normalization.ts`, `category-legend.ts` | `kebab-case.ts` (sometimes `camelCase.ts` — see `adaptive-scale.ts` vs `category-legend.ts`) |
| Worker modules | `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts` | `camelCase.worker.ts` |
| Tests (unit) | `slice-utils.test.ts`, `goh-barabasi.test.ts` | `*.test.ts` co-located with source |
| Tests (component / shell) | `DualTimeline.tick-rollout.test.ts`, `page.shell.test.tsx` | `*.test.tsx` or topic-suffixed `*.test.tsx` |
| Python module | `generate_bursty.py`, `test_generate_bursty.py` | `snake_case.py` (test module named `test_*.py` for stdlib `unittest` discovery) |

### Variables, functions, and types

```typescript
// camelCase for variables and functions
const realTime = 1704067200;
const minTime = 978307200;
function normalizeToPercent(realTime: number, minTime: number, maxTime: number): number { ... }
const lonLatToNormalized = (lon: number, lat: number) => { ... };

// camelCase for hooks (must start with "use")
const useCrimeData = (options: UseCrimeDataOptions) => { ... };
const useAutoBurstSlices = () => { ... };

// PascalCase for React components
function DualTimeline(props: DualTimelineProps) { ... }
const SuggestionPanel = ({ items }: Props) => { ... };

// PascalCase for types and interfaces
export interface CrimeRecord { timestamp: number; lat: number; lon: number; ... }
export interface BurstyGeneratorConfig { alpha: number; delta: number; numEvents: number; ... }
type TimeSliceSource = 'manual' | 'generated-applied' | 'suggestion';

// UPPER_SNAKE_CASE for module-level constants
export const TIME_MIN = 0;
export const TIME_MAX = 100;
export const MOCK_START_MS = MOCK_START_DATE.getTime();
export const OVERVIEW_SUMMARY_BIN_COUNT = 120;
const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 750;
```

> **Be descriptive, not clever.** Names like `realTime`, `minTime`, `mapDomain`, `isLocked`, `activeSliceId` are preferred over abbreviations. Hex colors and ISO dates in tests use underscores for readability: `1_700_000_000`.

### Python naming (sibling)

```python
# snake_case for functions and variables
def compute_burstiness_metrics(iet): ...
def lon_lat_to_normalized(lon, lat): ...

# UPPER_SNAKE_CASE for module-level constants
CHICAGO_MIN_LON = -87.9
CHICAGO_MAX_LON = -87.5
CHICAGO_MIN_LAT = 41.6
CHICAGO_MAX_LAT = 42.1
NORMALIZED_MIN = -50.0
NORMALIZED_SPAN = 100.0
CHICAGO_LON_SPAN = CHICAGO_MAX_LON - CHICAGO_MIN_LON
CHICAGO_LAT_SPAN = CHICAGO_MAX_LAT - CHICAGO_MIN_LAT
DEFAULT_ROLLING_WINDOW_SEC = 7 * 24 * 60 * 60
IET_CAP_SEC = 30 * 24 * 60 * 60
DEFAULT_START_EPOCH = int(datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp())
DEFAULT_END_EPOCH = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())
ACTIVE_TYPES = ["THEFT", "BATTERY", ...]
ACTIVE_DISTRICTS = [str(i) for i in range(1, 26)]  # 1..25
EVENT_COLUMNS = ["timestamp", "type", "district", "iucr", "lat", "lon", "x", "z", "year"]
BURSTINESS_COLUMNS = ["startEpoch", "endEpoch", "burstinessParam", "eventCount", "typeBreakdown"]
```

The Python file deliberately mirrors the TS module names and outputs (column lists, default epochs, type list) so the same downstream consumers feed both runtimes.

## Code Style

- **2-space indentation** for TypeScript and Python.
- **Semicolons** at the end of every TypeScript statement; **no semicolons** in the Python file (PEP 8).
- **Single quotes** for TypeScript strings; **double quotes** for Python strings (PEP 8).
- **Trailing commas** in multi-line TS arrays/objects (`e.g. [1, 2, 3,]`) and in `argparse.add_argument()` blocks.
- **Arrow functions** for callbacks and one-liners; `function` declarations for top-level public exports.
- **Explicit return types** on public exported functions; `const` arrow functions for one-liners and aliases (e.g. `export const slicesOverlapWithinTolerance = rangesMatch;` in `src/lib/slice-utils.ts`).
- **Object shorthand** is used in the factory builders (see *Factory helper pattern* below).
- **Template literals** for SQL fragments: see `buildAdaptiveDomainQuery` in `src/lib/queries/aggregations.ts`.

### Formatting / linting

- ESLint (Next.js config) enforces Next.js core-web-vitals and TypeScript rules. No Prettier config is committed — the repo relies on ESLint formatting rules and editor defaults.
- TypeScript is the only styler; no SCSS modules — styling is done with Tailwind utility classes and the `cn()` helper from `src/lib/utils.ts` (composed via `clsx` + `tailwind-merge`).

## Import Organization

- All internal imports use the `@/` alias.
- External (npm) imports come first, then `@/` imports, then relative imports. Group blank lines separate concerns.

```typescript
// External
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Internal alias
import { useCrimeData } from '@/hooks/useCrimeData';
import type { UseCrimeDataOptions, UseCrimeDataResult } from '@/types/crime';
import { CHICAGO_BOUNDS, lonLatToNormalized } from '@/lib/coordinate-normalization';

// Relative (rare)
import { buildCategoryLegendEntries } from './category-legend';
```

For type-only imports, always use the `import type { ... }` form so type-only dependencies are erased at build time.

## JSDoc / TSDoc Documentation

Use `/** ... */` block comments for exported functions, classes, and interfaces. Include `@param` / `@returns` only for non-obvious behavior; the `src/lib/date-normalization.ts` file is the canonical example:

```typescript
/**
 * Normalize a real epoch timestamp to a 0-100 value based on the data range.
 *
 * @param realTime - Epoch seconds
 * @param minTime - Minimum epoch seconds in data range
 * @param maxTime - Maximum epoch seconds in data range
 * @returns Normalized value 0-100
 */
export const normalizeToPercent = (realTime, minTime, maxTime): number => { ... }
```

The synthetic generator and study modules carry heavy doc blocks because they are the public contracts (see `src/lib/synthetic/goh-barabasi.ts`, `src/lib/study/storage.ts`, `src/lib/logger.ts`).

The Python sibling uses **PEP 257 docstrings** (single-line summary) plus a top-of-file module docstring with the algorithm and usage block (see `scripts/synthetic/generate_bursty.py`).

## React Component Patterns

- **Component file** exports the component (default or named) and its `Props` type. Examples: `src/components/timeline/DualTimeline.tsx`, `src/components/timeline/SuggestionPanel.tsx`.
- **Hooks** are extracted into `src/hooks/` (e.g. `useCrimeData.ts`, `useLogger.ts`) and named with a `use` prefix.
- **Container / view separation** — store interaction lives in hooks; presentational components accept callbacks via props. Tests use `react-test-renderer` (configured in `package.json`).
- **Co-locate** styles, helpers, and tests with the component when they are private to that component (e.g. `src/components/timeline/lib/`, `src/components/dashboard-demo/lib/`).
- **Touch device hooks** like `useDebounce`, `useMeasure`, `useDraggable` follow the same convention.

## Factory Helper Pattern (test data builders)

Tests use small in-file `build*` factory functions instead of dedicated fixture files. The pattern is consistent across the codebase:

```typescript
// src/lib/clustering/cluster-analysis.test.ts
const buildPoint = (overrides: Partial<FilteredPoint> & { typeId: number; districtId: number }): FilteredPoint => ({
  x: 0,
  y: 0,
  z: 0,
  typeId: 1,
  districtId: 1,
  originalIndex: 0,
  ...overrides,
});

// src/lib/full-auto-orchestrator.test.ts
function buildCrime(id: number, timestamp: number): CrimeRecord {
  return {
    id: `crime-${id}`,
    timestamp,
    lat: 41.88,
    lon: -87.63,
    x: 0,
    z: 0,
    type: id % 2 === 0 ? 'THEFT' : 'BATTERY',
    district: '001',
    year: 2024,
    iucr: '0000',
  };
}

// src/lib/evolution/evolution-flow.test.ts
const buildSlice = (overrides: Partial<EvolutionFlowSliceInput> = {}): EvolutionFlowSliceInput => ({
  id: overrides.id ?? 'slice-a',
  label: overrides.label ?? overrides.id ?? 'slice-a',
  type: overrides.type ?? 'point',
  time: overrides.time ?? 10,
  range: overrides.range,
  isVisible: overrides.isVisible ?? true,
});

// src/lib/hotspot-evolution.test.ts
function makeSurface(overrides: Partial<StkdeSurfaceResponse> = {}): StkdeSurfaceResponse { ... }

// src/components/timeline/lib/burst-score-series.test.ts
const buildGeometry = (overrides: Partial<BurstScoreGeometryInput> = {}): BurstScoreGeometryInput => ({ ... });

// src/app/timeslicing-algos/lib/selection-detail-dataset.test.ts
const buildCrimeRows = (count: number, start = 1_000_000) => Array.from(...);
```

**Rule of thumb:** in-file factory function named `build*` (or `make*`) that takes an `overrides` object defaulting to `{}`, returns a fully-typed object with sensible defaults, and uses object-spread so the caller only specifies what they need. The "package" pattern (`buildPackage` referenced in your prompt) is the same idea applied to higher-level composite fixtures.

## Module Patterns

- **Barrel files** are used selectively. `src/lib/queries/index.ts` re-exports `types`, `sanitization`, `filters`, `aggregations`, `builders` so consumers can `import { ... } from './queries'` or `from '@/lib/queries'`.
- **Side-effect-free modules** — pure functions live in `src/lib/`; side-effecting modules (state, fetch, route handlers) live in `src/store/`, `src/hooks/`, or `src/app/api/*`.
- **Discriminated unions** for stateful domain types: `TimeSlice` has `type: 'point' | 'range'` with conditional `time` / `range` fields (`src/store/slice-domain/types.ts`).
- **Hoisted mocks** in tests use `vi.hoisted(() => ({ ... }))` so the mocked references are available before `vi.mock(...)` factory closes over them (see `src/lib/queries.test.ts` and `src/app/api/crime/overview/route.test.ts`).

## Error Handling

### API route pattern (DuckDB → mock fallback)

Every API route under `src/app/api/crime/*` follows the same try/catch shape: a successful DuckDB read returns real data, while any failure (DB disabled, dataset missing, query error) returns a mock payload **with the `X-Data-Warning` response header** so the client can surface a banner.

Canonical example — `src/app/api/crime/overview/route.ts`:

```typescript
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (isMockDataEnabled()) {
      return NextResponse.json(MOCK_OVERVIEW, {
        status: 200,
        headers: { 'X-Data-Warning': 'Using demo data - database disabled' },
      });
    }
    if (!existsSync(getDataPath())) {
      return NextResponse.json(MOCK_OVERVIEW, {
        status: 200,
        headers: { 'X-Data-Warning': 'Using demo data - dataset file not found' },
      });
    }
    const metadata = await readDatasetMetadata();
    const overviewBins = await readOverviewBins(maxPoints);
    return NextResponse.json({ overviewBins, ... });
  } catch (error) {
    console.error('Error fetching overview timestamps:', error);
    return NextResponse.json(MOCK_OVERVIEW, {
      status: 200,
      headers: { 'X-Data-Warning': 'Using demo data - database unavailable' },
    });
  }
}
```

Routes using the same three-message `X-Data-Warning` taxonomy:
`src/app/api/crime/overview/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/around/route.ts`, `src/app/api/crime/stats-summary/route.ts`, `src/app/api/crimes/range/route.ts`.

Tests assert the header content via `expect(response.headers.get('X-Data-Warning')).toContain('database unavailable')` (see `src/app/api/crime/overview/route.test.ts`).

### Validation pattern (Zod-like hand-rolled)

`src/app/api/study/log/route.ts` validates the JSON body per `kind` and returns `400` with `{ ok: false, error }`. The test fixture declares one `baseSessionStart`, `baseSessionEnd`, `baseTrial`, etc. per study intent and asserts both accept and reject paths.

### Logger batching (`LoggerService`)

`src/lib/logger.ts` defines `class LoggerService` that batches study events and flushes them to `/api/study/log`. Important semantics:

- `submit(intent)` is `async` and resolves only after the server returns `{ ok: true }`. Up to `MAX_ATTEMPTS = 4` retries with linear backoff (`RETRY_BACKOFF_MS = 750`).
- `enqueue(intent)` is fire-and-forget; the queue is drained sequentially and requeues on failure.
- A `beforeunload` handler calls `beaconDrain()` which uses `navigator.sendBeacon('/api/study/log', blob)` as a best-effort fallback (browser-only, gated by `typeof window !== 'undefined'` and `typeof navigator.sendBeacon === 'function'`).
- A typed helper set (`submitSessionStart`, `submitSessionEnd`, `submitTrialComplete`, `submitQuestionnaireResponse`, `submitConditionToggle`, `submitWarpAdjustment`) wraps `logger.submit({ kind, ...payload })` and is the preferred call shape.

`useLogger` (`src/hooks/useLogger.ts`) is a thin React wrapper around `logger.log` for component-level logging:

```typescript
export const useLogger = () => {
  const log = useCallback((type: string, payload?: any) => {
    logger.log(type, payload);
  }, []);
  return { log };
};
```

### Query sanitization

All SQL is built through the `src/lib/queries/` builders. Table names go through `sanitizeTableName` (allowlist: `crimes_sorted`, `adaptive_global_cache`); numeric inputs are clamped by `clampAdaptiveBinCount`, `clampKernelWidth`, `clampDensityResolution` (`src/lib/queries/sanitization.ts`). All user-supplied values are bound via `?` placeholders — never interpolated.

## Logging

- Client logging goes through `LoggerService` (`src/lib/logger.ts`) or `useLogger` (`src/hooks/useLogger.ts`).
- Server-side ad-hoc logging uses `console.error` (e.g. `console.error('Error fetching overview timestamps:', error)` in `src/app/api/crime/overview/route.ts`) and `console.debug('[study-log]', ...)` in dev only.
- There is no third-party log shipper; logs flow to the browser console and the `/api/study/log` endpoint.

## Comments

- **JSDoc** on every exported public function or interface (see `src/lib/synthetic/types.ts`, `src/lib/study/storage.ts`).
- **Inline `// Pitfall N` / `// Phase XX`** notes at decision points — e.g. `src/lib/logger.ts` cites "Pitfall 4 in 80-RESEARCH.md" and "Phase 80 Evaluation Logger".
- **Section banners** with ASCII dashes (the Python file uses `# ----` headings; the TS code uses block-comment headers). Example from `src/lib/queries/aggregations.ts`:

```typescript
// ---------------------------------------------------------------------------
// Per-type alpha profile — matches TS logic
// ---------------------------------------------------------------------------
```

## Function & Module Design

- **Pure functions** for business logic (`src/lib/slice-utils.ts`, `src/lib/date-normalization.ts`, `src/lib/queries/aggregations.ts`). No `useState` / side effects.
- **Builders** for complex composite types — `buildCrimesInRangeQuery`, `buildCrimeCountQuery`, `buildGlobalAdaptiveCacheQueries` in `src/lib/queries/` all return `{ sql, params }` fragments. Filter fragments are joined with `joinFragments()` in `filters.ts`.
- **Discriminated unions** for state machines: `StudyIntentKind`, `BurstyGeneratorConfig['typeStrategy']`, `TimeSliceSource`.
- **Reasonable module size** — small focused files (most lib files are < 200 lines; larger ones like `goh-barabasi.ts` and `queries.ts` are split deliberately).
- **Re-exports** through `src/lib/queries/index.ts` and the `src/types/index.ts` barrel; `src/lib/queries.ts` is a thin facade re-exporting from `./queries` so legacy imports still resolve.

---

*Convention analysis: 2026-06-27*
