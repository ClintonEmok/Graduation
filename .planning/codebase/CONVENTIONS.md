# Coding Conventions

**Analysis Date:** 2026-04-08

## Language & Tooling

**Primary Language:**
- TypeScript 5.9.3 - Strict mode enabled in `tsconfig.json`

**UI Framework:**
- React 19.2.3 with Next.js 16.1.6
- Tailwind CSS v4 for styling

**Linting & Formatting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript strict mode: `"strict": true` in `tsconfig.json`

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `SuggestionPanel.tsx`, `DualTimeline.tsx`)
- Utilities/Hooks: `camelCase.ts` (e.g., `slice-utils.ts`, `date-normalization.ts`)
- Stores: `usePascalCaseStore.ts` (e.g., `useSliceStore.ts`, `useAdaptiveStore.ts`)
- Tests: `*.test.ts` or `*.test.tsx` suffix (e.g., `slice-utils.test.ts`)
- Workers: `*.worker.ts` suffix (e.g., `adaptiveTime.worker.ts`)

**Types & Interfaces:**
```typescript
// Interface names use PascalCase with descriptive names
interface ApplyRangeToStoresContractParams { ... }
interface TimelineSliceGeometry { ... }
type AdaptiveBinningMode = 'uniform-time' | 'uniform-events';
```

**Functions:**
- camelCase for regular functions: `normalizeToPercent()`, `generateBins()`
- camelCase for hooks: `useAutoBurstSlices()`, `useViewportCrimeData()`
- PascalCase for React components: `DualTimeline`, `SuggestionPanel`
- Factory helper functions: `buildPackage()` for test data builders

**Variables:**
- camelCase: `realTime`, `minTime`, `mapDomain`
- UPPER_SNAKE_CASE for constants: `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BATCH_SIZE`
- Descriptive names preferred over abbreviations

## Import Organization

**Order:**
1. React/Next.js imports (`react`, `next`)
2. Third-party library imports (d3-*, @visx/*, @radix-ui/*, etc.)
3. Internal imports (@/lib/*, @/store/*, @/components/*, @/hooks/*)
4. Type imports (`import type { ... }`)

**Path Alias:**
- `@/*` maps to `./src/*` - use consistently for internal imports
```typescript
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { normalizeToEpochSeconds } from '@/lib/time-domain';
import { DualTimeline } from '@/components/timeline/DualTimeline';
```

## Code Style

**Formatting:**
- 2-space indentation (inferred from examples)
- Semicolons at end of statements
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Arrow functions for callbacks
- Explicit return types for complex functions

**TypeScript Patterns:**
```typescript
// Explicit typing for function parameters and returns
export const normalizeToPercent = (
  realTime: number,
  minTime: number,
  maxTime: number
): number => { ... }

// Interface for complex parameter objects
interface ApplyRangeToStoresContractParams {
  interactive: boolean;
  startSec: number;
  endSec: number;
  domainStart: number;
  domainEnd: number;
  currentTime: number;
  setTimeRange: (range: [number, number]) => void;
  setRange: (range: [number, number]) => void;
  // ...
}

// Optional props with defaults
interface DualTimelineProps {
  adaptiveWarpMapOverride?: Float32Array | null;
  adaptiveWarpDomainOverride?: [number, number];
  interactive?: boolean;  // defaults handled in function
  tickLabelStrategy?: TickLabelStrategy;
}
```

## JSDoc Documentation

**Usage:** Common for utility functions and complex logic

```typescript
/**
 * Normalize a real epoch timestamp to a 0-100 value based on the data range.
 * 
 * @param realTime - Epoch seconds
 * @param minTime - Minimum epoch seconds in data range
 * @param maxTime - Maximum epoch seconds in data range
 * @returns Normalized value 0-100
 */
export const normalizeToPercent = (
  realTime: number,
  minTime: number,
  maxTime: number
): number => { ... }
```

## Error Handling

**Patterns:**
```typescript
// Try/catch with console.error for unexpected errors
try {
  const result = await someAsyncOperation();
  return result;
} catch (err) {
  console.error('Failed to flush logs', err);
  // Handle or re-throw as needed
}

// Guard clauses for invalid states
if (maxTime === minTime) return 50; // Avoid division by zero

// Explicit validation with early returns
if (!interactive) {
  return;
}
```

**Logger Service:**
- Custom `LoggerService` class in `src/lib/logger.ts`
- Batches events and flushes periodically
- Uses `navigator.sendBeacon` for reliability during page unload
- Fallback to fetch POST

## React Component Patterns

**"use client" directive** for client-side components:
```typescript
"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
```

**Component Props:** Use interface with explicit typing

**Hooks patterns:**
```typescript
// Zustand store access pattern
const slices = useSliceDomainStore((state) => state.slices);
const activeSliceId = useSliceDomainStore(selectActiveSliceId);

// Memoized computations
const timestampSeconds = useMemo<number[]>(() => { ... }, [dependencies]);

// Callbacks with useCallback
const applyRangeToStores = useCallback(
  (startSec: number, endSec: number) => { ... },
  [dependency1, dependency2]
);

// Refs for mutable values that don't trigger re-renders
const isSyncingRef = useRef(false);
```

## Module Patterns

**Zustand Stores:**
```typescript
import { create } from 'zustand';

interface AdaptiveState {
  warpFactor: number;
  densityMap: Float32Array | null;
  isComputing: boolean;
  // ...
  setWarpFactor: (v: number) => void;
  computeMaps: (timestamps: Float32Array, domain: [number, number], options?: ComputeMapsOptions) => void;
}

export const useAdaptiveStore = create<AdaptiveState>((set) => ({
  warpFactor: 0,
  densityMap: null,
  isComputing: false,
  // ...
}));
```

**Workers:** Use `new URL(...)` pattern for Vite/Webpack compatibility
```typescript
if (typeof window !== 'undefined') {
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}
```

## Special Patterns

**Guard for store re-creation:**
```typescript
const noNewRootGuard = <T>(store: T): T => store;
export const useSliceStore = noNewRootGuard(useSliceDomainStore);
```

**Color Palette constants:**
```typescript
const SLICE_COLOR_PALETTE: Record<string, { fill: string; stroke: string }> = {
  amber: { fill: 'rgba(251, 191, 36, 0.28)', stroke: 'rgba(251, 191, 36, 0.9)' },
  // ...
};
```

---

*Convention analysis: 2026-04-08*
