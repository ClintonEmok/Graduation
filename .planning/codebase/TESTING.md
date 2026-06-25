# Testing Patterns

**Analysis Date:** 2026-06-25

## Test Framework

**Runner:**
- Vitest 4.1.9
- Config: `vitest.config.mts`

```typescript
// vitest.config.mts
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

**Assertion Library:** Vitest built-in (`expect`).

**Run Commands:**
```bash
pnpm test              # Run all tests (vitest)
pnpm test -- --watch   # Watch mode
pnpm test -- --coverage  # Coverage (if configured)
```

**Test environment:** `node` by default per vitest config.

**Key devDependencies:**
- `vitest` 4.1.9
- `jsdom` 28.1.0
- `react-test-renderer` 19.2.7
- `@types/react-test-renderer` 19.1.0

## Test File Organization

**Location:** Co-located with source files — tests live adjacent to the module they test.

```
src/lib/slice-utils.ts
src/lib/slice-utils.test.ts        # Unit test for pure functions

src/store/useFilterStore.ts
src/store/useFilterStore.test.ts   # Store integration test

src/hooks/useCrimeData.ts
src/hooks/useCrimeData.test.ts     # Hook test with TanStack Query

src/components/timeline/DemoDualTimeline.tsx
src/components/timeline/DemoDualTimeline.refactor.test.ts  # Contract test
```

**Naming:**
- Pure function/store tests: `*.test.ts`
- Component/React tests: `*.test.tsx`
- Page shell tests: `page.shell.test.tsx`
- Page tests: `page.*.test.tsx` (e.g., `page.stkde.test.ts`, `page.stats.test.ts`)
- Phase-specific tests: `*.phase{N}.test.ts` (e.g., `slice-stkde.phase2.test.ts`)
- Contract tests: `*.contract.test.ts` (e.g., `useAdaptiveStore.contract.test.ts`)
- Refactor tests: `*.refactor.test.ts` (e.g., `DemoDualTimeline.refactor.test.ts`)

## Test Structure

**Standard Pattern — Pure Function Tests:**
```typescript
import { describe, expect, test } from 'vitest';
import { normalizeToPercent, denormalizeToEpoch } from './date-normalization';

describe('normalizeToPercent', () => {
  const minTime = 978307200;
  const maxTime = 1767571200;

  test('returns 0 for minTime', () => {
    expect(normalizeToPercent(minTime, minTime, maxTime)).toBe(0);
  });

  test('returns 100 for maxTime', () => {
    expect(normalizeToPercent(maxTime, minTime, maxTime)).toBe(100);
  });

  test('clamps negative values to 0', () => {
    expect(normalizeToPercent(minTime - 1000, minTime, maxTime)).toBe(0);
  });

  test('handles equal min/max without division by zero', () => {
    expect(normalizeToPercent(100, 100, 100)).toBe(50);
  });
});
```

**Pattern — Store Contract Tests:**
```typescript
/* @vitest-environment node */
import { describe, expect, test } from 'vitest';
import { useAdaptiveStore } from './useAdaptiveStore';

describe('useAdaptiveStore warp control contract', () => {
  test('exposes automatic/manual controls', () => {
    const state = useAdaptiveStore.getState();
    expect(state.warpControlMode).toBe('automatic');

    state.setWarpControlMode('manual');
    expect(useAdaptiveStore.getState().warpControlMode).toBe('manual');
  });
});
```

**Pattern — Store Integration Tests (with localStorage mock):**
```typescript
/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock setup BEFORE importing the store
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

const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

import { useFilterStore } from './useFilterStore';

beforeEach(() => {
  localStorageMock.clear();
  useFilterStore.setState({ selectedTypes: [], selectedDistricts: [], ... });
});

describe('useFilterStore presets', () => {
  it('saves presets with current filter state', () => {
    useFilterStore.setState({ selectedTypes: [1, 2] });
    const preset = useFilterStore.getState().savePreset('Test Preset');
    expect(preset).not.toBeNull();
    expect(useFilterStore.getState().presets).toHaveLength(1);
  });
});
```

## Mocking

**Framework:** Vitest built-in (`vi`)

**Import Patterns:**
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
```

### vi.hoisted() — Mock dependencies before imports
```typescript
const { ensureSortedCrimesTableMock, getDbMock, isMockDataEnabledMock } = vi.hoisted(() => ({
  ensureSortedCrimesTableMock: vi.fn(),
  getDbMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('./db', () => ({
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
  getDb: getDbMock,
  isMockDataEnabled: isMockDataEnabledMock,
}));
```

### vi.stubGlobal() — Mock browser APIs
```typescript
// Mock fetch
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [], meta: {} }),
});
vi.stubGlobal('fetch', fetchMock);

// Mock localStorage
vi.stubGlobal('localStorage', localStorageMock);
```

### vi.fn() — Simple function mocks
```typescript
const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
```

### What to Mock:
- `fetch` for API calls
- `localStorage` for persistence
- DuckDB modules when testing query builders
- Browser globals (`window`, `navigator`) for logger tests

### What NOT to Mock:
- Pure computation functions (test them directly)
- Zustand stores (use `getState()`/`setState()` directly)
- Type definitions and constants

