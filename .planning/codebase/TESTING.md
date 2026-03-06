# Testing Patterns

**Analysis Date:** 2026-03-06

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
- `*.test.ts` and `*.test.tsx` (configured include: `src/**/*.test.ts`, `src/**/*.test.tsx`).

**Structure:**
```
src/
├── lib/*.test.ts              # Algorithm and utility tests
├── store/*.test.ts            # Store state transition tests
├── app/
│   ├── timeline-test/
│   │   └── lib/*.test.ts      # Route-specific logic tests
│   └── timeslicing/
│       └── *.test.tsx         # Component/acceptance tests
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
- Algorithm tests validate output shape and behavior (`src/lib/full-auto-orchestrator.test.ts`).
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
- Algorithm modules (`full-auto-orchestrator`, `warp-generation`) - test actual behavior.

## Fixtures and Factories

**Test Data:**
- Inline literal objects/arrays are the dominant pattern.
- Factory helper functions for creating test records (e.g., `buildCrime()` in `src/lib/full-auto-orchestrator.test.ts`).

**Location:**
- No centralized fixture directory detected.
- Factory functions defined at top of test files when reused within same file.

## Coverage

**Requirements:** None enforced in repo configuration.

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Core coverage area today: utility functions, store actions, and algorithm modules.
- Files: `src/lib/*.test.ts`, `src/store/*.test.ts`, `src/app/timeline-test/lib/*.test.ts`.

**Integration Tests:**
- Minimal; `src/lib/crime-api.test.ts` mostly validates local utility assumptions and mock behavior, not full API route execution.
- New: `src/app/timeslicing/page.full-auto-acceptance.test.tsx` tests acceptance flow.

**E2E Tests:**
- Not used.

## Common Patterns

**Algorithm Testing:**
```typescript
test('returns top 3 ranked package-complete sets with recommendation marker', () => {
  const result = generateRankedAutoProposalSets({ crimes, context, params });
  expect(result.sets.length).toBe(3);
  expect(result.recommendedId).toBe(result.sets[0].id);
  expect(result.sets[0].isRecommended).toBe(true);
});
```

**Deterministic Output Testing:**
```typescript
test('keeps deterministic ordering for same input', () => {
  const first = generateRankedAutoProposalSets({ ... });
  const second = generateRankedAutoProposalSets({ ... });
  expect(first.sets.map(s => `${s.rank}:${s.id}:${s.score.total}`))
    .toEqual(second.sets.map(s => `${s.rank}:${s.id}:${s.score.total}`));
});
```

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
- No component interaction tests for `src/components/timeline/DualTimeline.tsx` or `/timeslicing` page orchestration.
- Integration tests for full-auto acceptance flow are minimal.

---

*Testing analysis: 2026-03-06*
