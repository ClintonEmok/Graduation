# Coding Conventions

**Analysis Date:** 2026-04-08

## Naming Patterns

**Files:**
- React components use `PascalCase.tsx` in `src/components/**` and `src/app/**` (for example `src/components/dashboard/DashboardHeader.tsx`, `src/app/stats/page.tsx`).
- Hooks use `use*.ts` / `use*.tsx` (`src/hooks/useCrimeData.ts`, `src/components/timeline/hooks/useBrushZoomSync.ts`).
- Tests live beside implementation with a `.test.ts` or `.test.tsx` suffix (`src/lib/queries.test.ts`, `src/app/api/crimes/range/route.test.ts`).

**Functions:**
- Use `camelCase` for helpers and exported functions (`queryCrimesInRange` in `src/lib/queries.ts`, `parseCsvFilterParam` in `src/app/api/crimes/range/route.ts`).
- Name React components and store hooks in PascalCase (`DashboardHeader`, `useFilterStore`).
- Prefer verb-first action names in stores (`setTimeRange`, `clearSpatialBounds`, `savePreset` in `src/store/useFilterStore.ts`).

**Variables:**
- Use descriptive nouns for state and derived values (`bufferedRange`, `workflowPhase`, `selectedHotspotId`).
- Use `const` by default; `let` appears only for mutable local flow (`src/lib/queries.ts`, `src/hooks/useCrimeData.ts`).

**Types:**
- Export interfaces/types near the top of the file (`CrimeRecord` re-exported from `src/lib/queries.ts`, `FilterPreset` in `src/store/useFilterStore.ts`).
- Use `Readonly<...>` and explicit object shapes for component props when useful (`src/app/layout.tsx`).

## Code Style

**Formatting:**
- ESLint is the only explicit code-quality tool (`eslint.config.mjs`), with Next.js core-web-vitals and TypeScript rules.
- No Prettier config is present; follow the surrounding file style.
- Source files are mixed in semicolon/quote style across the repo (`src/hooks/useCrimeData.ts` vs `src/app/layout.tsx`), so preserve local style when editing.

**Layout:**
- Keep imports grouped by external packages first, then `@/` aliases, then relative imports (`src/app/layout.tsx`, `src/lib/queries.ts`).
- Prefer small pure helpers above larger exported operations (`normalizeRange`, `clamp`, `buildBufferedRange`).
- Use early returns for invalid input and guard clauses for empty state (`src/store/useFilterStore.ts`, `src/app/api/crimes/range/route.ts`).

## Import Organization

**Order:**
1. Framework/runtime imports (`next/server`, `react`, `vitest`).
2. Third-party packages (`zustand`, `@tanstack/react-query`, `radix-ui`).
3. Local `@/` aliases.
4. Relative imports for nearby modules/tests.

**Path Aliases:**
- `@/*` maps to `./src/*` in `tsconfig.json` and is used throughout app, component, and test code (`src/app/layout.tsx`, `src/app/api/crimes/range/route.test.ts`).

## Error Handling

**Patterns:**
- Route handlers validate inputs with explicit 400 responses before any data work (`src/app/api/crimes/range/route.ts`).
- Async helpers wrap external work in `try/catch`, log with `console.error`, and rethrow or return a structured failure (`src/lib/queries.ts`, `src/hooks/useCrimeData.ts`).
- Store actions return `null`/`void` for invalid user input instead of throwing (`savePreset`, `renamePreset` in `src/store/useFilterStore.ts`).
- Use fallback values for invalid or missing runtime data (`FALLBACK_EPOCH_RANGE` in `src/hooks/useCrimeData.ts`, `isMockDataEnabled` in `src/lib/db.ts`).

## Logging

**Framework:** `console`

**Patterns:**
- Log initialization and unexpected failures in data-access code (`src/lib/db.ts`, `src/lib/queries.ts`).
- Log hook/query diagnostics sparingly and close to the data boundary (`src/hooks/useCrimeData.ts`).

## Comments

**When to Comment:**
- Use comments for intent, contracts, and environment/runtime constraints (`runtime = 'nodejs'` in `src/app/api/crimes/range/route.ts`, DuckDB notes in `src/lib/db.ts`).
- Prefer short comments over long prose; inline explanatory comments are common in store and API code.

## Function Design

**Size:**
- Keep public entry points thin and delegate normalization, building, and persistence to helpers (`src/lib/queries.ts`, `src/app/api/crimes/range/route.ts`).

**Parameters:**
- Pass plain objects for multi-option APIs (`queryCrimesInRange(..., { limit, sampleStride, crimeTypes, districts })`).
- Use tuples for ordered ranges (`[start, end]` in `src/store/useFilterStore.ts`, `src/hooks/useCrimeData.ts`).

**Return Values:**
- Return normalized domain objects from boundaries, not raw DB rows (`src/lib/queries.ts`).
- Favor structured response payloads with `data` + `meta` in APIs (`src/app/api/crimes/range/route.ts`).

## Module Design

**Exports:**
- Export primary public functions from the module file and keep supporting helpers local unless tests need them (`src/lib/queries.ts`, `src/app/api/crimes/range/route.ts`).
- Re-export types next to public helpers when they are part of the module contract (`src/lib/queries.ts`).

**Barrel Files:**
- Barrel-style modules exist in feature folders (`src/lib/queries/index.ts`); prefer them when a feature already exposes a public surface.

---

*Convention analysis: 2026-04-08*
