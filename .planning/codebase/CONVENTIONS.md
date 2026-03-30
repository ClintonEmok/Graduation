# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Hooks: `use*.ts` / `use*.tsx` - e.g., `useSliceStore.ts`, `useCrimeData.ts`
- Stores: `use*Store.ts` - e.g., `useSliceStore.ts`, `useFilterStore.ts`
- Utilities: `camelCase.ts` - e.g., `constants.ts`, `time-domain.ts`
- Components: `PascalCase.tsx` - e.g., `DualTimeline.tsx`, `TimelinePanel.tsx`
- Types: `camelCase.ts` or `PascalCase.ts` - e.g., `types/crime.ts`
- Tests: Same name with `.test.ts` or `.test.tsx` suffix - e.g., `useSliceStore.test.ts`

**Functions:**
- Hooks: `use*` prefix - e.g., `useCrimeData()`, `useAutoBurstSlices()`
- Store actions: camelCase - e.g., `addSlice()`, `updateSlice()`, `removeSlice()`
- Utility functions: camelCase - e.g., `normalizeEpochRange()`, `hasValidEpochRange()`
- Component functions: PascalCase - e.g., `function DualTimeline() {}`

**Variables:**
- camelCase - e.g., `normalizedRange`, `currentOptions`, `fetchMock`
- Boolean flags: `is*`, `has*`, `can*` - e.g., `isLoading`, `hasValidRange`, `canCreate`
- Refs: `*Ref` suffix - e.g., `isSyncingRef`, `processedRef`

**Types:**
- PascalCase - e.g., `TimeSlice`, `CrimeRecord`, `UseCrimeDataOptions`
- Interfaces preferred over type aliases for public APIs
- Export types explicitly: `export type { TimeSlice }`

## Code Style

**Formatting:**
- No Prettier config found - defaults to ESLint/editor formatting
- 2-space indentation
- Single quotes for strings (consistent with ESLint defaults)

**Linting:**
- Tool: ESLint 9 with `eslint-config-next`
- Config file: `eslint.config.mjs`
- Extends: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- Run: `npm run lint`

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. External React/Next imports - e.g., `import { useEffect, useRef } from 'react'`
2. External library imports - e.g., `import { useQuery } from '@tanstack/react-query'`
3. Internal path alias imports - e.g., `import { CrimeRecord } from '@/types/crime'`
4. Relative imports from project - e.g., `import { useTimelineDataStore } from './useTimelineDataStore'`

**Example from `src/store/useSliceStore.ts`:**
```typescript
import { useEffect, useRef } from 'react';
import { useAdaptiveStore } from './useAdaptiveStore';
import { useTimelineDataStore } from './useTimelineDataStore';
import { epochSecondsToNormalized, toEpochSeconds } from '../lib/time-domain';
import { useSliceDomainStore } from './useSliceDomainStore';
```

**Example from `src/hooks/useCrimeData.ts`:**
```typescript
import { useQuery } from '@tanstack/react-query'
import { 
  CrimeDataMeta,
  CrimeRecord, 
  UseCrimeDataOptions, 
  UseCrimeDataResult 
} from '@/types/crime'
```

**Path Aliases:**
- `@/*` - maps to `./src/*`
- Configured in both `tsconfig.json` and `vitest.config.mts`

## Error Handling

**Patterns:**
- Try/catch for async operations with re-throwing
- Console error logging with context prefix: `console.error('[useCrimeData] Error fetching crimes:', error)`
- Custom error messages with context: `throw new Error('Network error while fetching crimes from ${requestPath}')`
- Validation returns result objects: `{ ok: boolean; error?: string; value?: T }`

**Example from `src/hooks/useCrimeData.ts`:**
```typescript
try {
  const response = await fetch(requestPath)
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }
  // ...
} catch (error) {
  console.error('[useCrimeData] Error fetching crimes:', error)
  if (error instanceof TypeError) {
    throw new Error(`Network error while fetching crimes from ${requestPath}`)
  }
  throw error
}
```

## Logging

**Framework:** `console` (no external logger)

**Patterns:**
- Debug-style logs with component/hook prefix: `console.log('[useCrimeData] queryKey (visible range):', queryKey)`
- Error logs with context: `console.error('[useCrimeData] Error fetching crimes:', error)`

## Comments

**When to Comment:**
- JSDoc for public API functions and hooks
- Inline comments for complex logic or workarounds
- Explain "why" not "what"

**JSDoc/TSDoc:**
- Use for exported functions with parameters
- Include @param and @returns tags

**Example from `src/hooks/useCrimeData.ts`:**
```typescript
/**
 * Unified hook for crime data fetching.
 * 
 * @param options - Query options including viewport bounds and filters
 * 
 * @example
 * const { data, isLoading, error } = useCrimeData({
 *   startEpoch: 978307200,
 *   endEpoch: 1767571200,
 *   bufferDays: 30,
 *   limit: 50000
 * })
 */
export function useCrimeData(options: UseCrimeDataOptions): UseCrimeDataResult {
```

## Function Design

**Size:** No strict limit, but prefer single responsibility

**Parameters:**
- Use options objects for multiple parameters: `useCrimeData({ startEpoch, endEpoch, bufferDays })`
- Destructure with defaults: `const { startEpoch, endEpoch, crimeTypes, districts, bufferDays = 30, limit = 50000 } = options`

**Return Values:**
- Explicit return types for hooks
- Consistent object shapes for results

## Module Design

**Exports:**
- Named exports preferred
- Export types separately: `export type { TimeSlice }`
- Re-export from index files for public APIs

**Barrel Files:**
- Use `index.ts` for module exports when needed
- Selective re-exports from stores: `export { select, selectActiveSlice } from './slice-domain/selectors'`

## Zustand Store Patterns

**Store Creation:**
```typescript
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      // ...
    }),
    { name: 'slice-domain-v1', partially: (state) => ({ slices: state.slices }) }
  )
);
```

**Slice Pattern:**
- Separate slice creators in `slice-domain/` folder
- Each slice in separate file: `createSliceCoreSlice.ts`, `createSliceSelectionSlice.ts`

---

*Convention analysis: 2026-03-30*
