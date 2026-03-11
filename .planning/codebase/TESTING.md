# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Runner:**
- Vitest 4 (`vitest`)
- Config: `vitest.config.mts`

**Assertion Library:**
- Vitest built-in `expect` + matchers (`describe`, `it`, `test`, `vi`)

**Run Commands:**
```bash
npm run test             # Run tests (watch by default in Vitest CLI)
npx vitest --watch       # Explicit watch mode
npx vitest --coverage    # Coverage report (not wired as npm script)
```

## Test File Organization

**Location:**
- Co-located with implementation under `src/` (for example `src/hooks/useCrimeData.test.ts`, `src/app/api/crimes/range/route.test.ts`)

**Naming:**
- `*.test.ts` and `*.test.tsx`

**Structure:**
```
src/
  <feature>/
    module.ts
    module.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('module/behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates contract', async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Setup pattern: reset mocks with `vi.restoreAllMocks()` + `mockReset()` in `beforeEach`
- Teardown pattern: explicit cleanup callbacks for rendered hook harnesses in `afterEach` (`src/hooks/useCrimeData.test.ts`)
- Assertion pattern: contract-focused checks for status codes, response shape, and parameter forwarding

## Mocking

**Framework:** Vitest mocking (`vi.mock`, `vi.hoisted`, `vi.fn`, `vi.stubGlobal`)

**Patterns:**
```typescript
const { dependencyMock } = vi.hoisted(() => ({ dependencyMock: vi.fn() }));

vi.mock('@/lib/dependency', () => ({
  dependency: dependencyMock,
}));
```

**What to Mock:**
- DB/query dependencies for API tests (`src/app/api/crimes/range/route.test.ts`)
- Browser globals/fetch for hook tests (`src/hooks/useCrimeData.test.ts`)
- Worker/side-effect boundaries for store logic tests (`src/store/useAdaptiveStore.test.ts`)

**What NOT to Mock:**
- Pure computation helpers; test these directly (for example timeline hook helper tests and query builder tests in `src/lib/queries.test.ts`)

## Fixtures and Factories

**Test Data:**
```typescript
const makeRequest = (query: string) =>
  new Request(`http://localhost/api/crimes/range?${query}`);
```

**Location:**
- Inline fixture objects are preferred per test file; no centralized fixtures directory detected

## Coverage

**Requirements:** None enforced in config

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Dominant test style; pure utility/store/hook logic coverage (`src/lib/*.test.ts`, `src/components/timeline/hooks/*.test.ts`)

**Integration Tests:**
- API route handler tests with mocked dependencies (`src/app/api/crimes/range/route.test.ts`)

**E2E Tests:**
- Not used (no Playwright/Cypress config detected)

## Common Patterns

**Async Testing:**
```typescript
const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000'));
expect(response.status).toBe(200);
await expect(response.json()).resolves.toMatchObject({ meta: expect.any(Object) });
```

**Error Testing:**
```typescript
const result = await harness.renderAndWait({ startEpoch: 1, endEpoch: 2 });
expect(result.error?.message).toContain('HTTP error');
```

---

*Testing analysis: 2026-03-11*
