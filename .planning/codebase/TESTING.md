# Testing Patterns

**Analysis Date:** 2026-04-08

## Test Framework

**Runner:**
- Vitest (`vitest` in `package.json`)
- Config: `vitest.config.mts`

**Assertion Library:**
- Vitest `expect`

**Run Commands:**
```bash
npm test            # Run all tests
npm test -- --watch # Watch mode
```

## Test File Organization

**Location:**
- Tests are co-located beside source files rather than kept in a separate root test directory (`src/lib/queries.test.ts`, `src/components/timeline/hooks/useBrushZoomSync.test.ts`).

**Naming:**
- Use `.test.ts` for logic and server tests, `.test.tsx` for React/component tests, and special intent suffixes when needed (`.stkde.test.ts`, `.timeline-qa.test.ts`).

**Structure:**
```text
src/
  app/.../page.test.tsx
  app/api/.../route.test.ts
  components/.../*.test.tsx
  lib/**/*.test.ts
  store/*.test.ts
  workers/*.test.ts
```

## Test Structure

**Suite Organization:**
```ts
describe('useCrimeData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup?.();
  });

  it('applies default buffering', async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Group by behavior or contract, not by implementation detail (`src/lib/queries.test.ts`, `src/app/api/crimes/range/route.test.ts`).
- Use `beforeEach` to reset store state and mocks (`src/store/useCoordinationStore.test.ts`, `src/store/useFilterStore.test.ts`).
- Prefer small, explicit test names that describe the contract being verified.

## Mocking

**Framework:**
- `vi.mock`, `vi.fn`, `vi.hoisted`, `vi.stubGlobal`

**Patterns:**
```ts
const { queryCrimesInRangeMock } = vi.hoisted(() => ({
  queryCrimesInRangeMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRange: queryCrimesInRangeMock,
}));
```

- Use `vi.hoisted` when a mock must exist before module import (`src/lib/queries.test.ts`, `src/app/api/crimes/range/route.test.ts`).
- Stub browser APIs directly when running in Node (`fetch` in `src/hooks/useCrimeData.test.ts`, `localStorage` in `src/store/useFilterStore.test.ts`).
- For large shell/route tests, mock leaf components and stores instead of rendering the full dependency graph (`src/app/dashboard-v2/page.stkde.test.ts`).

**What to Mock:**
- Network calls, database adapters, store singletons, and third-party UI primitives.

**What NOT to Mock:**
- Pure helpers, data transformations, and contract-level outputs (`src/lib/slice-utils.test.ts`, `src/lib/db.test.ts`).

## Fixtures and Factories

**Test Data:**
```ts
const hotspots = [
  { id: 'a', centroidLng: -87.63, centroidLat: 41.88, intensityScore: 0.91, supportCount: 22, ... },
];
```

**Location:**
- Inline fixtures are common inside each test file (`src/workers/stkdeHotspot.worker.test.ts`, `src/components/timeline/hooks/useBrushZoomSync.test.ts`).
- Build small local harnesses when React state or async rendering is involved (`src/hooks/useCrimeData.test.ts`).

## Coverage

**Requirements:**
- No coverage threshold or coverage script is configured in `package.json`.

**View Coverage:**
```bash
Not configured in repository scripts
```

## Test Types

**Unit Tests:**
- Most tests are unit-style contracts around helpers, stores, and pure transforms (`src/lib/queries.test.ts`, `src/lib/coordinate-normalization.test.ts`).

**Integration Tests:**
- Route and hook tests validate request/response shape and query wiring with targeted mocks (`src/app/api/crimes/range/route.test.ts`, `src/hooks/useCrimeData.test.ts`).

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
```ts
await expect(queryCrimeCount(...)).resolves.toBe(42);
```

**Error Testing:**
```ts
await expect(response.json()).resolves.toMatchObject({
  error: expect.stringContaining('startEpoch and endEpoch'),
});
```

**React/Hook Testing:**
- Use `react-test-renderer` + `act` for hooks that depend on providers or state transitions (`src/hooks/useCrimeData.test.ts`).
- Set `IS_REACT_ACT_ENVIRONMENT` in renderer-driven component tests when needed (`src/app/dashboard-v2/page.stkde.test.ts`).

**Environment Overrides:**
- File-level `/* @vitest-environment node */` is used where Node-only behavior is required (`src/store/useFilterStore.test.ts`).

---

*Testing analysis: 2026-04-08*
