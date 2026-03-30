# STKDE Testing Patterns

**Analysis Date:** 2026-03-30

## Overview

This document covers testing patterns specific to the STKDE (Space-Time Kernel Density Estimation) domain in the neon-tiger codebase. STKDE tests focus on spatial-temporal hotspot detection, crime data processing, and aggregate computation pipelines.

## Test Framework

**Framework:** Vitest 4.0.18
**Configuration:** `vitest.config.mts`
- Environment: `node`
- Include: `src/**/*.test.ts`, `src/**/*.test.tsx`
- Path alias: `@/` resolves to `./src`

**Run Commands:**
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage (if configured)
```

## Test File Organization

### Location Pattern
STKDE-related tests are co-located with their source files using the `.test.ts` suffix:
- `src/lib/stkde/*.test.ts` - Core STKDE computation tests
- `src/store/*Stkde*.test.ts` - Store state management tests
- `src/workers/*stkde*.test.ts` - Web Worker tests

### Key Test Files

| File | Purpose |
|------|---------|
| `src/lib/stkde/compute.test.ts` | STKDE hotspot computation from crime data |
| `src/lib/stkde/full-population-pipeline.test.ts` | Full-population aggregate pipeline |
| `src/store/useStkdeStore.test.ts` | Zustand store state transitions |
| `src/workers/stkdeHotspot.worker.test.ts` | Hotspot projection/filtering |
| `src/lib/binning/engine.test.ts` | Time binning strategies |
| `src/hooks/useCrimeData.test.ts` | React Query crime data fetching |

## Test Structure Patterns

### Unit Test Pattern (Pure Functions)

```typescript
import { describe, expect, test } from 'vitest';
import { computeStkdeFromCrimes } from './compute';

describe('computeStkdeFromCrimes', () => {
  test('returns deterministic hotspot IDs and scores for identical input', () => {
    const run1 = computeStkdeFromCrimes(request, baseCrimes).response;
    const run2 = computeStkdeFromCrimes(request, baseCrimes).response;

    expect(run1.hotspots.map((hotspot) => hotspot.id))
      .toEqual(run2.hotspots.map((hotspot) => hotspot.id));
  });
});
```

### Store Test Pattern (Zustand)

```typescript
import { beforeEach, describe, expect, test } from 'vitest';
import { useStkdeStore } from './useStkdeStore';

beforeEach(() => {
  useStkdeStore.setState({
    scopeMode: 'applied-slices',
    params: { /* defaults */ },
    runStatus: 'idle',
    isStale: false,
    errorMessage: null,
    response: null,
  });
});

describe('useStkdeStore', () => {
  test('exposes Phase 65 defaults for scope and params', () => {
    const state = useStkdeStore.getState();
    expect(state.scopeMode).toBe('applied-slices');
  });

  test('tracks run lifecycle transitions', () => {
    const store = useStkdeStore.getState();
    store.startRun();
    expect(useStkdeStore.getState().runStatus).toBe('running');

    store.finishRunSuccess({ /* result */ });
    expect(useStkdeStore.getState().runStatus).toBe('success');
  });
});
```

### Worker Test Pattern

```typescript
import { describe, expect, test } from 'vitest';
import { projectHotspots } from './stkdeHotspot.worker';

const hotspots = [
  { id: 'a', centroidLng: -87.63, centroidLat: 41.88, intensityScore: 0.91, /* ... */ },
];

describe('projectHotspots', () => {
  test('filters and sorts hotspots for panel projection', () => {
    const output = projectHotspots({
      requestId: 7,
      hotspots,
      filters: { minIntensity: 0.5, minSupport: 10 },
    });

    expect(output.rows.map((row) => row.id)).toEqual(['a', 'c']);
  });
});
```

## Mock Patterns

### Database Mocking (vi.hoisted)

```typescript
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { getDbMock, ensureSortedCrimesTableMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  ensureSortedCrimesTableMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: getDbMock,
  ensureSortedCrimesTable: ensureSortedCrimesTableMock,
}));

describe('buildFullPopulationStkdeInputs', () => {
  beforeEach(() => {
    getDbMock.mockReset();
    ensureSortedCrimesTableMock.mockReset();
  });

  test('builds aggregate inputs from chunked SQL pages', async () => {
    const allMock = vi
      .fn()
      .mockImplementationOnce((_sql: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        callback(null, [{ count: 9 }]);
      })
      // Additional mock implementations for chained queries
      .mockImplementationOnce((_sql: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as (err: Error | null, rows: unknown[]) => void;
        callback(null, [{ row_idx: 1, col_idx: 1, bucket_start: 1700010000, bucket_count: 4 }]);
      });

    getDbMock.mockResolvedValue({ all: allMock });
    // Test assertions...
  });
});
```

### Global Worker Mocking

```typescript
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

