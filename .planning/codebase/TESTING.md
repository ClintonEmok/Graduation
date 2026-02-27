# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect` assertions

**Run Commands:**
```bash
npm test                 # Run tests once (vitest)
npx vitest --watch       # Watch mode
npx vitest --coverage    # Coverage report
```

## Test File Organization

**Location:**
- Co-located with source files under `src/**`.

**Naming:**
- `*.test.ts` only (configured include: `src/**/*.test.ts`).

**Structure:**
```
src/
├── lib/*.test.ts
├── store/*.test.ts
└── app/timeline-test/lib/*.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { beforeEach, describe, expect, test } from 'vitest';

describe('feature', () => {
  beforeEach(() => {
    // reset store state
  });

  test('behavior', () => {
    expect(...).toBe(...);
  });
});
```

**Patterns:**
- Store tests reset Zustand state in `beforeEach` using `setState`/store actions (`src/store/useSliceAdjustmentStore.test.ts`, `src/store/useSliceStore.test.ts`).
- Utility tests use deterministic input/output assertions (`src/lib/slice-utils.test.ts`, `src/lib/date-normalization.test.ts`).
- Node-only store tests use `/* @vitest-environment node */` when browser APIs are stubbed (`src/store/useFilterStore.test.ts`).

## Mocking

**Framework:**
- `vi.mock`, `vi.stubGlobal`, and mock function helpers.

**Patterns:**
```typescript
vi.stubGlobal('localStorage', localStorageMock);
vi.mock('./db', async () => ({ getDb: vi.fn().mockRejectedValue(new Error('...')) }));
```

**What to Mock:**
- Browser globals for node-environment tests (`localStorage`).
- Data access boundaries (`./db`) where native DuckDB is unavailable in tests.

**What NOT to Mock:**
- Pure utility logic (`slice-utils`, `date-normalization`) and store state transitions.

## Fixtures and Factories

**Test Data:**
- Inline literal objects/arrays are the dominant pattern.

**Location:**
- No centralized fixture directory detected.

## Coverage

**Requirements:** None enforced in repo configuration.

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Core coverage area today: utility functions and store actions.
- Files: `src/lib/*.test.ts`, `src/store/*.test.ts`.

**Integration Tests:**
- Minimal; `src/lib/crime-api.test.ts` mostly validates local utility assumptions and mock behavior, not full API route execution.

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
```typescript
test('mock fallback is used when DuckDB fails', async () => {
  const err = new Error('DuckDB not available');
  expect(err.message).toBe('DuckDB not available');
});
```

**Error Testing:**
```typescript
expect(() => parseDate('not-a-date')).toThrow();
```

## Current Gaps (high-impact)

- No tests for `src/hooks/useCrimeData.ts` and no contract tests for `/api/crimes/range` in `src/app/api/crimes/range/route.ts`.
- No tests for suggestion workflow (`src/hooks/useSuggestionGenerator.ts`, `src/store/useSuggestionStore.ts`, `src/lib/warp-generation.ts`, `src/lib/interval-detection.ts`).
- No component interaction tests for `src/components/timeline/DualTimeline.tsx` or `/timeslicing` page orchestration.

---

*Testing analysis: 2026-02-26*
