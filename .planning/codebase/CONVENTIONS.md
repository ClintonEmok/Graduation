# Coding Conventions

**Analysis Date:** 2026-06-25

## Language & Tooling

- **TypeScript** 5.9.3 - Strict mode enabled in `tsconfig.json` (`"strict": true`)
- **React** 19.2.7 with **Next.js** 16.2.9 (App Router)
- **Tailwind CSS** v4 for styling (via `@tailwindcss/postcss`)
- **ESLint** 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- **TypeScript strict mode**: `"strict": true` in `tsconfig.json`
- **Path alias**: `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vitest.config.mts`)

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` — `DualTimeline.tsx`, `SuggestionPanel.tsx`, `DashboardHeader.tsx`
- Utilities/Hooks: `camelCase.ts` — `slice-utils.ts`, `date-normalization.ts`, `useCrimeData.ts`
- Zustand stores: `usePascalCaseStore.ts` — `useCoordinationStore.ts`, `useFilterStore.ts`, `useSliceDomainStore.ts`
- Tests: `*.test.ts` or `*.test.tsx` suffix — `slice-utils.test.ts`, `useCrimeData.test.ts`, `page.shell.test.tsx`
- Workers: `*.worker.ts` suffix — `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`, `kdeSlice.worker.ts`
- Shadcn UI components: `kebab-case.tsx` — `alert-dialog.tsx`, `scroll-area.tsx`, `button.tsx`

**Identifiers:**
- Constants: `UPPER_SNAKE_CASE` — `OVERVIEW_HEIGHT`, `DETAIL_HEIGHT`, `BATCH_SIZE`, `DEFAULT_TOLERANCE_PERCENT`, `PRESET_STORAGE_KEY`
- Functions: `camelCase` — `normalizeToPercent()`, `generateBins()`, `computeAdaptiveMaps()`
- React hooks: `camelCase` with `use` prefix — `useAutoBurstSlices()`, `useViewportCrimeData()`, `useDualTimelineViewModel()`
- React components: `PascalCase` — `DualTimeline`, `CubeVisualization`, `SuggestionPanel`, `DashboardLayout`
- Types/Interfaces: `PascalCase` — `CrimeRecord`, `UseCrimeDataOptions`, `CoordinationState`, `TimeSlice`
- Factory helpers: `buildPackage()` for test data builders
- Descriptive names preferred over abbreviations

## Import Organization

**Order:**
1. Node built-in modules (`node:fs`)
2. Third-party packages (`react`, `vitest`, `zustand`, `@tanstack/react-query`, `three`, `d3-array`)
3. Internal absolute imports via `@/*` alias (`@/store/...`, `@/lib/...`, `@/types/...`)
4. Relative imports (`./slice-utils`, `./hooks/useDensityStripDerivation`)

**Patterns:**
- Type imports use `import type` syntax:
```typescript
import type { CrimeRecord } from '@/types/crime';
import type { UseCrimeDataOptions, UseCrimeDataResult } from '@/types/crime';
```
- Path alias `@/*` used consistently for internal imports across all layers
- External imports always grouped first, then internal

## Code Style

**Formatting:**
- Tool: Prettier (inferred from 2-space indentation, consistent formatting, no ESLint stylistic rules)
- 2-space indentation throughout all files
- Semicolons used at end of statements
- Single quotes for strings
- Trailing commas in multi-line objects and arrays

**Linting:**
- Tool: ESLint 9 with `eslint-config-next`
- Rules: `core-web-vitals` + `typescript` presets
- No custom ESLint rules beyond Next.js defaults
- Config: `eslint.config.mjs` (flat config format)

**Arrow vs Named Functions:**
- Arrow functions for short exports, callbacks, and simple utility functions:
```typescript
export const normalizeRange = (range: [number, number]): [number, number] =>
  range[0] <= range[1] ? range : [range[1], range[0]];

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```
- Named `function` keyword for complex functions with multiple early returns:
```typescript
export function focusTimelineRange({ start, end, ... }: TimelineFocusRangeOptions): void {
  // ... multi-step logic with early returns
}
```
- React components use `function` keyword consistently in shadcn/ui:
```typescript
function Button({ className, variant, ...props }: React.ComponentProps<"button"> & VariantProps<...>) {
  // ...
}
```

**Destructuring:**
- Props destructured in component function signatures
- State destructured in `set()` callbacks

## JSDoc Documentation

- Used sparingly but consistently in key libraries and types:
```typescript
/**
 * Date normalization utilities for mapping between real epoch seconds and normalized 0-100 values.
 * Used for real data integration (2001-2026 date range).
 */

/**
 * Normalize a real epoch timestamp to a 0-100 value based on the data range.
 *
 * @param realTime - Epoch seconds
 * @param minTime - Minimum epoch seconds in data range
 * @param maxTime - Maximum epoch seconds in data range
 * @returns Normalized value 0-100
 */
```
- `@param` and `@returns` tags used when applicable
- Used in `src/types/crime.ts` for canonical type documentation
- Used in `src/lib/date-normalization.ts` for utility documentation
- Used in `src/providers/QueryProvider.tsx` for provider documentation
- Used in `src/lib/logger.ts` for class-level documentation with version/phase context
- NOT used on every function; reserved for public APIs and complex logic

## shadcn/ui Usage

- All shadcn components in `src/components/ui/` (21 component files)
- Style: **new-york** (per `components.json`)
- Component patterns:
```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "base-classes",
  { variants: { variant: { ... }, size: { ... } },
    defaultVariants: { variant: "default", size: "default" }
  }
);

