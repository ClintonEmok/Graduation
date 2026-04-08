# Crime Data Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest (configured in `vitest.config.mts`)
- Environment: `node`
- Includes: `src/**/*.test.ts`, `src/**/*.test.tsx`
- Path alias: `@` → `./src`

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`, `test`)

**Run Commands:**
```bash
npx vitest                    # Watch mode
npx vitest run                # Single run
npx vitest run --reporter=verbose  # Verbose output
```

## Test File Organization

**Pattern:** Co-located — test files live next to their source files.

```
src/
├── lib/
│   ├── queries.ts
│   ├── queries.test.ts
│   ├── crime-api.test.ts
│   ├── db.ts
│   ├── db.test.ts
│   └── stkde/
│       ├── compute.ts
│       ├── compute.test.ts
│       ├── full-population-pipeline.ts
│       └── full-population-pipeline.test.ts
├── app/api/
│   ├── crimes/range/
│   │   ├── route.ts
│   │   └── route.test.ts
│   └── stkde/hotspots/
│       ├── route.ts
│       └── route.test.ts
├── store/
│   ├── useStkdeStore.ts
│   └── useStkdeStore.test.ts
└── workers/
    ├── stkdeHotspot.worker.ts
    └── stkdeHotspot.worker.test.ts
```

**Naming:** `{filename}.test.ts` — always `.test.ts` suffix, never `.spec.ts`.

## Mocking Patterns

**vi.hoisted + vi.mock pattern** (used in API route tests):
```typescript
const { queryCrimesInRangeMock, isMockDataEnabledMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));

// Then reset in beforeEach:
beforeEach(() => {
  queryCrimesInRangeMock.mockReset();
  isMockDataEnabledMock.mockReset();
  isMockDataEnabledMock.mockReturnValue(false);
});
```

**vi.importActual partial mock** (used in `crime-api.test.ts`):
```typescript
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn().mockRejectedValue(new Error('DuckDB not available in tests')),
  };
});
```

**Request construction** (API route tests):
```typescript
const makeRequest = (query: string) => new Request(`http://localhost/api/crimes/range?${query}`);

// For POST:
const request = new Request('http://localhost/api/stkde/hotspots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**Global fetch mock** (hook tests):
```typescript
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [...], meta: {...} }),
});
vi.stubGlobal('fetch', fetchMock);
```

## Test Structure

**Suite pattern:**
```typescript
describe('Feature Area', () => {
  beforeEach(() => {
    // Reset mocks, restore state
  });

  it('specific behavior description', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

**Assertion patterns:**
```typescript
// Response contract
expect(response.status).toBe(200);
await expect(response.json()).resolves.toMatchObject({
  error: expect.stringContaining('required'),
});

// Mock call verification
expect(queryCrimesInRangeMock).toHaveBeenCalledWith(
  expect.any(Number),
  expect.any(Number),
  expect.objectContaining({ limit: 10, crimeTypes: ['THEFT', 'BATTERY'] }),
);

// Coordinate parity
const expected = lonLatToNormalized(record.lon, record.lat);
expect(record.x).toBeCloseTo(expected.x, 6);
expect(record.z).toBeCloseTo(expected.z, 6);

// Array length
expect(records).toHaveLength(5);
expect(body.hotspots.length).toBeGreaterThan(0);

// Hotspot shape
expect(body.hotspots[0]).toMatchObject({
  id: expect.any(String),
  centroidLng: expect.any(Number),
  centroidLat: expect.any(Number),
  intensityScore: expect.any(Number),
  supportCount: expect.any(Number),
  peakStartEpochSec: expect.any(Number),
  peakEndEpochSec: expect.any(Number),
  radiusMeters: expect.any(Number),
});
```

## What Gets Mocked

**Always mocked:**
- DuckDB (`getDb` → mock rejection or fake callback API)
- `isMockDataEnabled` → controlled per test
- `fetch` global → for hook tests

**Never mocked:**
- Coordinate normalization functions (tested directly)
- Query builders (tested directly with assertions on SQL/params)
- STKDE compute functions (tested with real CrimeRecord arrays)

## Test Categories

**Pure logic tests** (no I/O):
- `src/lib/crime-api.test.ts` — mock generation, coordinate math, date parsing
- `src/lib/queries.test.ts` — SQL builder output, parameterization, facade exports
- `src/lib/stkde/compute.test.ts` — deterministic hotspot computation

**API route tests** (request → response):
- `src/app/api/crimes/range/route.test.ts` — parameter validation, buffer metadata, mock parity
- `src/app/api/stkde/hotspots/route.test.ts` — validation, compute mode selection, fallback behavior

**Hook tests** (React + fetch):
- `src/hooks/useCrimeData.test.ts` — uses `react-test-renderer`, `QueryClientProvider`, fetch mocking

**Store tests** (Zustand):
- `src/store/useStkdeStore.test.ts` — state transitions, param clamping

**Worker tests** (Web Worker logic):
- `src/workers/stkdeHotspot.worker.test.ts` — filtering, sorting, projection

## Coverage

**No explicit coverage threshold** is configured in `vitest.config.mts`.

**View coverage:**
```bash
npx vitest run --coverage
```

## Common Test Patterns for Crime Data

**Creating test crime records:**
```typescript
const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_010_000, type: 'THEFT', lat: 41.88, lon: -87.63, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  { timestamp: 1_700_011_000, type: 'BATTERY', lat: 41.8795, lon: -87.632, x: 0, z: 0, district: '1', year: 2023, iucr: '0460' },
];
```

**Testing coordinate normalization parity:**
```typescript
for (const record of records) {
  const normalized = lonLatToNormalized(record.lon, record.lat);
  expect(record.x).toBeCloseTo(normalized.x, 6);
  expect(record.z).toBeCloseTo(normalized.z, 6);
}
```

**Testing API parameter validation:**
```typescript
it('validates required parameters', async () => {
  const response = await GET(makeRequest('startEpoch=1000'));
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringContaining('startEpoch and endEpoch'),
  });
});
```

**Testing STKDE determinism:**
```typescript
test('returns deterministic hotspot IDs and scores for identical input', () => {
  const run1 = computeStkdeFromCrimes(request, baseCrimes).response;
  const run2 = computeStkdeFromCrimes(request, baseCrimes).response;
  expect(run1.hotspots.map(h => h.id)).toEqual(run2.hotspots.map(h => h.id));
  expect(run1.hotspots.map(h => h.intensityScore)).toEqual(run2.hotspots.map(h => h.intensityScore));
});
```

---

*Testing analysis: 2026-03-30*
