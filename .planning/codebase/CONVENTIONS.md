# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**
- Hooks are `use*.ts` (for example `src/hooks/useCrimeData.ts`)
- Zustand stores are `use*Store.ts` (for example `src/store/useAdaptiveStore.ts`)
- Store slice factories use `create*Slice.ts` in `src/store/slice-domain/`
- Components are PascalCase `.tsx` files (for example `src/components/timeline/DualTimeline.tsx`)

**Functions:**
- Utilities use camelCase (`buildBufferedRange`, `resolveNearestSelectionIndex`, `generateRankedAutoProposalSets`)
- Store actions are verb-first (`setTimeRange`, `toggleType`, `clearSlices`)

**Variables:**
- camelCase by default; constants use UPPER_SNAKE_CASE (`ADAPTIVE_BIN_COUNT`, `DEFAULT_START_EPOCH`)

**Types:**
- `interface` and `type` names are PascalCase (`CrimeRecord`, `UseCrimeDataOptions`, `AdaptiveState`)

## Code Style

**Formatting:**
- No Prettier config detected; formatting is maintained by contributor habits + linting
- Mixed quote/semicolon style exists across modules (for example `src/components/ui/button.tsx` vs `src/hooks/useCrimeData.ts`); preserve local style in touched files

**Linting:**
- ESLint (`eslint.config.mjs`) with Next core-web-vitals + TypeScript presets
- Use `npm run lint` / `pnpm lint` before merge

## Import Organization

**Order:**
1. React/external packages
2. Internal alias imports (`@/...`)
3. Local relative imports

**Path Aliases:**
- Use `@/*` alias from `tsconfig.json` for cross-module imports

## Error Handling

**Patterns:**
- API routes validate early and return explicit 4xx JSON for invalid params (`src/app/api/crimes/range/route.ts`)
- Runtime failures usually catch/log and return fallback mock payloads (`src/app/api/crime/meta/route.ts`, `src/app/api/crime/bins/route.ts`)
- Hooks surface errors through React Query instead of swallowing (`src/hooks/useCrimeData.ts`)

## Logging

**Framework:** console + lightweight buffered logger service

**Patterns:**
- `console.error` for backend failures and critical fetch/query errors
- `console.warn` for fallback mode transitions
- study interactions use `useLogger` -> `logger.log()` in `src/hooks/useLogger.ts` and `src/lib/logger.ts`

## Comments

**When to Comment:**
- Comments are used heavily for intent and behavior contracts in stores/hooks/routes; keep them when they explain non-obvious constraints (for example buffer/range semantics)

**JSDoc/TSDoc:**
- Used on shared hooks/utilities and API contracts (`src/hooks/useCrimeData.ts`, `src/lib/db.ts`, `src/lib/stores/viewportStore.ts`)

## Function Design

**Size:**
- Small pure helper functions are preferred in `src/lib/*`
- Some feature functions/components are large orchestration blocks (for example `src/components/timeline/DualTimeline.tsx`)

**Parameters:**
- Structured options objects are common for complex APIs (`UseCrimeDataOptions`, `GenerationParams`, query builder options)

**Return Values:**
- Hooks return typed result envelopes (data/meta/loading/error)
- API handlers return JSON objects with top-level `data` + `meta` where applicable

## Module Design

**Exports:**
- Use named exports for helpers/types; default export for route/page components is common
- Store modules typically export `useXStore` plus related selectors/types

**Barrel Files:**
- Minimal barrel usage; `src/lib/queries/index.ts` is a notable barrel for query builders/types

---

*Convention analysis: 2026-03-11*
