# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- Use `PascalCase.tsx` for React components in `src/components/**` and `src/app/**/components/**`.
- Use `useXxx.ts` for hooks and stores in `src/hooks/**` and `src/store/**`.
- Use `route.ts` for API handlers under `src/app/api/**`.
- Use `*.test.ts` for unit tests colocated with source.

**Functions:**
- Use `camelCase` for functions and local helpers (e.g., `detectBoundaries` in `src/lib/interval-detection.ts`, `computeMaps` in `src/store/useAdaptiveStore.ts`).

**Variables:**
- Use `camelCase` for mutable/local variables.
- Use `UPPER_SNAKE_CASE` for constants (e.g., `MOCK_START_SEC` in `src/lib/constants.ts`, `DEFAULT_DELAY_MS` in `src/hooks/useDebouncedDensity.ts`).

**Types:**
- Use `PascalCase` interfaces/types (`CrimeRecord`, `UseCrimeDataOptions`, `BoundarySuggestion`).

## Code Style

**Formatting:**
- Use ESLint + Next presets (`eslint.config.mjs`) as the enforced baseline.
- Keep existing quote/semicolon style per file; repo currently mixes generated double-quote files (`src/app/layout.tsx`) and single-quote files (`src/hooks/useCrimeData.ts`).

**Linting:**
- Lint with `npm run lint`.
- Respect ignored paths from `eslint.config.mjs` (including `datapreprocessing/.venv/**`).

## Import Organization

**Order:**
1. External packages (`react`, `next/server`, `d3-*`, etc.)
2. `@/*` alias imports (`@/store/...`, `@/lib/...`)
3. Relative imports (`./...`, `../...`)

**Path Aliases:**
- Use `@/*` alias from `tsconfig.json` for app source imports.

## Error Handling

**Patterns:**
- API routes return `NextResponse.json` with status and error payload on validation/runtime errors (`src/app/api/crimes/range/route.ts`).
- Data APIs prefer fallback demo payloads with warning headers rather than hard failures when DuckDB/data is unavailable (`src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`).
- Client hooks throw/propagate fetch errors (`src/hooks/useCrimeData.ts`) and route UIs render error state.

## Logging

**Framework:** `console.*` plus optional buffered study logger (`src/lib/logger.ts`).

**Patterns:**
- Keep server errors as `console.error` in API/lib modules.
- Avoid adding new verbose `console.log` in hot client paths; existing logs in `src/hooks/useCrimeData.ts` and `src/components/layout/TopBar.tsx` are already noisy.

## Comments

**When to Comment:**
- Comment only when behavior is non-obvious (adaptive mapping math, store synchronization, fallback logic).
- Prefer short, purpose-focused comments over narrative blocks.

**JSDoc/TSDoc:**
- Use block comments for exported hooks/types/modules when they define contracts (`src/hooks/useCrimeData.ts`, `src/types/crime.ts`).

## Function Design

**Size:**
- Small/medium pure helpers in `src/lib/**`.
- UI orchestrators can be large but should isolate pure helpers where possible (current exception: `src/components/timeline/DualTimeline.tsx`).

**Parameters:**
- Prefer typed options objects for extensible APIs (`UseCrimeDataOptions`, `BoundaryOptions`).

**Return Values:**
- Hooks return structured object results, not tuples (`UseCrimeDataResult`, `UseViewportCrimeDataResult`).

## Module Design

**Exports:**
- Prefer named exports for hooks/stores/utils.
- Use default exports for route pages/layouts and selected provider components (`src/providers/QueryProvider.tsx`).

**Barrel Files:**
- Not used broadly; import directly from module paths.

---

*Convention analysis: 2026-02-26*
