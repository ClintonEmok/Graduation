# Bin Generation Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest v4.0.18 - Test runner
- Configuration: `vitest.config.mts`

**Run Commands:**
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage (if configured)
```

**Test File Location:**
- Tests are co-located with source files using `.test.ts` or `.test.tsx` extension
- Included patterns: `src/**/*.test.ts`, `src/**/*.test.tsx`

## Test File Organization

**Location:**
- Tests live in same directory as the code they test
- Example: `src/lib/binning/engine.test.ts` tests `src/lib/binning/engine.ts`

**Naming:**
- `[module].test.ts` for unit tests
- `[module].test.tsx` for React component tests

## Key Test Files for Bin Generation

| File | Purpose |
|------|---------|
| `src/lib/binning/engine.test.ts` | Core bin generation strategies |
| `src/workers/adaptiveTime.worker.test.ts` | Adaptive time binning worker |
| `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.test.ts` | Bin diagnostics and labeling |
| `src/lib/adaptive/route-binning-mode.test.ts` | Route-to-binning-mode resolution |
| `src/app/timeslicing/page.binning-mode.test.ts` | Page-level binning mode integration |

## Test Structure Patterns

### Basic Bin Generation Test

```typescript
import { describe, expect, it } from 'vitest';
import { generateBins } from './engine';

describe('generateBins interval strategies', () => {
  it('uses fixed hourly boundaries instead of event-span boundaries', () => {
    const domainStart = Date.UTC(2001, 0, 1, 1, 0, 0);
    const domainEnd = Date.UTC(2001, 0, 1, 3, 0, 0);

    const result = generateBins(
      [
        { timestamp: Date.UTC(2001, 0, 1, 1, 5, 0), type: 'THEFT', district: '1' },
        { timestamp: Date.UTC(2001, 0, 1, 1, 45, 0), type: 'BATTERY', district: '1' },
        { timestamp: Date.UTC(2001, 0, 1, 2, 10, 0), type: 'ASSAULT', district: '2' },
      ],
      {
        strategy: 'hourly',
        constraints: {},
        domain: [domainStart, domainEnd],
      }
    );

    expect(result.bins).toHaveLength(2);
    expect(result.bins[0]?.startTime).toBe(domainStart);
    expect(result.bins[0]?.count).toBe(2);
  });
});
```

### Adaptive Maps Worker Test

```typescript
import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from './adaptiveTime.worker';

const toArray = (values: Float32Array) => Array.from(values);

describe('computeAdaptiveMaps', () => {
  test('defaults to uniform-time mode when binningMode is omitted', () => {
    const timestamps = Float32Array.from([0, 2, 4, 6, 8, 10]);
    const domain: [number, number] = [0, 10];

    const implicit = computeAdaptiveMaps(timestamps, domain, { binCount: 5, kernelWidth: 1 });
    const explicit = computeAdaptiveMaps(timestamps, domain, {
      binCount: 5,
      kernelWidth: 1,
      binningMode: 'uniform-time'
    });

    expect(toArray(implicit.densityMap)).toEqual(toArray(explicit.densityMap));
  });

  test.each(['uniform-time', 'uniform-events'] as const)(
    'uses density-derived warp weights in %s mode',
    (binningMode) => {
      // Test implementation
    },
  );
});
```

### Bin Diagnostics Test with Worker Integration

```typescript
import { describe, expect, test } from 'vitest';
import { computeAdaptiveMaps } from '@/workers/adaptiveTime.worker';
import { buildAdaptiveBinDiagnostics } from './adaptive-bin-diagnostics';

const toEpoch = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

describe('buildAdaptiveBinDiagnostics', () => {
  test('builds uniform-time rows with worker-aligned multipliers', () => {
    const timestamps = [0, 2, 4, 6, 8, 10];
    const domain: [number, number] = [0, 10];
    const maps = computeAdaptiveMaps(Float32Array.from(timestamps), domain, {
      binCount: 5,
      kernelWidth: 1,
      binningMode: 'uniform-time',
    });

    const rows = buildAdaptiveBinDiagnostics({
      selectedStrategy: 'uniform-time',
      domain,
      timestamps,
      countMap: maps.countMap,
      densityMap: maps.densityMap,
      warpMap: maps.warpMap,
    });

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.startSec)).toEqual([0, 2, 4, 6, 8]);
  });
});
```

## Test Data Patterns

### Inline Test Data

Tests create test data inline without shared fixtures:

```typescript
// Crime event data
const timestamps = [0, 2, 4, 6, 8, 10];

// Domain tuples
const domain: [number, number] = [0, 10];