function Button({ className, variant, size, asChild, ...props }: ComponentProps & VariantProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```
- Uses `data-slot` attributes for styling hooks
- Uses `data-variant` and `data-size` attributes on components
- Uses `Slot.Root` from Radix for `asChild` pattern
- `cn()` utility from `src/lib/utils.ts` for class merging:
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```
- Radix UI primitives used directly in `/src/components/ui/` files
- Icon library: **lucide-react**

## Zustand Store Patterns

**Single store per file:**
```typescript
import { create } from 'zustand';

interface StoreState {
  // state fields
  action: () => void;
}

export const useStoreName = create<StoreState>((set) => ({
  // initial state
  action: () => set({ /* ... */ }),
}));
```

**Slice-domain pattern for complex stores** (`src/store/slice-domain/`):
```typescript
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    { name: 'slice-domain-v1', partialize: (state) => ({ slices: state.slices }) }
  )
);
```
- Complex stores use multiple slice creator functions (`createSliceXxxSlice`)
- Each slice creator is a pure function `(set, get) => ({...})`
- `persist` middleware used for persistent state
- Selector exports for derived data (e.g., `selectSlices`, `selectActiveSliceId`)
- Barrel file pattern: `useSliceDomainStore.ts` re-exports types and selectors

**Store patterns observed:**
- Simple stores: `create<Interface>()((set) => ({...}))` with inline actions
- Complex stores: `create<Interface>()(persist((...args) => ({...slices}), {...persistOptions}))`
- `set()` with object for simple updates
- `set((state) => ({...}))` with callback for complex updates depending on current state
- `getState()` / `setState()` used in tests for direct state manipulation
- `useStore(store, selector)` pattern used for selective subscriptions in components
- Stores access other stores via `useXxxStore.getState()` for cross-store reads:

```typescript
const toNormalizedStoreRange = (start: number, end: number): [number, number] => {
  const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
  const mapDomain = useAdaptiveStore.getState().mapDomain;
  // ...
};
```

## Web Worker Patterns

**File location:** `src/workers/*.worker.ts`

**Worker creation pattern** (module-level singleton):
```typescript
let worker: Worker | null = null;
if (typeof window !== 'undefined') {
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}
```

**Typed message contracts:**
```typescript
export interface WorkerInput {
  requestId: number;
  timestamps: Float32Array;
  domain: [number, number];
  config: WorkerConfig;
}

export interface WorkerOutput {
  requestId: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  warpMap: Float32Array;
  countMap: Float32Array;
}
```

**Message handling:**
```typescript
// In worker:
if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const { requestId, timestamps, domain, config } = e.data;
    const maps = computeAdaptiveMaps(timestamps, domain, config);
    self.postMessage({ requestId, ...maps });
  };
}

// In store:
if (worker) {
  worker.onmessage = (e) => {
    const { requestId, densityMap, burstinessMap, warpMap, countMap } = e.data;
    // process results
  };
}
```
- Pure computation function exported separately for testability (e.g., `computeAdaptiveMaps`)
- Worker wrapper is conditional on `self.postMessage` availability
- `requestId` pattern for matching responses to requests

## React Patterns

- **"use client"** directive at top of client components
- Provider pattern: `QueryProvider` wraps children with `QueryClientProvider` in `src/providers/`
- `useQuery` from TanStack Query for data fetching hooks
- `useState` creates QueryClient once (not in render body)
- `Suspense` with `fallback={null}` for lazy-loaded sections
- Custom hooks for view logic extraction (e.g., `useDualTimelineViewModel`, `useViewportCrimeData`)
- `useEffect` with dependency arrays for side effects
- `useCallback` / `useMemo` for stable references
- Data attributes on HTML elements: `data-phase="..."`, `data-slot="button"`

## Error Handling

**Centralized logger:** `src/lib/logger.ts`
- `LoggerService` class with singleton export `logger`
- Methods: `log()`, `submit()`, `enqueue()`, `flush()`
- Retry with linear backoff (4 attempts, 750ms base)
- Uses `fetch` with `keepalive: true` for reliability
- Falls back to `navigator.sendBeacon` on page unload

**API error handling:**
- API routes catch errors and return mock data with `X-Data-Warning` header
- DuckDB failures trigger mock data fallback
- Fetch errors caught with try/catch and converted to typed errors with context

**Store error handling:**
- `isLoading`, `isFetching`, `error` properties in hook results (TanStack Query pattern)
- `SyncStatus` type (`'syncing' | 'synchronized' | 'partial'`) for cross-panel sync state

## Module Design

**Exports:** Named exports preferred over default exports for utilities and hooks
- Exception: Pages (`export default function Page`) and shadcn components (`function Button` with named export)
- Exception: `QueryProvider` uses default export

**Barrel Files:** Used for re-exports:
- `src/store/useSliceDomainStore.ts` re-exports types and selectors from `src/store/slice-domain/`
- `src/lib/queries` directory exports all query functions through index

## TanStack Query Conventions

- `staleTime: 5 * 60 * 1000` (5 minutes) - data considered fresh
- `gcTime: 10 * 60 * 1000` (10 minutes) - unused data cache
- `refetchOnWindowFocus: false` - prevent unwanted refetches
- `retry: 1` for queries, `retry: 0` for mutations
- Query key stability: make sure equivalent options produce same key to avoid refetch

---

*Convention analysis: 2026-06-25*
