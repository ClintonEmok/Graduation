# Testing Patterns

**Analysis Date:** 2026-06-25

## Test Framework

**Runner:**
- **Vitest** 4.1.9
- Config: `vitest.config.mts` (project root)

**Assertions:** Built-in Vitest assertions (`expect`, `.toBe()`, `.toEqual()`, etc.)

**Run Commands:**
```bash
pnpm test              # Run all tests
pnpm test -- --watch   # Watch mode
pnpm test -- --coverage  # Coverage (no coverage config detected)
```

## Test Configuration

File: `vitest.config.mts`
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

**Key config points:**
- Default environment: **node** (NOT jsdom)
- Test file pattern: `src/**/*.test.ts` and `src/**/*.test.tsx`
- Path alias `@/` resolved to `./src/`
- jsdom available as devDependency but only used via `@vitest-environment jsdom` directive on specific files

## Test File Organization

**Location:** Co-located with source files (NOT in a separate `__tests__/` directory)
```
src/lib/slice-utils.ts         # source
src/lib/slice-utils.test.ts    # test (same directory)

src/store/useCoordinationStore.ts      # source
src/store/useCoordinationStore.test.ts # test (same directory)

src/workers/adaptiveTime.worker.ts      # source
src/workers/adaptiveTime.worker.test.ts # test (same directory)

src/app/dashboard/page.tsx              # source
src/app/dashboard/page.shell.test.tsx   # test (same directory)

src/components/viz/CubeVisualization.tsx           # source
src/components/viz/CubeVisualization.phase13.test.ts # test (same directory)
```

**Naming:**
- Pure logic utilities: `*.test.ts` — `slice-utils.test.ts`, `date-normalization.test.ts`
- Component/Page tests: `*.test.tsx` — `SuggestionPanel.test.tsx`, `page.shell.test.tsx`
- Phase-specific tests: `*.phaseN.test.ts(x)` — `CubeVisualization.phase13.test.ts`
- Feature-specific tests: `*.feature.test.ts` — `DualTimeline.tick-rollout.test.ts`

## Test Import Patterns

Standard imports:
```typescript
import { describe, expect, test } from 'vitest';
// or
import { beforeEach, describe, expect, it, vi } from 'vitest';
```

Both `test` and `it` are used interchangeably across the codebase.

## Test Structure

**Pure logic tests (most common):**
```typescript
import { describe, expect, test } from 'vitest';
import { normalizeToPercent, denormalizeToEpoch } from './date-normalization';

describe('normalizeToPercent', () => {
  const minTime = 978307200;
  const maxTime = 1767571200;

  test('returns 0 for minTime', () => {
    expect(normalizeToPercent(minTime, minTime, maxTime)).toBe(0);
  });

  test('clamps negative values to 0', () => {
    expect(normalizeToPercent(minTime - 1000, minTime, maxTime)).toBe(0);
  });
});
```

**Store tests:**
```typescript
import { beforeEach, describe, expect, test } from 'vitest';
import { useCoordinationStore } from './useCoordinationStore';

beforeEach(() => {
  useCoordinationStore.setState({
    // reset to initial state
  });
});

describe('useCoordinationStore', () => {
  test('last interaction wins when committing from map after timeline', () => {
    const store = useCoordinationStore.getState();
    store.commitSelection(4, 'timeline');
    store.commitSelection(9, 'map');
    const state = useCoordinationStore.getState();
    expect(state.selectedIndex).toBe(9);
  });
});
```

**Hook tests (using react-test-renderer):**
```typescript
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrimeData } from '@/hooks/useCrimeData';

const HookProbe = ({ options, onUpdate }) => {
  const result = useCrimeData(options);
  useEffect(() => { onUpdate(result); }, [onUpdate, result]);
  return null;
};

// Custom harness that returns { renderAndWait, cleanup }
```

**Source contract tests (static analysis via readFileSync):**
```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard shell', () => {
  test('keeps the phase-1 overview shell composition', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).toMatch(/DashboardLayout/);
    expect(pageSource).toMatch(/MapVisualization/);
    expect(pageSource).toMatch(/CubeVisualization/);
  });

  test('does not include dashboard-demo rail chrome', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(pageSource).not.toMatch(/DashboardStkdePanel|DemoTimelinePanel/);
  });
});
```

**Worker tests (test the pure computation function directly):**
```typescript
import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from './adaptiveTime.worker';

// Test the exported pure function directly (not the worker wrapper)
describe('computeAdaptiveMaps', () => {
  test('returns finite uniform-events maps', () => {
    const timestamps = Float32Array.from([10, 10, 10, 20, 30, 40, 50]);
    const maps = computeAdaptiveMaps(timestamps, [0, 60], { binCount: 4, binningMode: 'uniform-events' });
    expect(maps.densityMap).toHaveLength(4);
  });
});
```

## Assertion Patterns

