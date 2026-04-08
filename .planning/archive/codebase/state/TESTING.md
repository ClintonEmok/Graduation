# Store Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Test Runner:**
- **Vitest** v4.0.18
- Configuration: `vitest.config.mts`

**Run Commands:**
```bash
npm test                           # Run all tests
npm test -- --watch                # Watch mode
npm test -- --coverage             # With coverage
```

**Test File Pattern:**
- Location: Colocated with store (`src/store/useSliceStore.test.ts`)
- Glob: `src/**/*.test.ts`, `src/**/*.test.tsx`

## Test Structure

### Basic Store Test

```typescript
// src/store/useSliceStore.test.ts
import { beforeEach, describe, expect, test } from 'vitest';
import { useSliceStore } from './useSliceStore';

beforeEach(() => {
  useSliceStore.getState().clearSlices();
});

describe('slice store actions', () => {
  test('supports CRUD operations for point and range slices', () => {
    const store = useSliceStore.getState();
    
    expect(useSliceStore.getState().slices).toEqual([]);
    
    store.addSlice({ time: 50 });
    const slicesAfterAdd = useSliceStore.getState().slices;
    expect(slicesAfterAdd.length).toBe(1);
    expect(slicesAfterAdd[0].time).toBe(50);
  });
});
```

### State Reset Pattern

```typescript
// Reset to initial state before each test
beforeEach(() => {
  useStore.setState(initialState);
});

// Or call reset action if available
beforeEach(() => {
  useStore.getState().reset();
});
```

### Multiple Store Reset

```typescript
// When testing stores with cross-store dependencies
beforeEach(() => {
  useTimeslicingModeStore.setState({
    generationInputs: { ... },
    generationStatus: 'idle',
    pendingGeneratedBins: [],
  });
  useSliceDomainStore.getState().clearSlices();
});
```

## Testing Actions

### Testing Simple Actions

```typescript
test('sets theme correctly', () => {
  const store = useThemeStore.getState();
  
  store.setTheme('dark');
  
  expect(useThemeStore.getState().theme).toBe('dark');
});
```

### Testing Complex Actions

```typescript
test('creates burst slices with metadata', () => {
  const created = useSliceStore.getState().addBurstSlice({ start: 10, end: 30 });
  
  expect(created).not.toBeNull();
  expect(created?.type).toBe('range');
  expect(created?.range).toEqual([10, 30]);
  expect(created?.isBurst).toBe(true);
});
```

### Testing Conditional Logic

```typescript
test('reuses existing matching range slices within tolerance', () => {
  const first = useSliceStore.getState().addBurstSlice({ start: 20, end: 40 });
  const second = useSliceStore.getState().addBurstSlice({ start: 20.05, end: 40.05 });
  
  expect(first?.id).toBe(second?.id);
  expect(useSliceStore.getState().slices).toHaveLength(1);
});
```

### Testing Array Operations

```typescript
test('merge combines adjacent bins', () => {
  const store = useTimeslicingModeStore.getState();
  
  store.setPendingGeneratedBins([bin1, bin2, bin3], metadata);
  
  store.mergePendingGeneratedBins(['bin-1', 'bin-2']);
  
  const afterMerge = useTimeslicingModeStore.getState().pendingGeneratedBins;
  expect(afterMerge).toHaveLength(2);
});
```

## Testing Computed Values

```typescript
test('isTypeSelected returns correct values', () => {
  const store = useFilterStore.getState();
  
  // Empty = all selected
  expect(store.isTypeSelected(1)).toBe(true);
  
  // With selection
  store.setTypes([1, 2]);
  expect(store.isTypeSelected(1)).toBe(true);
  expect(store.isTypeSelected(3)).toBe(false);
});
```

## Testing Persistence

### Testing with LocalStorage

```typescript
// useFilterStore.ts uses custom localStorage persistence
const storage = window.localStorage;

test('presets persist to localStorage', () => {
  const store = useFilterStore.getState();
  
  store.savePreset('My Preset');
  
  const stored = JSON.parse(storage.getItem('crimeviz-presets') || '[]');
  expect(stored.length).toBe(1);
  expect(stored[0].name).toBe('My Preset');
});
```

## Testing Async Operations

### With setTimeout

```typescript
test('computeBins updates state asynchronously', async () => {
  const store = useBinningStore.getState();
  
  store.computeBins(mockData, [0, 100]);
  
  // Initial state
  expect(useBinningStore.getState().isComputing).toBe(true);
  
  // After async completes
  await vi.waitFor(() => {
    expect(useBinningStore.getState().isComputing).toBe(false);
    expect(useBinningStore.getState().bins.length).toBeGreaterThan(0);
  });
});
```

### Mocking Workers

```typescript
// useAdaptiveStore.test.ts
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

test('passes config to worker', async () => {
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
  
  useAdaptiveStore.getState().computeMaps(Float32Array.from([1, 2, 3]), [0, 10]);
  
  expect(workerInstances[0].postMessage).toHaveBeenCalledTimes(1);
});
```

## Testing Edge Cases

### Error Handling

```typescript
test('ignores invalid preset names', () => {
  const store = useFilterStore.getState();
  
  const result1 = store.savePreset('ab');  // Too short
  const result2 = store.savePreset('');    // Empty
  
  expect(result1).toBeNull();
  expect(result2).toBeNull();
  expect(useFilterStore.getState().presets).toHaveLength(0);
});
```

### Parameter Validation

```typescript
test('clamps params to supported bounds', () => {
  const store = useStkdeStore.getState();
  
  store.setParams({
    spatialBandwidthMeters: -100,
    topK: 0,
  });
  
  const params = useStkdeStore.getState().params;
  expect(params.spatialBandwidthMeters).toBe(STKDE_PARAM_LIMITS.spatialBandwidthMeters.min);
  expect(params.topK).toBe(STKDE_PARAM_LIMITS.topK.min);
});
```

### Null/Undefined Handling

```typescript
test('handles null time range', () => {
  const store = useFilterStore.getState();
  
  store.setTimeRange(null);
  
  expect(useFilterStore.getState().selectedTimeRange).toBeNull();
  expect(store.isTimeFiltered()).toBe(false);
});
```

## Testing React Integration

### Testing with useStore Hook

```typescript
// Not typical - prefer direct store testing
// But can test if needed:

import { renderHook, act } from '@testing-library/react';

test('hook subscribes to state changes', () => {
  const { result } = renderHook(() => useSliceStore((state) => state.slices));
  
  act(() => {
    useSliceStore.getState().addSlice({ time: 50 });
  });
  
  expect(result.current).toHaveLength(1);
});
```

## Test Organization

### Describe Blocks

```typescript
describe('slice store actions', () => {
  test('adds slice', () => { ... });
  test('removes slice', () => { ... });
  test('updates slice', () => { ... });
});

describe('burst slice', () => {
  test('creates with metadata', () => { ... });
  test('reuses matching', () => { ... });
  test('sorts correctly', () => { ... });
});
```

### Shared Setup

```typescript
// Common test data
const mockBins = [
  { id: 'bin-1', startTime: 0, endTime: 50, count: 12, crimeTypes: ['THEFT'], avgTimestamp: 25 },
  { id: 'bin-2', startTime: 50, endTime: 100, count: 8, crimeTypes: ['THEFT'], avgTimestamp: 75 },
];

// Reusable setup
const setupStoreWithBins = () => {
  useTimeslicingModeStore.getState().setPendingGeneratedBins(mockBins, metadata);
};
```

---

*Testing analysis: 2026-03-30*