## Fixtures and Factories

**Factory Function Pattern — `buildPackage()`:**
```typescript
// src/app/timeslicing/page.full-auto-acceptance.test.tsx
function buildPackage(overrides?: Partial<AutoProposalSet>): AutoProposalSet {
  return {
    id: 'balanced',
    rank: 1,
    isRecommended: true,
    confidence: 88,
    score: { coverage: 90, relevance: 87, overlap: 92, continuity: 85, total: 88 },
    // ... defaults ...
    ...overrides,
  };
}
```

**Test data is defined inline** within test files using factory functions — no separate fixtures directory detected.

## Coverage

**Requirements:** Not explicitly configured in `vitest.config.mts`. No coverage thresholds detected.

**View Coverage:**
```bash
pnpm test -- --coverage
```

## Test Types

### Unit Tests (Pure Functions)
- **Scope:** Individual functions in `src/lib/`
- **Files:** `src/lib/*.test.ts`
- **Examples:** `slice-utils.test.ts`, `date-normalization.test.ts`, `burst-detection.test.ts`
- **Mocking:** None or minimal

### Store/Contract Tests
- **Scope:** Zustand store state transitions and action methods
- **Files:** `src/store/*.test.ts`, `src/store/*.contract.test.ts`
- **Mocking:** `localStorage` for persistence stores
- **Pattern:** Direct API calls via `useStore.getState()` and `useStore.setState()`

### Hook Tests (with TanStack Query)
- **Scope:** Custom hooks that use `useQuery` or `useMutation`
- **Files:** `src/hooks/*.test.ts`
- **Pattern:** Uses `react-test-renderer` + `QueryClientProvider`
  ```typescript
  import TestRenderer, { act } from 'react-test-renderer';

  const createRenderer = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const HookProbe = ({ options, onUpdate }) => {
      const result = useCrimeData(options);
      useEffect(() => { onUpdate(result); }, [onUpdate, result]);
      return null;
    };

    const App = () => React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(HookProbe, { options, onUpdate })
    );

    const renderer = TestRenderer.create(React.createElement(App));

    const renderAndWait = async (options) => {
      await act(async () => { renderer.update(React.createElement(App)); });
      // await settled result
    };

    return { renderAndWait, cleanup: () => { renderer.unmount(); queryClient.clear(); } };
  };
  ```

### Source Contract Tests (Snapshot-style via readFileSync)
- **Scope:** Page shells, component wiring, refactor verification
- **Files:** `src/app/*/page.*.test.tsx`, `src/components/*/*.refactor.test.ts`
- **Pattern:** Read source file, assert string matches
  ```typescript
  import { readFileSync } from 'node:fs';
  import { describe, expect, test } from 'vitest';

  describe('component contract', () => {
    test('keeps required imports', () => {
      const source = readFileSync(new URL('./Component.tsx', import.meta.url), 'utf8');
      expect(source).toMatch(/DualTimelineSurface/);
      expect(source).not.toMatch(/oldPattern/);
    });

    test('is under size limit', () => {
      const source = readFileSync(new URL('./Component.tsx', import.meta.url), 'utf8');
      expect(source.split('\n').length).toBeLessThan(1500);
    });
  });
  ```

### Worker Tests
- **Scope:** Web Worker computation functions
- **Files:** `src/workers/*.worker.test.ts`
- **Pattern:** Direct function import (workers exported as functions for testability)
  ```typescript
  import { describe, expect, test } from 'vitest';
  import { computeAdaptiveMaps } from './adaptiveTime.worker';

  describe('computeAdaptiveMaps', () => {
    test('defaults to uniform-time mode', () => {
      const timestamps = Float32Array.from([0, 2, 4, 6, 8, 10]);
      const maps = computeAdaptiveMaps(timestamps, [0, 10], { binCount: 5, kernelWidth: 1 });
      expect(maps.densityMap).toHaveLength(5);
    });
  });
  ```

## Common Patterns

**Async Testing:**
```typescript
test('handles async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expected);
});
```

**Error Testing:**
```typescript
test('propagates API failures', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);

  const result = await fetchAndProcess();
  expect(result.error).toBeTruthy();
  expect(result.error?.message).toContain('HTTP error: 500');
});
```

**Floating Point Assertions:**
```typescript
expect(result).toBeCloseTo(expected);
expect(result).toBeCloseTo(0.25, 5);  // with decimal precision
```

**Array/Length Assertions:**
```typescript
expect(result).toHaveLength(4);
expect(result[0]?.duration).toBe(3600);
```

**Truthiness Assertions:**
```typescript
expect(result).toBeTruthy();
expect(result).not.toBeNull();
expect(preset).not.toBeNull();
expect(fetchMock).toHaveBeenCalledTimes(1);
```

**Range/Membership Checks:**
```typescript
expect(annScore).toBeGreaterThan(0.9);
expect(score).toBeGreaterThan(0);
expect(score).toBeLessThanOrEqual(1);
expect(counts.every((value) => Number.isFinite(value))).toBe(true);
```

**No `.skip` or `.only`** usage detected — all tests are currently active.

---

*Testing analysis: 2026-06-25*
