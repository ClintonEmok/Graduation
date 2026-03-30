# Testing Patterns - Timeline & Visualization

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:** Vitest 4.0.18
- Config: `vitest.config.ts` (if present) or default
- Command: `npm test`

**Assertion:** Vitest built-in `expect`

**Mocking:** Manual mocks, no external mocking library

## Test File Organization

**Location:** Co-located with source files
- `src/components/timeline/hooks/useScaleTransforms.test.ts`
- `src/components/timeline/lib/interaction-guards.test.ts`
- `src/components/timeline/lib/tick-ux.test.ts`

**Naming:** `*.test.ts` (not `*.spec.ts`)

## Test Patterns

### 1. Unit Testing Pure Functions

**Pattern:** Test exported utility functions directly
```typescript
import { toDisplaySeconds, toLinearSeconds } from '@/components/timeline/hooks/useScaleTransforms';

describe('useScaleTransforms', () => {
  const warpDomain: [number, number] = [0, 100];
  const shiftedWarpMap = new Float32Array([0, 35, 60, 85, 100]);

  it('keeps display seconds linear when warp factor is zero', () => {
    const linearSec = 42;
    const displaySec = toDisplaySeconds(linearSec, 0, shiftedWarpMap, warpDomain);
    expect(displaySec).toBe(linearSec);
  });

  it('follows warp map interpolation when warp factor is one', () => {
    const displaySec = toDisplaySeconds(25, 1, shiftedWarpMap, warpDomain);
    expect(displaySec).toBeCloseTo(35, 6);
  });
});
```

### 2. Interaction Guard Tests

**Pattern:** Test defensive utilities with edge cases
```typescript
import { clampToRange, computeRangeUpdate } from '@/components/timeline/lib/interaction-guards';

describe('interaction-guards', () => {
  describe('range normalization and clamping', () => {
    it('clamps non-finite values defensively', () => {
      expect(clampToRange(Number.NaN, 10, 20)).toBe(10);
      expect(clampToRange(Number.POSITIVE_INFINITY, 10, 20)).toBe(20);
    });

    it('handles reversed inputs while preserving safeStart/safeEnd semantics', () => {
      const result = computeRangeUpdate(900, 100, 0, 1000);
      expect(result.normalizedRange[0]).toBeLessThan(result.normalizedRange[1]);
    });
  });
});
```

### 3. Tick UX Tests

**Pattern:** Test deterministic behavior with fixtures
```typescript
import { buildSpanAwareTicks, formatSpanAwareTickLabel, resolveTickUnitByVisibleSpan } from './tick-ux';

describe('tick-ux', () => {
  describe('resolveTickUnitByVisibleSpan', () => {
    it('uses minute ticks for sub-day ranges', () => {
      const spec = resolveTickUnitByVisibleSpan({
        rangeStartSec: Date.UTC(2026, 0, 1, 0, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1, 6, 0, 0) / 1000,
        axisWidth: 660,
      });
      expect(spec.unit).toBe('minute');
    });
  });

  describe('formatSpanAwareTickLabel', () => {
    it('keeps time for sub-day labels', () => {
      const label = formatSpanAwareTickLabel(new Date(Date.UTC(2026, 0, 1, 9, 30, 0)), {
        rangeStartSec: Date.UTC(2026, 0, 1, 0, 0, 0) / 1000,
        rangeEndSec: Date.UTC(2026, 0, 1, 6, 0, 0) / 1000,
        axisWidth: 660,
      });
      expect(label).toBe('Jan 1, 9:30 AM');
    });
  });
});
```

### 4. Source File Wiring Tests

**Pattern:** Verify components are wired to shared utilities
```typescript
import { readFileSync } from 'node:fs';

describe('DualTimeline tick rollout wiring', () => {
  it('keeps DualTimeline wired to the shared span-aware tick helper', () => {
    const source = readFileSync(new URL('./DualTimeline.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/tickLabelStrategy\?: TickLabelStrategy/);
    expect(source).toMatch(/buildSpanAwareTicks/);
  });
});
```

## Test Data Patterns

### Float32Array Fixtures
```typescript
const identityWarpMap = new Float32Array([0, 25, 50, 75, 100]);
const shiftedWarpMap = new Float32Array([0, 35, 60, 85, 100]);
```

### Date Fixtures
```typescript
// UTC dates for consistent testing
Date.UTC(2026, 0, 1, 0, 0, 0) / 1000  // Unix timestamp in seconds
```

### Range Fixtures
```typescript
const domain: [number, number] = [0, 100];
const detailRangeSec: [number, number] = [50, 80];
```

## What to Test

### Should Test (Current Coverage)
- Pure utility functions
- Scale transformations (warp mapping)
- Range clamping/normalization
- Tick label formatting logic
- Component-to-utility wiring

### Should Add (Gaps)
- React component rendering (DualTimeline, DensityHeatStrip)
- Integration with Zustand stores
- User interactions (brush, zoom, point selection)
- Accessibility attributes
- Loading/empty states

## Running Tests

```bash
# Run all timeline tests
npm test -- --run src/components/timeline

# Run with coverage
npm test -- --coverage

# Watch mode
npm test
```

---

*Testing analysis: 2026-03-30*
