<!-- generated-by: gsd-doc-writer -->
# Testing

## Test Framework and Setup

This project uses **Vitest 4.0.18** as its test framework. Tests run in a `node` environment (no browser/jsdom DOM environment by default — component tests that need React rendering use `react-test-renderer` explicitly).

Configuration is in [`vitest.config.mts`](../vitest.config.mts):

- **Environment**: `node`
- **File pattern**: `src/**/*.test.ts` and `src/**/*.test.tsx`
- **Path alias**: `@/` maps to `./src/` (matching `tsconfig.json`)

No global setup file or coverage configuration is currently in use. Install dependencies before running tests:

```bash
pnpm install
```

## Running Tests

| Command | Description |
|---|---|
| `pnpm test` | Run the full test suite once |
| `pnpm test -- --watch` | Run tests in watch mode (re-runs on file changes) |
| `pnpm test -- src/lib/adaptive-scale.test.ts` | Run a single test file |
| `pnpm test -- -t "computeAdaptiveY"` | Run only tests matching a specific name pattern |
| `pnpm test -- --bail=5` | Stop after 5 failures for fast feedback |

Vitest automatically picks up files matching `src/**/*.test.ts` and `src/**/*.test.tsx`.

## Test Structure and Conventions

### File Naming and Location

Tests are **co-located** with their source files. Every test file sits next to the module it tests:

```
src/lib/adaptive-scale.ts          → src/lib/adaptive-scale.test.ts
src/store/useAdaptiveStore.ts      → src/store/useAdaptiveStore.test.ts
src/app/api/stkde/hotspots/route.ts → src/app/api/stkde/hotspots/route.test.ts
src/components/viz/BurstList.tsx   → src/components/viz/BurstList.test.ts
```

File extensions:
- **`*.test.ts`** — Tests for pure functions, stores, utilities, API routes, workers
- **`*.test.tsx`** — Tests for React components and hooks that use `react-test-renderer`

### Test Structure Pattern

Tests use Vitest's `describe`/`test` (or `it`) blocks:

```typescript
import { describe, expect, test } from 'vitest';
import { computeAdaptiveY } from './adaptive-scale';

describe('computeAdaptiveY', () => {
  test('returns correct length and monotonic values', () => {
    const result = computeAdaptiveY(points, domain, range);
    expect(result).toHaveLength(points.length);
    expect(result[1]).toBeGreaterThanOrEqual(result[0]);
  });
});
```

`describe` blocks describe the function or module under test. Nested `describe` blocks group related behaviors.

### Test Data Builders

Test data is constructed using **factory helper functions** or inline object literals rather than fixture files:

```typescript
// Factory pattern
const buildPoint = (overrides: Partial<FilteredPoint>): FilteredPoint => ({
  x: 0, y: 0, z: 0,
  typeId: 1, districtId: 1,
  originalIndex: 0,
  ...overrides,
});

// Usage
const points = [
  buildPoint({ x: 10, y: 12, z: 10 }),
  buildPoint({ x: 30, y: 80, z: 30 }),
];
```

## Key Test Areas

### 1. Library / Utility Tests (`src/lib/`)

Pure function tests that import and call functions directly — no mocking needed. These form the largest group of tests and cover:

- **Binning engine** (`src/lib/binning/engine.test.ts`) — Hourly/daily bin generation strategies
- **Adaptive scaling** (`src/lib/adaptive-scale.test.ts`) — `computeAdaptiveY`, `getAdaptiveScaleConfig`
- **DB utilities** (`src/lib/db.test.ts`) — Date parsing, epoch conversion, data paths
- **STKDE computation** (`src/lib/stkde/compute.test.ts`) — Hotspot detection from crime records
- **Slice utilities** (`src/lib/slice-utils.test.ts`) — Range matching, tolerance calculations
- **Cluster analysis** (`src/lib/clustering/cluster-analysis.test.ts`) — DBSCAN-based clustering logic
- **Date normalization** (`src/lib/date-normalization.test.ts`)
- **Category shapes/legend** (`src/lib/category-shapes.test.ts`, `src/lib/category-legend.test.ts`)
- **Query builders** (`src/lib/queries.test.ts`) — DuckDB SQL query construction and mock data fallback
- **Burst detection** (`src/lib/burst-detection.test.ts`)
- **Timeline series** (`src/lib/timeline-series.test.ts`)

### 2. Store Tests (`src/store/`)

Zustand store tests that call store methods directly:

```typescript
import { useAdaptiveStore } from './useAdaptiveStore';

test('uses uniform-time as default binningMode', () => {
  useAdaptiveStore.getState().computeMaps(data, domain);
  // Assert on store state
});
```

Stores with Web Worker dependencies mock the `Worker` global and verify posted messages.

### 3. Worker Tests (`src/workers/`)

Web Worker functions are exported and tested directly (no worker instantiation needed):

