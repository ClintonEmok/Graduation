# Data Layer Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest v4.0.18
- Config: `vitest.config.mts`
- Environment: node

**Testing Libraries:**
- react-test-renderer v19.2.0 - For hook testing
- vitest - Test runner and assertions

## Test File Organization

**Location:**
- Co-located with source files
- Pattern: `*.test.ts` or `*.test.tsx`

**Examples:**
- `src/hooks/useCrimeData.test.ts`
- `src/hooks/useCrimeData.test.ts`

## Test Structure

### Hook Testing Pattern

Located at `src/hooks/useCrimeData.test.ts`:

```typescript
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';
import { useCrimeData } from '@/hooks/useCrimeData';

type UpdateHandler = (result: UseCrimeDataResult) => void;

const HookProbe = ({ options, onUpdate }: { options: UseCrimeDataOptions; onUpdate: UpdateHandler }) => {
  const result = useCrimeData(options);
  useEffect(() => {
    onUpdate(result);
  }, [onUpdate, result]);
  return null;
};

const createRenderer = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // ... renderer setup

  const renderAndWait = async (options: UseCrimeDataOptions): Promise<UseCrimeDataResult> => {
    // ... render and wait for settled state
  };

  return { renderAndWait, cleanup };
};
```

### Test Suite Pattern

```typescript
describe('useCrimeData', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup?.();
    cleanup = null;
  });

  it('applies default 30-day buffering and forwards API meta fields', async () => {
    const harness = createRenderer();
    cleanup = harness.cleanup;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [...],
        meta: {...}
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const result = await harness.renderAndWait({...});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // ... assertions
  });
});
```

## Mocking Patterns

### Fetch Mocking

```typescript
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    data: [...],
    meta: {...}
  }),
});
vi.stubGlobal('fetch', fetchMock);
```

### Error Mocking

```typescript
// HTTP error
const fetchMock = vi.fn().mockResolvedValue({
  ok: false,
  status: 500,
  json: async () => ({ error: 'boom' }),
});

// Network error
const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
```

## Test Scenarios

### Buffering

```typescript
it('applies default 30-day buffering', async () => {
  const result = await harness.renderAndWait({
    startEpoch: 978307200,
    endEpoch: 978393600,
  });
  expect(String(fetchMock.mock.calls[0][0])).toContain('bufferDays=30');
  expect(result.bufferedRange).toEqual({ start: 975715200, end: 980985600 });
});
```

### Filters

```typescript
it('passes crimeTypes and districts filters', async () => {
  const result = await harness.renderAndWait({
    crimeTypes: ['THEFT', 'BATTERY'],
    districts: ['1', '2'],
  });
  expect(calledUrl).toContain('crimeTypes=THEFT%2CBATTERY');
  expect(calledUrl).toContain('districts=1%2C2');
});
```

### Query Key Stability

```typescript
it('keeps query key stable and avoids refetch on equivalent rerender', async () => {
  const options = { startEpoch: 1000, endEpoch: 2000, ... };
  await harness.renderAndWait(options);
  await harness.renderAndWait({ ...options }); // Same options
  expect(fetchMock).toHaveBeenCalledTimes(1); // No additional fetch
});
```

### Error Handling

```typescript
it('propagates API failures through query error state', async () => {
  const result = await harness.renderAndWait({...});
  expect(result.error).toBeTruthy();
  expect(result.error?.message).toContain('HTTP error: 500');
  expect(result.data).toEqual([]);
});
```

### Invalid Input

```typescript
it('skips fetch when epoch range is invalid', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  
  const result = await harness.renderAndWait({
    startEpoch: 5000,
    endEpoch: 5000, // Same as start = invalid
  });
  
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.data).toEqual([]);
});
```

## Assertion Patterns

### URL Assertions

```typescript
expect(String(fetchMock.mock.calls[0][0])).toContain('key=value');
```

### Data Assertions

```typescript
expect(result.data).toHaveLength(1);
expect(result.bufferedRange).toEqual({ start: x, end: y });
```

### Error Assertions

```typescript
expect(result.error).toBeTruthy();
expect(result.error?.message).toContain('substring');
```

### Metadata Assertions

```typescript
expect(result.meta?.buffer?.days).toBe(30);
expect(result.meta?.sampled).toBe(true);
```

## Run Commands

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
```

## Coverage Gaps

**Untested:**
- Streaming hooks (`useCrimeStream`)
- Stats hooks (`useSliceStats`)
- Suggestion generation hooks
- API route handlers (unit tests)
- Database query functions

**Priority:** Add tests for data layer critical paths

---

*Testing analysis: 2026-03-30*
