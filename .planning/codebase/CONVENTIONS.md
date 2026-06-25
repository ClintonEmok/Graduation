# Coding Conventions

**Analysis Date:** 2026-06-25

## Language & Tooling

- TypeScript 5.9.3 — Strict mode enabled: `"strict": true` in `tsconfig.json`
- React 19.2.7 with Next.js 16.2.9 (App Router)
- Tailwind CSS v4 via `@tailwindcss/postcss`
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
  - Config: `eslint.config.mjs`
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`, `datapreprocessing/.venv/`
- No Prettier detected — formatting is managed by ESLint only
- Package manager: pnpm 9.x (lockfile: `pnpm-lock.yaml`)

## Path Aliases

- `@/*` maps to `./src/*` — configured in `tsconfig.json` and `vitest.config.mts`
  ```typescript
  import { useStudyStore } from '@/store/useStudyStore';
  import { cn } from '@/lib/utils';
  ```

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `DualTimeline.tsx`, `SuggestionPanel.tsx`)
- Utilities/Hooks: `camelCase.ts` (e.g., `date-normalization.ts`, `slice-utils.ts`)
- Stores: `usePascalCaseStore.ts` (e.g., `useSliceStore.ts`, `useAdaptiveStore.ts`)
- Tests: `*.test.ts` or `*.test.tsx` suffix (e.g., `slice-utils.test.ts`, `page.shell.test.tsx`)
- Workers: `*.worker.ts` suffix (e.g., `adaptiveTime.worker.ts`, `stkdeHotspot.worker.ts`)
- Layout pages: `layout.tsx` (e.g., `src/app/layout.tsx`)

**Identifiers:**
- **React components:** PascalCase — `DualTimeline`, `SuggestionPanel`, `MapVisualization`
- **Regular functions:** camelCase — `normalizeToPercent()`, `generateBins()`, `buildPackage()`
- **React hooks:** camelCase with `use` prefix — `useCrimeData()`, `useAutoBurstSlices()`, `useViewportCrimeData()`
- **Zustand stores:** PascalCase with `use` prefix and `Store` suffix — `useAdaptiveStore`, `useFilterStore`
- **Types/Interfaces:** PascalCase — `CrimeRecord`, `UseCrimeDataOptions`, `FilterPreset`
- **Constants:** UPPER_SNAKE_CASE for module-level constants — `OVERVIEW_HEIGHT`, `BATCH_SIZE`, `MAX_ATTEMPTS`, `TIME_MIN`
- **Descriptive names preferred** over abbreviations (e.g., `selectedTimeRange` not `selTR`)

## Import Organization

**Order observed in codebase:**
1. External/framework imports (React, vitest, next, zustand)
2. Internal module imports via `@/` alias
3. Relative imports (`./file`) for co-located modules

```typescript
import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import { ADAPTIVE_BIN_COUNT } from '@/lib/adaptive-utils';
import { type AdaptiveBinningMode } from '@/types/adaptive';
import { normalizeRange } from './slice-utils';
```

**Group ordering (from source examples):**
1. Node built-ins (e.g., `node:fs`)
2. Third-party (vitest, react, zustand, next, etc.)
3. `@/` path aliases
4. Relative `./` imports

## Code Style

- 2-space indentation
- Semicolons at end of statements
- Single quotes for strings (observable in all source files)
- Trailing commas in multi-line objects/arrays
- Arrow functions for callbacks and short functions
- Named function declarations for module-level exports `export function fn()`
- Explicit return types on complex functions

**TypeScript Patterns:**
- Interface over type for object shapes: `interface FilterState { ... }`
- Type alias for unions and complex types: `type AdaptiveBinningMode = 'uniform-time' | 'uniform-events'`
- Readonly tuples typed as `[number, number]` for ranges
- `as const` for literal constant objects

## JSDoc / TSDoc

**When to document:**
- Public API functions and hooks always get JSDoc blocks
- Brief inline comments for non-obvious logic
- Module-level doc comment at top of file explaining purpose

**Pattern:**
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
): number => { ... };
```

**Block comments** (`/** */`) for function docs, **line comments** (`//`) for inline explanations.

## Error Handling

**Patterns observed:**

1. **Custom `LoggerService`** in `src/lib/logger.ts` — class-based with retry queue
   - `log()` — debug-only console logging in non-production
   - `submit()` — async POST with up to 4 retries, linear backoff
   - `enqueue()` — fire-and-forget background writes
   - Typed helpers: `submitSessionStart()`, `submitSessionEnd()`, `submitTrialComplete()`, etc.

2. **API route error handling** — returns mock data with `X-Data-Warning` header on failure
   ```typescript
   // src/lib/queries.ts pattern
   try {
     const response = await fetch(requestPath);
     if (!response.ok) {
       throw new Error(`HTTP error: ${response.status}`);
     }
   } catch (error) {
     throw new Error(`Network error while fetching...`);
   }
   ```

3. **Store async operations** — loading/error states tracked in state
   ```typescript
   interface State {
     isComputing: boolean;
     error: Error | null;
   }
   ```

4. **Early returns** for invalid data:
   ```typescript
   if (!Number.isFinite(start) || !Number.isFinite(end)) return;
   if (maxTime === minTime) return 50; // Avoid division by zero
   ```

5. **Guard clauses** with `Number.isFinite()` checks before numeric operations

## Logging

- **Framework:** Custom `LoggerService` class in `src/lib/logger.ts`
- **Instance:** Singleton `logger` export
- **Hook wrapper:** `useLogger` in `src/hooks/useLogger.ts`
- **Pattern:** `console.debug` in dev, `console.error` for failures
- **Transmission:** `fetch` POST with `keepalive: true`, fallback to `navigator.sendBeacon`

## React Component Patterns

- **Function components** with explicit `React.FC` or typed props:
  ```typescript
  export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { ... }
  ```
- **Named exports** for all components (no default exports except pages/layouts)
- **Hooks** use TanStack Query for data fetching, Zustand for state
- **Conditional rendering** via ternary `{condition ? <A /> : <B />}` and logical `&&`
- **shadcn/ui** components in `src/components/ui/` — Radix-based, styled with Tailwind + `cn()` utility

## Module Design

**Exports:**
- Named exports preferred (`export const`, `export function`)
- Default exports only for Next.js pages (`export default function Page`)
- Single-instance exports (singletons like `logger`) exported as named const

**Barrel Files:**
- `src/types/index.ts` re-exports all types
- `src/lib/queries.ts` re-exports from `src/lib/queries/` directory facade
- `src/lib/adaptive/` directory with `index.ts` facade

**Store Module Pattern:**
```typescript
import { create } from 'zustand';

interface StoreState {
  // state fields
  // action methods
}

export const useStoreName = create<StoreState>((set, get) => ({
  // initial state
  // action implementations
}));
```

## Special Patterns

**Web Workers:**
- Workers in `src/workers/` directory
- Instantiated via `new Worker(new URL('../workers/...', import.meta.url))`
- Communication via `postMessage` / `onmessage` with `requestId` for stale-response handling

**Constants Module:**
- Module-level constants in `src/lib/constants.ts`
- Named UPPER_SNAKE_CASE exports

**DuckDB Integration:**
- Server-side only via `next.config.ts` `serverExternalPackages: ['duckdb']`
- Local OLAP, no external database connections

**Utility Functions:**
- `cn()` in `src/lib/utils.ts` for Tailwind class merging
  ```typescript
  import { clsx, type ClassValue } from "clsx"
  import { twMerge } from "tailwind-merge"
  export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
  ```

---

*Convention analysis: 2026-06-25*