**Common matchers:**
- `toBe(value)` — primitive equality
- `toEqual(object)` — deep equality
- `toBe(true/false)` — boolean checks
- `toBeNull()` — null checks
- `toBeUndefined()` — undefined checks
- `toBeCloseTo(expected, precision)` — floating point
- `toBeGreaterThan(n)` / `toBeLessThan(n)` — numeric comparisons
- `toContain(substring)` — string contains
- `toMatch(regex)` — regex match on strings
- `toHaveLength(n)` — array length
- `not.toHaveBeenCalled()` / `toHaveBeenCalledTimes(n)` — mock call counts
- `not.toMatch(regex)` — negative regex match

**Parameterized tests:**
```typescript
test.each(['uniform-time', 'uniform-events'] as const)(
  'uses density-derived warp weights in %s mode',
  (binningMode) => {
    // test with each mode
  },
);
```

## Mocking

**Framework:** Built-in Vitest mocks (`vi.fn()`, `vi.mock()`, `vi.stubGlobal()`)

**Module mocking with vi.hoisted:**
```typescript
const { getDbMock, ensureSortedCrimesTableMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  ensureSortedCrimesTableMock: vi.fn(),
}));

vi.mock('./db', () => ({
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
  getDb: getDbMock,
}));
```

**Global stubs:**
```typescript
vi.stubGlobal('fetch', fetchMock);
vi.stubGlobal('localStorage', localStorageMock);
```

**Worker mocking:**
```typescript
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'Worker', { value: MockWorker, configurable: true });
});
```

**What to Mock:**
- External API calls (`fetch`)
- Database modules (`./db`)
- Browser APIs (`localStorage`, `Worker`)
- Store modules (using `vi.mock` with hoisted factories)

**What NOT to Mock:**
- Pure computation functions (test them directly)
- Utility functions (test them directly)
- Zustand stores (use `getState()`/`setState()` for direct state manipulation)

## Fixtures and Factories

**No dedicated `__fixtures__` directory.** Test data defined inline in test files.

**Factory function pattern:**
```typescript
function buildPackage(overrides?: Partial<AutoProposalSet>): AutoProposalSet {
  return {
    id: 'balanced',
    rank: 1,
    isRecommended: true,
    confidence: 88,
    score: { coverage: 90, relevance: 87, overlap: 92, continuity: 85, total: 88 },
    warp: { name: 'Balanced warp', emphasis: 'balanced', confidence: 86, intervals: [...] },
    intervals: { boundaries: [1705000000, 1710000000, 1715000000], method: 'peak', confidence: 81 },
    ...overrides,
  };
}
```

**Inline fixture data:**
```typescript
const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, ... },
  { timestamp: 1_700_011_000, type: 'THEFT', lat: 41.8805, lon: -87.631, ... },
];
```

- Underscores in numeric literals (`1_700_010_000`) for readability
- `satisfies` operator used for type narrowing on array literals: `many satisfies CrimeRecord[]`
- `Date.UTC()` used for constructing predictable timestamps in date-based tests

## Coverage

**Requirements:** None enforced (no coverage configuration in `vitest.config.mts`)

**View Coverage:**
```bash
pnpm test -- --coverage
```

## Test Types

**Unit Tests (dominant type — vast majority of 70+ test files):**
- Pure function tests (utilities, algorithms, computations)
- Store tests (state logic, actions, reducers)
- Worker computation tests (exported pure functions)
- Hook tests (using react-test-renderer harness)
- Source contract tests (static analysis via readFileSync + regex)

**Integration Tests (few):**
- API route handler tests in `src/app/api/*/route.test.ts`
- End-to-end store + query pipeline tests

**E2E Tests:**
- **Not used.** No Playwright, Cypress, or similar detected.

**Snapshot Tests:**
- **Not used.** No `toMatchSnapshot` or `toMatchInlineSnapshot` calls detected.

## Suite Organization Best Practices

- `describe` blocks for each function or component
- Multiple `describe` blocks per file for related groups
- Descriptive test names that read as sentences:
  - `'applies default 30-day buffering and forwards API meta fields'`
  - `'panel-local no-match preserves global selection and marks partial state'`
  - `'returns deterministic hotspot IDs and scores for identical input'`

## Environment Directives

- Default environment is `node` (from vitest config)
- Per-test environment overrides via `@vitest-environment` directive:

```typescript
/* @vitest-environment node */
```


## Common Patterns Reference

**Store state reset in beforeEach:**
```typescript
beforeEach(() => {
  useFilterStore.setState({
    selectedTypes: [],
    selectedDistricts: [],
    selectedTimeRange: null,
    presets: [],
    lastLoadedPresetId: null,
  });
});
```

**API mock with fetch stub:**
```typescript
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [...], meta: {...} }),
});
vi.stubGlobal('fetch', fetchMock);
```

**Timestamp-based test data:**
```typescript
const domainStart = Date.UTC(2001, 0, 1, 1, 0, 0);
const domainEnd = Date.UTC(2001, 0, 1, 3, 0, 0);
```

**Float32Array test data:**
```typescript
const timestamps = Float32Array.from([0, 2, 4, 6, 8, 10]);
```

**TypedArray comparison helper:**
```typescript
const toArray = (values: Float32Array) => Array.from(values);
```

---

*Testing analysis: 2026-06-25*