describe('useAdaptiveStore computeMaps contract', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'Worker', {
      value: MockWorker,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'Worker', {
      value: originalWorker,
      configurable: true
    });
  });

  test('uses uniform-time as default binningMode', async () => {
    const workerInstances: MockWorker[] = [];
    class WorkerWithTracking extends MockWorker {
      constructor() {
        super();
        workerInstances.push(this);
      }
    }
    Object.defineProperty(globalThis, 'Worker', {
      value: WorkerWithTracking,
      configurable: true
    });

    const { useAdaptiveStore } = await import('./useAdaptiveStore');
    useAdaptiveStore.getState().computeMaps(Float32Array.from([1, 2, 3]), [0, 10]);

    expect(workerInstances[0].postMessage).toHaveBeenCalledTimes(1);
  });
});
```

### Fetch/Global Mocking

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useCrimeData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies default 30-day buffering', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ timestamp: 978307200, lat: 41.88, lon: -87.63, /* ... */ }],
        meta: { viewport: { start: 978307200, end: 978393600 }, buffer: { days: 30 } },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    // Test assertions...
  });
});
```

## Test Data Fixtures

### Mock Crime Data

```typescript
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
```

### Mock Hotspots

```typescript
const hotspots = [
  {
    id: 'a',
    centroidLng: -87.63,
    centroidLat: 41.88,
    intensityScore: 0.91,
    supportCount: 22,
    peakStartEpochSec: 1_700_010_000,
    peakEndEpochSec: 1_700_020_000,
    radiusMeters: 750,
  },
];
```

### Request Validation Helper

```typescript
const validation = validateAndNormalizeStkdeRequest({
  domain: { startEpochSec: 1_700_000_000, endEpochSec: 1_700_086_400 },
  filters: {},
  params: {
    spatialBandwidthMeters: 800,
    temporalBandwidthHours: 24,
    gridCellMeters: 500,
    topK: 5,
    minSupport: 1,
    timeWindowHours: 12,
  },
  limits: { maxEvents: 1000, maxGridCells: 4000 },
});

if (!validation.ok || !validation.request) {
  throw new Error('test setup failed');
}
```

## Coverage Areas

### Core STKDE Computation
- **Hotspot detection:** `src/lib/stkde/compute.test.ts`
- **Full-population pipeline:** `src/lib/stkde/full-population-pipeline.test.ts`
- **Hotspot projection:** `src/workers/stkdeHotspot.worker.test.ts`

### State Management
- **STKDE store:** `src/store/useStkdeStore.test.ts`
- **Adaptive store:** `src/store/useAdaptiveStore.test.ts`
- **Coordination store:** `src/store/useCoordinationStore.test.ts`

### Data Pipeline
- **Crime data hook:** `src/hooks/useCrimeData.test.ts`
- **Binning engine:** `src/lib/binning/engine.test.ts`
- **Full-auto orchestrator:** `src/lib/full-auto-orchestrator.test.ts`

### Time/Adaptive Features
- **Adaptive worker:** `src/workers/adaptiveTime.worker.test.ts`
- **Route binning mode:** `src/lib/adaptive/route-binning-mode.test.ts`
- **Adaptive scale:** `src/lib/adaptive-scale.test.ts`

## Common Testing Patterns

### Determinism Verification
Tests verify that identical inputs produce identical outputs:
```typescript
test('returns deterministic hotspot IDs and scores for identical input', () => {
  const run1 = computeStkdeFromCrimes(request, baseCrimes).response;
  const run2 = computeStkdeFromCrimes(request, baseCrimes).response;
  expect(run1.hotspots.map(h => h.id)).toEqual(run2.hotspots.map(h => h.id));
});
```

### State Transition Testing
Store tests verify all valid state transitions:
```typescript
test('tracks run lifecycle transitions', () => {
  store.startRun();
  expect(state.runStatus).toBe('running');
  store.finishRunSuccess(result);
  expect(state.runStatus).toBe('success');
  store.markStale('applied-slices-updated');
  expect(state.isStale).toBe(true);
});
```

### Parameter Validation/Clamping
```typescript
test('clamps params to supported bounds', () => {
  store.setParams({ spatialBandwidthMeters: -100, topK: 0 });
  const params = useStkdeStore.getState().params;
  expect(params.spatialBandwidthMeters).toBe(STKDE_PARAM_LIMITS.spatialBandwidthMeters.min);
  expect(params.topK).toBe(STKDE_PARAM_LIMITS.topK.min);
});
```

### Error Handling
```typescript
test('throws on invalid date', () => {
  expect(() => parseDate('not-a-date')).toThrow();
});
```

## Where to Add New STKDE Tests

1. **Co-located with source:** Add `.test.ts` file next to the source module
2. **Store tests:** Put in `src/store/` next to the store being tested
3. **Worker tests:** Put in `src/workers/` next to the worker file
4. **Component tests:** Put in the component's directory or `src/app/*/`

## Best Practices

1. **Use `beforeEach` for store reset** - Always reset store state in `beforeEach` to avoid test pollution
2. **Mock external dependencies** - Use `vi.mock()` for database, API calls, and workers
3. **Test determinism** - Include at least one test that verifies same input = same output
4. **Test edge cases** - Empty data, boundary values, truncation scenarios
5. **Use descriptive test names** - Focus on behavior, not implementation

---

*Testing analysis for STKDE domain: 2026-03-30*
