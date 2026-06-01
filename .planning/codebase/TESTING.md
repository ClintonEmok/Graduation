# Testing Patterns

**Analysis Date:** 2026-06-01

## Test Framework

**Runner:**
- **Vitest 4.0.18** — ECMAScript-native test runner with ESM support
- Config: `vitest.config.mts` (at project root)

**Assertion Library:**
- Built-in `expect` from Vitest (chai-compatible API with jest-compatible matchers)

**Run Commands:**
```bash
pnpm test                           # Run all tests (vitest)
pnpm test -- --run                  # Run once (no watch)
pnpm test -- --coverage             # Run with coverage
```

**Vitest Configuration** (`vitest.config.mts`):
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
});
```

Key points:
- Environment: `node` (not `jsdom` by default — jsdom is installed but not set as default)
- Root-level test discovery: `src/**/*.test.ts` and `src/**/*.test.tsx`
- Path alias `@/` resolves to `./src/` via `resolve.alias`
- `jsdom` 28.0.0 available as `devDependency` for component tests that need DOM

## Test File Organization

**Location:** Tests are **co-located** with source files in the same directory:
```
src/lib/slice-utils.ts
src/lib/slice-utils.test.ts

src/store/useSliceStore.ts
src/store/useSliceStore.test.ts

src/hooks/useCrimeData.ts
src/hooks/useCrimeData.test.ts

src/components/viz/BurstList.tsx
src/components/viz/BurstList.test.ts

src/app/api/stkde/hotspots/route.ts
src/app/api/stkde/hotspots/route.test.ts

src/app/dashboard/page.tsx
src/app/dashboard/page.shell.test.tsx
```

**No separate `__tests__` directories** — tests sit directly alongside production code.

**Naming:**
- Pure logic tests: `*.test.ts` (e.g., `slice-utils.test.ts`, `db.test.ts`)
- Component tests: `*.test.tsx` (e.g., `BurstList.test.tsx`, `page.shell.test.tsx`)
- Phase rollout tests: `*.phaseN.test.ts` (e.g., `stkde-overlay.phase2.test.ts`, `monthly-contract.phase1.test.ts`)
- Refactor guard tests: `*.refactor.test.ts` (e.g., `DemoDualTimeline.refactor.test.ts`)
- QA contract tests: `*.contract.test.ts` (e.g., `useAdaptiveStore.contract.test.ts`)

## Test File Structure

### Pure Function / Lib Tests

```typescript
import { describe, expect, test } from 'vitest';
import { normalizeRange, withinTolerance } from './slice-utils';

describe('withinTolerance', () => {
  test('accepts values inside tolerance', () => {
    expect(withinTolerance(10.1, 10, 0.2)).toBe(true);
  });

  test('rejects values outside tolerance', () => {
    expect(withinTolerance(10.3, 10, 0.2)).toBe(false);
  });
});

describe('normalizeRange', () => {
  test('returns ascending order for descending input', () => {
    expect(normalizeRange([30, 10])).toEqual([10, 30]);
  });
});
```

### Store Tests

```typescript
import { beforeEach, describe, expect, test } from 'vitest';
import { useCoordinationStore } from './useCoordinationStore';

beforeEach(() => {
  useCoordinationStore.setState({
    selectedIndex: null,
    selectedSource: null,
    // ... reset all state fields
  });
});

describe('useCoordinationStore', () => {
  test('last interaction wins when committing from map after timeline', () => {
    const store = useCoordinationStore.getState();
    store.commitSelection(4, 'timeline');
    store.commitSelection(9, 'map');
    const state = useCoordinationStore.getState();
    expect(state.selectedIndex).toBe(9);
    expect(state.selectedSource).toBe('map');
  });
});
```

### Component / Hook Tests (with React Test Renderer)

```typescript
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrimeData } from '@/hooks/useCrimeData';

// Hook probe component for testing hooks
const HookProbe = ({ options, onUpdate }) => {
  const result = useCrimeData(options);
  useEffect(() => { onUpdate(result); }, [onUpdate, result]);
  return null;
};

// Custom renderer factory with QueryClientProvider wrapper
const createRenderer = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const App = () =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(HookProbe, { options: currentOptions, onUpdate })
    );
  // ... render and return promise-based 'renderAndWait'
};

