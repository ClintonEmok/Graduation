# Coding Conventions

**Analysis Date:** 2026-06-01

## Language & Tooling

- **TypeScript 5.9.3** — Strict mode enabled (`"strict": true` in `tsconfig.json`)
- **React 19.2.3** with **Next.js 16.1.6** (App Router)
- **Tailwind CSS v4** for styling — PostCSS plugin configured in `postcss.config.mjs`
- **ESLint 9** with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` (see `eslint.config.mjs`)
- **No Prettier** — formatting handled implicitly by ESLint rules (no `.prettierrc` found)
- **Vitest 4.0.18** for testing
- Module resolution: `bundler` with `@/*` path alias mapping to `./src/*`

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `DualTimeline.tsx`, `BurstList.tsx`, `SuggestionPanel.tsx`)
- Store modules: `usePascalCaseStore.ts` (e.g., `useSliceStore.ts`, `useCoordinationStore.ts`, `useAdaptiveStore.ts`)
- Utility/helper modules: `camelCase.ts` (e.g., `slice-utils.ts`, `time-domain.ts`, `date-normalization.ts`)
- Test files: `*.test.ts` or `*.test.tsx` (e.g., `slice-utils.test.ts`, `BurstList.test.ts`) — co-located with source
- Web Workers: `*.worker.ts` suffix (e.g., `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- Type definition files: `camelCase.ts` (e.g., `crime.ts`, `adaptive.ts`, `autoProposalSet.ts`)
- Barrel files: `index.ts` under directories (e.g., `src/queries/index.ts`, `src/types/index.ts`)
- Phase-suffixed test files: `*.phaseN.test.ts` for phased rollout tests (e.g., `stkde-overlay.phase2.test.ts`)

**Identifiers:**
- Components: `PascalCase` — `BurstList`, `DualTimeline`, `ContextualSlicePanel`
- Hooks: `camelCase` with `use` prefix — `useBurstWindows()`, `useDebounce()`, `useAutoBurstSlices()`
- Stores: `usePascalCaseStore` — `useCoordinationStore`, `useSliceStore`
- Regular functions: `camelCase` — `normalizeRange()`, `withinTolerance()`, `buildBurstWindowsFromSeries()`
- Types/Interfaces: `PascalCase` — `CrimeRecord`, `BurstWindow`, `UseCrimeDataResult`
- Constants: `UPPER_SNAKE_CASE` — `BATCH_SIZE`, `FLUSH_INTERVAL`, `TIME_MIN`
- Factory/build functions: `camelCase` starting with `build` or `create` — `buildPoint()`, `buildBurstWindowsFromSeries()`
- Loop indices: `index` not `i` (preferred in modern code), `i` accepted in simple loops
- Descriptive names preferred over abbreviations

## Import Organization

**Order:**
1. External packages (React, framework, third-party libraries)
2. Internal stores (`@/store/*`)
3. Internal lib modules (`@/lib/*`)
4. Internal components (`@/components/*`)
5. Internal types (`@/types/*`)

**Pattern:**
```typescript
// External packages first
import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Internal stores
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useSliceStore } from '@/store/useSliceStore';

// Internal lib
import { epochSecondsToNormalized, toEpochSeconds } from '@/lib/time-domain';
import { focusTimelineRange } from '@/lib/slice-utils';

// Internal components
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

// Internal types
import type { CrimeRecord } from '@/types/crime';
```

**Path Aliases:**
- `@/*` maps to `./src/*` — always use for internal imports, never relative imports (`../../`)

## Code Style

**Formatting:**
- 2-space indentation (inferred from all source files)
- Semicolons at end of statements
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Arrow functions preferred over `function` keyword for anonymous/inline functions
- `function` keyword used for top-level named exports and generators

**Strictness:**
- TypeScript strict mode enabled
- Explicit `interface` over `type` for object shapes; `type` for unions, aliases, and tuples
- Type imports use `import type { ... }` syntax
- Function parameters destructured with inline type annotations for simple cases; `interface` for complex options objects
- `as const` used for literal type assertions
- `satisfies` operator used for type narrowing on complex structures

## React Component Patterns

**File Structure:**
```typescript
// 1. Imports (external, then internal)
// 2. Helper functions (private to module)
// 3. Exported type definitions (co-located with component)
// 4. Exported utility functions / hooks
// 5. Component function
```

**Component Definition:**
- Functional components only (no class components)
- Components exported as named exports: `export function BurstList()`
- Smaller utility components may use `export default` for cleaner dynamic imports
- Props typed inline or via exported interface: `interface BurstWindowSeriesInput { ... }`

**Hook Composition:**
- Custom hooks prefixed with `use` and stored in `src/hooks/` or co-located in component directory
- Store selectors called at top of component: `const densityMap = useAdaptiveStore((state) => state.densityMap)`
- Computed values wrapped in `useMemo()`:
```typescript
const burstWindowsWithTaxonomy = useMemo(() => {
  return burstWindows.map(...)
}, [burstWindows]);
```
- Callback functions wrapped in `useCallback()`:
```typescript
const toNormalizedRange = useCallback((start: number, end: number): [number, number] | null => {
  ...
}, [isEpochMilliseconds, isNormalizedDomain, maxTimestampSec, minTimestampSec]);
```
- Effects used sparingly, with explicit dependency arrays:
```typescript
useEffect(() => {
  if (!burstWindows.length || isComputing) return;
  burstWindows.forEach((window) => { ... });
}, [burstWindows, isComputing, addBurstSlice]);
```

**JSX Patterns:**
- Conditional rendering with ternary or `&&`:
```typescript
{isLinked ? <span>Linked</span> : null}
```
- Early return for empty states:
```typescript
if (burstWindowsWithTaxonomy.length === 0) return null;
```
- `className` construction with template literals for conditional classes instead of `clsx` utility (used sparingly)
- Accessible attributes: `aria-pressed`, `aria-label` included on interactive elements
- Radix UI primitives used for complex interactive patterns (dialogs, popovers, selects, sliders)

## Store Patterns (Zustand)

**Store Creation:**
```typescript
import { create } from 'zustand';

interface CoordinationState {
  selectedIndex: number | null;
  selectedSource: SelectionSource;
  // actions
  commitSelection: (index: number, source: SelectionSource) => void;
  clearSelection: (reason?: string) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  // state
  selectedIndex: null,
  selectedSource: null,
  // actions (using `set` or `set` with callback for computed state)
  commitSelection: (index, source) =>
    set({
      selectedIndex: index,
      selectedSource: source,
      lastInteractionAt: Date.now(),
    }),
  clearSelection: (reason) =>
    set({
      selectedIndex: null,
      selectedSource: null,
    }),
}));
```

**Store Patterns Observed:**
- All state in a single store file with `interface XState` containing both data and actions
- Actions defined inline in the `create(...)` callback
- `set({ ... })` for simple updates; `set((state) => { ... })` for derived state
- Selectors used at the component level, not at the hook level
- Store re-exports: `useSliceStore` is a re-export of `useSliceDomainStore` with a guard:
```typescript
const noNewRootGuard = <T>(store: T): T => store;
export const useSliceStore = noNewRootGuard(useSliceDomainStore);
```

## Server/API Route Patterns

- Route handlers in `src/app/api/` using Next.js Route Handlers
- Named export of HTTP method functions: `export async function POST(request: Request)`
- Validation at entry; errors return `Response.json({ error: ... }, { status: 4xx })`
- DuckDB queries use `@/lib/db` and `@/lib/queries` modules
- Mock data fallback via `X-Data-Warning` response header

## Error Handling

**Client-side:**
- API errors caught and returned through React Query's `error` state:
```typescript
if (!response.ok) {
  throw new Error(`HTTP error: ${response.status}`);
}
```
- Network errors wrapped with request context:
```typescript
throw new Error(`Network error while fetching crimes from ${url}: ${(error as Error).message}`);
```
- Stores handle loading/error states via hook results with `isLoading`, `isFetching`, `error`, `data` properties
- Null/guarded returns for invalid states:
```typescript
if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
```
- `return [] as BurstWindow[]` for empty/invalid results

**Server-side (API routes):**
- Validation guard at top of handler; returns 4xx on malformed input
- DuckDB failures trigger pre-computed mock data
- Fallback modes in STKDE route (sampled vs full-population) with guardrails

## Logging

**Framework:** Custom `LoggerService` class in `src/lib/logger.ts`

**Patterns:**
- Singleton export: `export const logger = new LoggerService()`
- Batched logging: events queued in buffer, flushed at `BATCH_SIZE` (50) or `FLUSH_INTERVAL` (5s)
- `navigator.sendBeacon` used for reliability during page unload with `fetch` fallback
- Backend endpoint: `POST /api/study/log`
- Session-aware: logs include `sessionId` and `participantId` from `useStudyStore`
- Console fallback: `console.error('Failed to flush logs', err)` for logging failures

## Type System

- Types stored in `src/types/` organized by domain (`crime.ts`, `adaptive.ts`, `autoProposalSet.ts`)
- Barrel file `src/types/index.ts` re-exports types from submodules
- `interface` for object shapes; `type` for unions, mapped types, and aliases
- JSDoc comments on interfaces for documentation:
```typescript
/** Unique identifier - generated client-side if not provided by API */
id?: string
/** Unix epoch timestamp in seconds */
timestamp: number
```
- Exported types used across layers (types → lib → store → components)
- Descriptive field names with inline comments for non-obvious constraints

## Module Design

**Exports:**
- Named exports preferred over default exports
- Type exports use `export type { ... }` syntax explicitly
- Re-exports through barrel files: `export type { CrimeRecord } from './crime'`

**Co-location:**
- Test files co-located with source files: `src/lib/slice-utils.ts` → `src/lib/slice-utils.test.ts`
- Types co-located with component when they are component-specific; shared types go in `src/types/`

**Barrel Files:**
- `src/types/index.ts` re-exports canonical types from submodules
- `src/lib/queries/index.ts` re-exports query builder functions and types
- Two levels deep maximum for barrel nesting

## Constants

- Module-level constants at top of file after imports
- `UPPER_SNAKE_CASE` naming
- Examples: `BATCH_SIZE = 50`, `FLUSH_INTERVAL = 5000`, `TIME_MIN = 0`, `TIME_MAX = 100`

## Comments

**When to Comment:**
- Explanation of non-obvious business logic (e.g., burst detection algorithm)
- Reason for guard clauses or edge case handling
- TODO items for known improvements (prefixed with `// TODO:`)
- API endpoint descriptions in route handlers

**JSDoc/TSDoc:**
- Used for public type interfaces and export function signatures
- Properties annotated with `@param` descriptions for complex objects
- Component-level documentation minimal; focus on data flow comments

---

*Convention analysis: 2026-06-01*
