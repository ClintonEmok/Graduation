# Testing Patterns

**Analysis Date:** 2026-04-08

## Test Framework

**Runner:**
- Vitest 4.0.18 - Configured in `vitest.config.mts`
- Environment: `node` (configured in vitest.config.mts)
- Includes: jsdom for DOM testing

**Configuration:**
```typescript
// vitest.config.mts
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

**Run Commands:**
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

## Test File Organization

**Location:**
- Co-located with source files
- Same directory as implementation
- Naming: `*.test.ts` for TypeScript files, `*.test.tsx` for React components

**Examples:**
- `src/lib/slice-utils.test.ts`
- `src/lib/binning/engine.test.ts`
- `src/store/useSliceStore.test.ts`
- `src/app/timeslicing/components/SuggestionPanel.test.tsx`
- `src/components/timeline/DualTimeline.tick-rollout.test.ts`

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test } from 'vitest';

describe('suite name', () => {
  test('test description', () => {
    // Arrange
    const input = value;
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

**Describe Block Naming:**
- Use descriptive business names: `'slice store actions'`, `'context diagnostics engine'`
- Feature-focused: `'generateBins interval strategies'`
- Scenario-based: `'manual rerun lifecycle invariants'`

## Assertion Patterns

**Common Matchers:**
```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual({ key: 'value' });

// Truthiness
expect(value).not.toBeNull();
expect(value).toBeDefined();

// Array
expect(items).toHaveLength(3);
expect(items).toContain(expectedItem);

// Floating point (with tolerance)
expect(calculateRangeTolerance([20, 40])).toBeCloseTo(0.1);

// String
expect(text).toMatch(/regex pattern/);
expect(source).toMatch(/const \[comparisonExpanded/);

// Type guards and status checks
expect(temporal.status).toBe('available');
if (temporal.status !== 'available') {
  throw new Error('expected available temporal summary');
}
```

## Mocking Patterns

**ViMock for Internal Modules:**
```typescript
import { describe, expect, it, vi } from 'vitest';

describe('full-population-pipeline', () => {
  it('example with mocks', async () => {
    vi.mock('@/lib/db', () => ({
      getDb: vi.fn().mockResolvedValue({ all: mockAll }),
      ensureSortedCrimesTable: vi.fn().mockResolvedValue('crimes_sorted'),
    }));

    // Reset mocks between tests
    getDbMock.mockReset();
    ensureSortedCrimesTableMock.mockReset();
  });
});
```

**Mocking with Factory Functions:**
```typescript
vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  return {
    ...actual,
    getDb: vi.fn().mockRejectedValue(new Error('DuckDB not available')),
  };
});
```

**Mocking React Components (Integration Tests):**
```typescript
vi.mock('lucide-react', () => ({
  default: vi.fn(),
}));

vi.mock('@/components/timeline/DualTimeline', () => ({
  DualTimeline: vi.fn(() => null),
}));
```

**Mocking Zustand Stores:**
```typescript
vi.mock('@/store/useTimelineDataStore', () => ({
  useTimelineDataStore: vi.fn((selector) => {
    if (selector === undefined) {
      return mockStore;
    }
    return selector(mockStore);
  }),
}));
```

**Spy Pattern with Hoisting:**
```typescript
const setPanelSpy = vi.fn();
vi.mock('@/store/useLayoutStore', () => ({
  useLayoutStore: vi.fn(() => ({
    setPanel: setPanelSpy,
  })),
}));

// In beforeEach:
setPanelSpy.mockReset();
```

## Fixtures & Test Data

**Inline Factory Functions:**
```typescript
// Test data builder pattern
function buildPackage(overrides?: Partial<AutoProposalSet>): AutoProposalSet {
  return {
    id: 'balanced',
    rank: 1,
    isRecommended: true,
    confidence: 88,
    score: {
      coverage: 90,
      relevance: 87,
      overlap: 92,
      continuity: 85,
      total: 88,
    },
    // ... more defaults
    ...overrides,
  };
}

// Usage
const proposalSet = buildPackage({ confidence: 95 });
```

**Shared Mock Data:**
```typescript
// Located in src/lib/mockData.ts
export const generateMockData = (count: number): CrimeEvent[] => { ... };
```

**Inline Crime Record Fixtures:**
```typescript
const baseCrimes: CrimeRecord[] = [
  { timestamp: 1_700_000_100, type: 'THEFT', lat: 41.8801, lon: -87.6301, x: 0, z: 0, district: '1', year: 2023, iucr: '0820' },
  // ...
];
```

## Setup & Teardown

**beforeEach Pattern (Zustand Stores):**
```typescript
beforeEach(() => {
  useSliceStore.getState().clearSlices();
});
```

**Mock Reset Pattern:**
```typescript
beforeEach(() => {
  getDbMock.mockReset();
  ensureSortedCrimesTableMock.mockReset();
  isMockDataEnabledMock.mockReset();
});
```

## Special Test Patterns

**Snapshot-Style Source Inspection:**
```typescript
import { readFileSync } from 'node:fs';

test('keeps profile comparison collapsed by default', () => {
  const source = readFileSync(new URL('./SuggestionPanel.tsx', import.meta.url), 'utf8');
  
  expect(source).toMatch(/const \[comparisonExpanded, setComparisonExpanded\] = useState\(false\)/);
  expect(source).toMatch(/aria-expanded=\{comparisonExpanded\}/);
});
```

**Async Test with Promises:**
```typescript
test('returns byte-for-byte stable diagnostics for identical input', async () => {
  const input = { timestamps: baseCrimes.map((crime) => crime.timestamp), ... };
  
  const runOne = await buildContextDiagnostics(input);
  const runTwo = await buildContextDiagnostics(input);
  
  expect(JSON.stringify(runOne)).toBe(JSON.stringify(runTwo));
});
```

**State Machine / Lifecycle Testing:**
```typescript
test('manual rerun preserves status semantics', () => {
  let status: AutoRunStatus = 'idle';
  
  status = transitionAutoRunLifecycle(status, 'auto', 'start');
  expect(status).toBe('running');
  
  status = transitionAutoRunLifecycle(status, 'auto', 'success');
  expect(status).toBe('fresh');
  // ...
});
```

**Error Condition Testing:**
```typescript
test('mock fallback is used when DuckDB fails', async () => {
  const mockError = new Error('DuckDB not available');
  expect(mockError.message).toBe('DuckDB not available');
});
```

## Test Coverage

**Enforcement:** No explicit coverage threshold found

**Gaps Identified:**
- Many component tests are snapshot-style (source inspection) rather than rendered output tests
- Some integration tests mock heavily at boundaries

---

*Testing analysis: 2026-04-08*