// Crime events with type and district
const crimeEvents = [
  { timestamp: Date.UTC(2001, 0, 1, 1, 5, 0), type: 'THEFT', district: '1' },
  { timestamp: Date.UTC(2001, 0, 1, 1, 45, 0), type: 'BATTERY', district: '1' },
];
```

### Helper Functions

```typescript
// Epoch conversion helper
const toEpoch = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

// Float32Array to array for assertions
const toArray = (values: Float32Array) => Array.from(values);
```

## Mock Patterns

### Vi.fn() Mocks

```typescript
// Create spy functions
const togglePanelSpy: vi.fn<(panel: keyof Panels) => void>() = vi.fn();
const setGenerationInputsSpy: vi.fn() = vi.fn();

// Reset in beforeEach
togglePanelSpy.mockReset();
setGenerationInputsSpy.mockReset();
```

### Vi.mock() for Modules

```typescript
vi.mock('lucide-react', () => ({
  // mock implementation
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(),
}));
```

### Mock Return Values

```typescript
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ data: [] }),
});

const mockDb = {
  all: vi.fn((query: string, ...args: unknown[]) => {
    // implementation
  }),
};
```

## Assertion Patterns

### Basic Assertions

```typescript
expect(result.bins).toHaveLength(2);
expect(result.bins[0]?.startTime).toBe(domainStart);
expect(result.bins[0]?.count).toBe(2);
```

### Array Equality

```typescript
expect(rows.map((row) => row.startSec)).toEqual([0, 2, 4, 6, 8]);
expect(toArray(implicit.densityMap)).toEqual(toArray(explicit.densityMap));
```

### Finite Number Checks

```typescript
expect(toArray(maps.densityMap).every((value) => Number.isFinite(value))).toBe(true);
```

### Threshold Pinning

```typescript
expect(WEEKEND_HEAVY_THRESHOLD).toBe(0.6);
expect(BURST_PATTERN_RATIO).toBe(2.0);
```

### Source Code Matching

```typescript
const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
expect(pageSource).toMatch(/computeMaps\([\s\S]*?binningMode:\s*'uniform-events'/);
```

## Binning Strategies Tested

| Strategy | Test Coverage |
|----------|---------------|
| `hourly` | `engine.test.ts` - Fixed interval boundaries |
| `uniform-time` | `adaptiveTime.worker.test.ts`, `adaptive-bin-diagnostics.test.ts` |
| `uniform-events` | `adaptiveTime.worker.test.ts`, `adaptive-bin-diagnostics.test.ts` |
| `daytime-heavy` | `adaptive-bin-diagnostics.test.ts` - Threshold testing |
| `nighttime-heavy` | `adaptive-bin-diagnostics.test.ts` - Threshold testing |
| `weekday-weekend` | `adaptive-bin-diagnostics.test.ts` - Trait percentages |
| `burstiness` | `adaptive-bin-diagnostics.test.ts` - Burst pattern detection |
| `auto-adaptive` | `engine.ts` - Strategy selection based on data characteristics |

## Coverage Areas

### Unit Testing

- **Binning Engine** (`src/lib/binning/engine.ts`):
  - Strategy implementations (hourly, daily, uniform-time, etc.)
  - Bin creation from crime events
  - Constraint validation

- **Binning Rules** (`src/lib/binning/rules.ts`):
  - Constraint validation
  - Bin merging logic

### Integration Testing

- **Worker Integration** (`src/workers/adaptiveTime.worker.test.ts`):
  - computeAdaptiveMaps function with different binning modes
  - Warp map computation
  - Density and burstiness calculations

- **Diagnostics** (`src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.test.ts`):
  - Row building from worker outputs
  - Threshold-based labeling
  - Trait percentage calculations
  - Fallback map handling

### Route/Page Testing

- **Binning Mode Resolution** (`src/lib/adaptive/route-binning-mode.test.ts`):
  - Route to binning mode mapping
  - Default overrides

- **Page Integration** (`src/app/timeslicing/page.binning-mode.test.ts`):
  - Source code verification for correct binning mode usage

## Testing Patterns Summary

1. **Co-location**: Tests live next to the code they test
2. **Inline data**: No shared fixtures; test data created in each test
3. **Worker testing**: Direct function calls to worker modules with Float32Array inputs
4. **Threshold pinning**: Explicit assertions on threshold constants for stability
5. **Source verification**: Tests verify source code contains expected patterns
6. **Array helpers**: Helper functions for converting typed arrays for assertions

---

*Testing analysis: 2026-03-30*