describe('useCrimeData', () => {
  afterEach(() => { vi.restoreAllMocks(); cleanup?.(); });

  it('applies default 30-day buffering', async () => {
    const harness = createRenderer();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [], meta: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await harness.renderAndWait({ startEpoch: 978307200, endEpoch: 978393600 });
    expect(result.data).toEqual([]);
  });
});
```

### API Route Tests

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks at the top
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('@/lib/queries', () => ({ queryCrimesInRange: mockFn }));

import { POST } from '@/app/api/stkde/hotspots/route';

describe('/api/stkde/hotspots POST', () => {
  beforeEach(() => { mockFn.mockReset(); });

  it('rejects malformed request payload', async () => {
    const request = new Request('http://localhost/api/stkde/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: { startEpochSec: 1000 } }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/domain/);
  });
});
```

### Static Analysis / Shell Composition Tests

```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard shell', () => {
  test('keeps the phase-1 overview shell composition', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/DashboardLayout/);
    expect(pageSource).toMatch(/MapVisualization/);
  });

  test('does not include dashboard-demo rail chrome', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).not.toMatch(/WorkflowSkeleton|DemoTimelinePanel/);
  });
});
```

## Mocking

**Framework:** Vitest built-in (`vi`)

**Patterns:**

1. **Function mocking with `vi.fn()`:**
```typescript
const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
vi.stubGlobal('fetch', fetchMock);
```

2. **Module mocking with `vi.mock()`:**
```typescript
vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));
```

3. **Hoisted mocks with `vi.hoisted()` for circular dependency resolution:**
```typescript
const { queryCrimesInRangeMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
}));
vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));
```

4. **Global stub with `vi.stubGlobal()`:**
```typescript
vi.stubGlobal('fetch', fetchMock);
afterEach(() => { vi.restoreAllMocks(); });
```

**What to Mock:**
- External HTTP requests (`fetch`)
- Database queries from `@/lib/queries`
- Worker computations (when testing store coordination logic)
- Module dependencies to isolate test scope

**What NOT to Mock:**
- Pure utility functions (test them directly)
- In-store computation logic (test via state assertions)
- Zustand stores (test via `getState()` and `setState()`, no need to mock the store itself)

## Test Data Builders

**Pattern:** Factory functions with `overrides` pattern:
```typescript
const buildPoint = (overrides: Partial<FilteredPoint> & { typeId: number; districtId: number }): FilteredPoint => ({
  x: 0, y: 0, z: 0, typeId: 1, districtId: 1, originalIndex: 0,
  ...overrides,
});

// Usage:
const point = buildPoint({ x: 10, y: 12, z: 10, typeId: 1, districtId: 1, originalIndex: 0 });
```

**Inline test data** for smaller cases:
```typescript
const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
];
```

**Generated data via `Array.from()` for large datasets:**
```typescript
const many = Array.from({ length: 20 }, (_, index) => ({
  timestamp: 1_700_010_000 + index,
  type: 'THEFT',
  lat: 41.88,
  lon: -87.63,
  x: 0, z: 0, district: '1', year: 2023, iucr: '0820',
})) satisfies CrimeRecord[];
```

## Common Test Patterns

**Suite Organization:**
- `describe` blocks per function/method or per domain behavior
- Nested `describe` for related groups
- `describe` for a store's action group

**Setup/Teardown:**
- `beforeEach` to reset Zustand store state:
```typescript
beforeEach(() => {
  useSliceStore.getState().clearSlices();
});
```
- `afterEach` to restore mocks:
```typescript
afterEach(() => {
  vi.restoreAllMocks();
  cleanup?.();
});
```

**Async Patterns:**
- `async` test functions with `await` for async operations
- Promise-based harness for React hooks:
```typescript
const renderAndWait = async (options): Promise<Result> => {
  const done = new Promise<Result>((resolve, reject) => {
    pendingResolve = resolve;
    timeoutId = setTimeout(() => reject(new Error('Timed out')), 3000);
  });
  await act(async () => { renderer.update(...); });
  return await done;
};
```

**Edge Case Testing:**
- Empty input arrays: `expect(result.clusters).toEqual([])`
- Invalid/malformed input: `expect(() => parseDate('not-a-date')).toThrow()`
- Boundary conditions: equal start/end, decimal precision edge cases
- Null/undefined guards: `expect(result).not.toBeNull()` / `expect(outsideTolerance).toBeUndefined()`

**Matcher Patterns:**
- `toBe(value)` for primitive equality
- `toEqual(value)` for deep equality
- `toMatchObject({ ... })` for partial object matching
- `toMatch(/regex/)` for string pattern matching
- `toContain(value)` for array membership and string substring
- `toBeTypeOf('number')` for type checks
- `toBeCloseTo(value, decimals)` for floating point comparisons
- `toHaveLength(n)` for array/string length
- `toHaveBeenCalledTimes(n)` and `toHaveBeenCalledWith(...)` for mock assertions
- `.not.` negation: `expect(...).not.toHaveBeenCalled()`
- `expect.any(Number)` / `expect.any(String)` for type-flexible assertions

