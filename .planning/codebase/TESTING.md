# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config file: `vitest.config.mts`

**Assertion Library:**
- Vitest built-in `expect`

**Run Commands:**
```bash
npm test                 # Run all tests
npm test -- --watch      # Watch mode (via vitest)
```

**Environment:**
- Default: `node` (set in `vitest.config.mts`)
- Override per-file with `/* @vitest-environment node */` directive

## Test File Organization

**Location:**
- Co-located with source files
- Same directory as implementation

**Naming:**
- `.test.ts` for TypeScript files
- `.test.tsx` for React components/hooks

**Examples:**
- `src/store/useSliceStore.test.ts` - tests for `src/store/useSliceStore.ts`
- `src/hooks/useCrimeData.test.ts` - tests for `src/hooks/useCrimeData.ts`
- `src/workers/adaptiveTime.worker.test.ts` - tests for `src/workers/adaptiveTime.worker.ts`

**Config:**
```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Test Structure

**Suite Organization:**
```typescript
import { beforeEach, describe, expect, test } from 'vitest';
import { useSliceStore } from './useSliceStore';

beforeEach(() => {
  useSliceStore.getState().clearSlices();
});

describe('slice store actions', () => {
  test('supports CRUD operations for point and range slices', () => {
    const store = useSliceStore.getState();
    // test implementation
  });
});
```

**Patterns:**
- `describe` blocks for grouping related tests
- `test` or `it` for individual test cases
- `beforeEach` for setup/reset
- `afterEach` for cleanup (e.g., `vi.restoreAllMocks()`)

**Zustand Store Testing:**
```typescript
// Direct state manipulation via getState()
const store = useSliceStore.getState();
store.addSlice({ time: 50 });
expect(useSliceStore.getState().slices.length).toBe(1);

// Reset between tests
beforeEach(() => {
  useSliceStore.getState().clearSlices();
});
```

## Mocking

**Framework:** Vitest (`vi`)

**Patterns:**

**1. Function Mocks (`vi.fn()`):**
```typescript
const setTimeRange = vi.fn();
const setRange = vi.fn();
const applyRangeToStores = (startSec: number, endSec: number) => {
  applyRangeToStoresContract({
    interactive: true,
    startSec,
    endSec,
    domainStart: 0,
    domainEnd: 100,
    currentTime: 50,
    setTimeRange,
    setRange,
    // ...
  });
};
```

**2. Global Stubbing (`vi.stubGlobal()`):**
```typescript
// Stub fetch
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [], meta: { returned: 0 } }),
});
vi.stubGlobal('fetch', fetchMock);

// Stub localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  // ...
};
vi.stubGlobal('localStorage', localStorageMock);
```

**3. Restore Mocks:**
```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

**4. Mock Timers:**
```typescript
vi.useFakeTimers();
// ... test code
vi.useRealTimers();
```

## Fixtures and Factories

**Test Data:**
- Inline fixtures in test files for simple data
- Separate factory functions for complex objects

**Example from `src/lib/stkde/compute.test.ts`:**
```typescript
const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_011_000, type: 'THEFT', lat: 41.8805, lon: -87.631, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  // ...
];
```

## Coverage

**Requirements:** None explicitly enforced

**View Coverage:**
```bash
npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Store logic: Direct state manipulation via `getState()`
- Pure functions: Direct function calls with assertions
- Worker functions: Direct imports and function calls

**Integration Tests:**
- Hooks with React Query: Custom test renderer with QueryClient
- Store persistence: LocalStorage mocking

## Common Patterns

### Hook Testing with React Query

**Example from `src/hooks/useCrimeData.test.ts`:**

```typescript
import TestRenderer, { act } from 'react-test-renderer';
import { useCrimeData } from '@/hooks/useCrimeData';

const createRenderer = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Custom render and wait pattern
  const renderer = TestRenderer.create(React.createElement(App));

  const renderAndWait = async (options) => {
    const done = new Promise((resolve, reject) => {
      // pendingResolve/pendingReject setup
      timeoutId = setTimeout(() => reject(new Error('Timed out')), 3000);
    });

    await act(async () => {
      renderer.update(React.createElement(App));
      await Promise.resolve();
    });

    return await done;
  };

  return { renderAndWait, cleanup: () => { renderer.unmount(); queryClient.clear(); } };
};

it('applies default 30-day buffering', async () => {
  const harness = createRenderer();
  const fetchMock = vi.fn().mockResolvedValue({ /* mock response */ });
  vi.stubGlobal('fetch', fetchMock);

  const result = await harness.renderAndWait({ startEpoch: 978307200, endEpoch: 978393600 });
  
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result.bufferedRange).toEqual({ start: 975715200, end: 980985600 });
});
```

### Store Testing Pattern

```typescript
beforeEach(() => {
  useSliceStore.getState().clearSlices();
});

test('adds slice correctly', () => {
  const store = useSliceStore.getState();
  store.addSlice({ time: 50 });
  
  expect(useSliceStore.getState().slices).toHaveLength(1);
  expect(useSliceStore.getState().slices[0].time).toBe(50);
});
```

### LocalStorage Mocking Pattern

```typescript
/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
};

vi.stubGlobal('localStorage', createLocalStorageMock());

import { useFilterStore } from './useFilterStore';
```

### Parametrized Tests

```typescript
test.each(['uniform-time', 'uniform-events'] as const)(
  'uses density-derived warp weights in %s mode',
  (binningMode) => {
    const timestamps = Float32Array.from([0, 1, 2, 10, 11, 12, 13, 20, 30, 31]);
    const maps = computeAdaptiveMaps(timestamps, [0, 40], {
      binCount: 4,
      kernelWidth: 1,
      binningMode,
    });
    // assertions
  },
);
```

---

*Testing analysis: 2026-03-30*