```typescript
import { computeAdaptiveMaps } from './adaptiveTime.worker';

test('returns finite maps for duplicate-heavy timestamps', () => {
  const maps = computeAdaptiveMaps(timestamps, domain, { binCount: 4 });
  expect(maps.densityMap).toHaveLength(4);
});
```

### 4. Hook Tests (`src/hooks/`, `src/components/*/hooks/`)

React hooks are tested using `react-test-renderer` with a `HookProbe` component pattern:

```typescript
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const HookProbe = ({ options, onUpdate }) => {
  const result = useCrimeData(options);
  useEffect(() => { onUpdate(result); }, [onUpdate, result]);
  return null;
};

// Wrap with providers, render, and await settled state
```

TanStack Query hooks require wrapping in `QueryClientProvider`.

### 5. Component Tests (`src/components/`, `src/app/`)

Most component tests use **source introspection** (reading the source file and checking for expected patterns) rather than rendering with a DOM:

```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

test('renders the shell composition', () => {
  const source = readFileSync(new URL('./Component.tsx', import.meta.url), 'utf8');
  expect(source).toMatch(/DesiredComponent/);
  expect(source).not.toMatch(/UnwantedPattern/);
});
```

A smaller number of component tests use `react-test-renderer` with `act()` for rendering and assertion.

### 6. API Route Tests (`src/app/api/`)

API routes are tested by constructing `Request` objects and calling the route handler directly:

```typescript
import { POST } from '@/app/api/stkde/hotspots/route';

test('rejects malformed request payload', async () => {
  const request = new Request('http://localhost/api/stkde/hotspots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: { startEpochSec: 1000 } }),
  });
  const response = await POST(request);
  expect(response.status).toBe(400);
});
```

## Mocking Approach

### Module Mocking with `vi.mock`

Dependencies are mocked using Vitest's `vi.mock()` with `vi.hoisted()` for hoisted mock declarations:

```typescript
const { queryCrimesInRangeMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));
```

### DuckDB Mocking

Database queries are tested via the mock data path or by mocking the `db` module:

```typescript
vi.mock('./db', () => ({
  ensureSortedCrimesTable: vi.fn(),
  getDb: vi.fn(),
  isMockDataEnabled: vi.fn(),
}));

// Enable mock data mode
isMockDataEnabledMock.mockReturnValue(true);
```

### Web Worker Mocking

Stores that use Web Workers mock the `Worker` global constructor and track posted messages:

```typescript
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'Worker', {
    value: MockWorker,
    configurable: true,
  });
});
```

### TanStack Query Mocking

Hook tests that use `useCrimeData` (or other TanStack Query hooks) wrap the component in `QueryClientProvider` with a fresh `QueryClient` that has retries disabled:

```typescript
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
```

## Coverage Requirements

**No coverage threshold is currently configured.** Coverage instrumentation is not set up in `vitest.config.mts`. To add coverage, install `@vitest/coverage-v8` and add a `coverage` block to the Vitest configuration.

## CI Integration

**No CI pipeline is currently configured.** The project has no `.github/workflows/` directory. Tests must be run locally before committing.

To add CI integration, create a workflow file (e.g., `.github/workflows/test.yml`) that runs:

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
- run: pnpm install
- run: pnpm test
```

## Writing New Tests

Follow these steps when adding a new test:

1. **Create the test file** — Place it next to the source module with the same name but `.test.ts` or `.test.tsx` extension.
2. **Import from Vitest** — Use `describe, expect, test` (or `it`) from `'vitest'`.
3. **Use `@/` path aliases** — Import the module under test using the project's `@/` path alias (e.g., `import { foo } from '@/lib/foo'`).
4. **Use `vi.hoisted()` for mocks** — If you need `vi.mock()`, declare mock variables with `vi.hoisted()` before the mock call.
5. **Build test data inline** — Use factory functions with spread overrides rather than JSON fixture files.
6. **Test behavior, not implementation** — Prefer testing function outputs and component behavior over internal state shapes.
7. **Co-locate describe blocks** — Use `describe('functionName')` matching the exported name of the function under test.
8. **Run the test** — Execute `pnpm test -- src/path/to/your.test.ts` to verify it passes before committing.

### Import Convention

```typescript
// Pure function tests
import { describe, expect, test } from 'vitest';

// Tests requiring mocks
import { beforeEach, describe, expect, it, vi } from 'vitest';

// React component/hook tests
import TestRenderer, { act } from 'react-test-renderer';
```

### Quick Reference

| Test Type | Imports | Environment |
|---|---|---|
| Pure function | `{ describe, expect, test }` | `node` (default) |
| Store | `{ describe, expect, test, vi, beforeEach }` | `node` |
| Web Worker | `{ describe, expect, test }` | `node` |
| Hook (React) | `{ describe, expect, it, vi }` + `TestRenderer, act` | `node` |
| Component (source) | `{ describe, expect, test }` + `readFileSync` | `node` |
| API route | `{ describe, expect, it, vi, beforeEach }` | `node` |
| Hook (TanStack Query) | add `QueryClient`, `QueryClientProvider` | `node` |