## Test Types

**Unit Tests (dominant pattern):**
- Pure function testing: direct input/output assertions (e.g., `slice-utils.test.ts`, `db.test.ts`, `bounds.test.ts`)
- Store testing: state manipulation through `getState()` and `setState()` (e.g., `useSliceStore.test.ts`, `useCoordinationStore.test.ts`)
- Isolated module testing with mocked dependencies (e.g., `queries.test.ts`, `crime-api.test.ts`)

**Component Tests:**
- Shell/composition tests using `readFileSync` regex matching on source (e.g., `page.shell.test.tsx`)
- Hook tests using `react-test-renderer` with custom `HookProbe` pattern (e.g., `useCrimeData.test.ts`)
- Component tests using `react-test-renderer` with `act()` for state updates (e.g., `stkde-overlay.phase2.test.ts`, `cluster-interaction.phase5.test.tsx`)

**API Route Tests:**
- Request/response cycle testing with mocked database layer (e.g., `route.test.ts` for STKDE hotspots, crime range endpoints)
- Request object creation: `new Request('http://localhost/...', { method: 'POST', body: JSON.stringify(payload), headers })`
- Status code and response shape validation
- Fallback mode and guardrail testing

**Worker Tests:**
- Direct function call patterns (workers export the compute function for unit testing):
```typescript
import { computeAdaptiveMaps } from './adaptiveTime.worker';
test('returns finite maps for duplicate-heavy timestamps', () => {
  const maps = computeAdaptiveMaps(timestamps, [0, 60], { binCount: 4, kernelWidth: 1 });
  expect(maps.densityMap).toHaveLength(4);
});
```

**Static Analysis Tests:**
- Source string matching to enforce architecture boundaries:
```typescript
const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');
expect(source).toMatch(/DualTimelineSurface/);
expect(source).not.toMatch(/formatDateByResolution/);
expect(source.split('\n').length).toBeLessThan(1150);
```

**Contract Tests:**
- Named with `.contract.test.ts` suffix
- Test backward compatibility and API surface stability (e.g., `useAdaptiveStore.contract.test.ts`)

## Coverage

**Requirements:** Not enforced in config (no `coverage` block in `vitest.config.mts`). However, the codebase has extensive test coverage across all layers:
- 92+ test files observed
- Coverage spans lib utilities, stores, hooks, components, API routes, and workers
- No coverage thresholds set in configuration

**To view coverage:**
```bash
pnpm vitest -- --coverage
```

## Known Test Patterns to Follow

1. **Store reset in `beforeEach`** — always reset Zustand store state before each test to avoid cross-test pollution
2. **Factored-out test harness** — complex hook tests use a `createRenderer` factory that returns `{ renderAndWait, cleanup }` for reusability
3. **Descriptive test names** — follow pattern: "does X when Y" (e.g., "rejects malformed request payload", "skips fetch when epoch range is invalid")
4. **Mock reset in `beforeEach`** — always `mockReset()` or `mockClear()` mocks per test
5. **API route tests use `new Request()`** — direct instantiation of `Request` object, no supertest or similar library
6. **Phase-suffixed tests** — incremental feature tests use `.phaseN.test.ts` naming to map to development phases
7. **Worker function export** — workers export their compute function so it can be unit-tested directly without worker instantiation
8. **No testing library** — no `@testing-library/react` or React Testing Library found; `react-test-renderer` is the primary component test tool

## Known Test Issues

1. **No CI integration observed** — no CI config files found (no `.github/workflows/`, no CircleCI, no Jenkinsfile)
2. **No `jsdom` as default environment** — vitest uses `node` environment; component tests needing DOM must set `// @vitest-environment jsdom` or run separately
3. **No `@testing-library/react`** — component tests rely on `react-test-renderer` for rendering and on static `readFileSync` patterns for composition verification (no user-event simulation, no DOM queries)
4. **No E2E tests** — no Playwright, Cypress, or similar E2E framework detected
5. **Coverage thresholds not enforced** — no minimum coverage requirements in `vitest.config.mts`
6. **Phase/refactor test naming inconsistency** — tests use `.phaseN.test.ts` conventions alongside `.refactor.test.ts` and `.contract.test.ts` suffixes; no single standard for suffix selection

---

*Testing analysis: 2026-06-01*
