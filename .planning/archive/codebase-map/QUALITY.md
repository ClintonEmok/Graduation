# Code Quality & Maintainability Map

**Analysis Date:** 2026-04-02
**Repository:** `neon-tiger`

## Executive Signal

- Strong automated testing footprint by count (49 test files for 343 TS/TSX files), with robust domain-level tests in query/binning/STKDE modules.
- TypeScript strict mode is enabled, but type safety is diluted in hotspots via `any`, `unknown as`, and callback-based DB interfaces.
- Complexity concentration is high in a handful of large UI/state files; maintainability risk is uneven, not uniform.
- Significant UI duplication exists across route variants (`timeslicing` vs `timeline-test-3d`) and increases change cost.
- Developer ergonomics are good for local iteration (`dev`, `typecheck`, `test`) but weaker for quality gates (no coverage command, no CI workflows detected).

---

## 1) Testing Strategy & Coverage Signals

## Tooling and execution

- Test runner: Vitest (`vitest` in `package.json`, config in `vitest.config.mts`).
- Test environment: Node (`test.environment = 'node'` in `vitest.config.mts`).
- Included test patterns: `src/**/*.test.ts`, `src/**/*.test.tsx` (`vitest.config.mts`).
- Scripts:
  - `npm run test` / `pnpm test` → `vitest` (`package.json`).
  - No dedicated coverage script found in `package.json`.

## Positive coverage signals

- High quantity of tests in core logic and state domains:
  - Query/path correctness and parameterization: `src/lib/queries.test.ts`.
  - Adaptive/STKDE algorithms: `src/lib/stkde/compute.test.ts`, `src/lib/stkde/full-population-pipeline.test.ts`, `src/lib/binning/engine.test.ts`.
  - Store behavior tests: `src/store/useStkdeStore.test.ts`, `src/store/useCoordinationStore.test.ts`, `src/store/useTimeslicingModeStore.test.ts`, `src/store/useAdaptiveStore.test.ts`.
  - Hook-focused behavior testing: `src/hooks/useCrimeData.test.ts`, `src/hooks/useSuggestionGenerator.test.ts`.
- API route testing exists but is selective:
  - Tested: `src/app/api/stkde/hotspots/route.test.ts`, `src/app/api/crimes/range/route.test.ts`.

## Gaps and risk areas

- API route coverage is low relative to route count:
  - 9 route handlers found in `src/app/api/**/route.ts`.
  - Only 2 have matching `route.test.ts`.
  - Untested routes include: `src/app/api/adaptive/global/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, `src/app/api/study/log/route.ts`.
- Some core, large UI/state files have no direct tests:
  - `src/components/timeline/DualTimeline.tsx` (1245 LOC)
  - `src/store/useSuggestionStore.ts` (768 LOC)
  - `src/components/viz/DataPoints.tsx` (687 LOC)
  - `src/app/timeslicing/components/SuggestionCard.tsx` (727 LOC)
- Coverage enforcement signal is missing:
  - No threshold config found in `vitest.config.mts`.
  - No CI workflow files detected under `.github/workflows/`.

## Testing quality observations

- Tests are generally behavior-oriented and specific (good naming, explicit scenarios), e.g. `src/hooks/useCrimeData.test.ts` and `src/lib/context-diagnostics/context-diagnostics.test.ts`.
- A number of UI tests rely on extensive module mocking and renderer wiring (e.g. `src/app/dashboard-v2/page.stkde.test.ts`), which can become brittle when module boundaries shift.

---

## 2) Linting, Formatting, and Quality Gates

## Linting

- ESLint is configured via flat config (`eslint.config.mjs`) using:
  - `eslint-config-next/core-web-vitals`
  - `eslint-config-next/typescript`
- Script exists: `lint: "eslint"` in `package.json`.

## Formatting

- No Prettier config (`.prettierrc*`) detected.
- No Biome config (`biome.json`) detected.
- Formatting appears editor/convention-driven + ESLint autofix, rather than explicitly standardized formatter policy.

## Suppressions and exceptions

- Suppression comments exist and should be tracked:
  - `src/components/viz/SlicePlane.tsx` (`@ts-ignore`)
  - `src/components/viz/DataPoints.tsx` (`eslint-disable-line @typescript-eslint/no-explicit-any`)
  - `src/app/stkde/lib/StkdeRouteShell.tsx` (`eslint-disable-next-line react-hooks/exhaustive-deps`)
  - `src/store/useAdaptiveStore.test.ts` (`eslint-disable-next-line @typescript-eslint/no-explicit-any`)

## CI / automated gates

- No repository CI workflow files detected in `.github/workflows/`.
- This means lint/type/test likely rely on local discipline rather than mandatory PR-time checks.

---

## 3) Type Safety Posture

## Strong signals

- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`).
- Path aliasing is consistent (`@/*` in `tsconfig.json`).
- Many modules define explicit domain types, especially in query/store layers.

## Erosion points

- `allowJs: true` (`tsconfig.json`) allows non-TS code paths, increasing mixed-type surface.
- `skipLibCheck: true` (`tsconfig.json`) trades compile speed for less strict dependency type validation.
- Loose typing appears in critical runtime paths:
  - DB wrapper uses `any`: `src/lib/db.ts` (`let db: any`, `Promise<any>`).
  - API/stream casting: `src/app/api/crime/stream/route.ts` uses `as unknown as BodyInit`.
  - Visualization components include broad `any` usage: `src/components/viz/TrajectoryLayer.tsx`, `src/components/viz/Trajectory.tsx`, `src/components/viz/AggregatedBars.tsx`, `src/components/viz/DataPoints.tsx`.
  - Generic index signatures with `any`: `src/components/timeline/Timeline.tsx`, `src/lib/data/types.ts`, `src/lib/adaptive-scale.ts`.

## Net assessment

- Type safety is architecturally intended but pragmatically bypassed in data/visualization integration boundaries. Main risk is silent runtime drift at IO and rendering seams.

---

## 4) Complexity Hotspots

## Largest files by LOC (selected)

- `src/components/timeline/DualTimeline.tsx` — 1245
- `src/store/useSuggestionStore.ts` — 768
- `src/app/timeslicing/components/SuggestionPanel.tsx` — 767
- `src/app/timeslicing/components/SuggestionCard.tsx` — 727
- `src/components/viz/DataPoints.tsx` — 687
- `src/lib/queries.ts` — 530
- `src/lib/stkde/compute.ts` — 461
- `src/lib/binning/engine.ts` — 459

## Maintainability impact

- Multi-responsibility concentration is high in timeline/suggestion modules:
  - UI rendering + domain formatting + interaction orchestration in single files.
  - Harder targeted refactors and higher regression probability.
- Store/action density is high in `src/store/useSuggestionStore.ts` (selection, undo, presets, history, full-auto package flow, event dispatch), indicating a “god store” trend.
- Query orchestration in `src/lib/queries.ts` is powerful but dense; boundary between query-building and execution concerns is partially blurred.

---

## 5) Duplication and Drift Risk

## High-confidence duplication

- `src/app/timeslicing/components/SuggestionCard.tsx` and `src/app/timeline-test-3d/components/SuggestionCard.tsx`
  - Near-identical structure/logic (very small diff footprint).
- `src/app/timeslicing/components/SuggestionPanel.tsx` and `src/app/timeline-test-3d/components/SuggestionPanel.tsx`
  - Large shared body with moderate drift.

## Why this matters

- Bug fixes/features in suggestion UI must be ported manually to parallel trees.
- Behavioral divergence risk grows over time (already observable in panel variant differences).

## Recommended maintainability direction

- Extract shared suggestion UI into a common module under `src/components/` or a shared route-lib directory.
- Route-level wrappers should provide configuration/composition, not duplicate internals.

---

## 6) Developer Ergonomics

## Good

- Straightforward local scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`.
- Aliased imports (`@/`) reduce brittle relative pathing (`tsconfig.json`).
- shadcn config present (`components.json`) gives predictable UI primitive conventions.

## Friction points

- `postinstall` performs patching and a DuckDB symlink operation (`package.json`), which may be environment-sensitive.
- No explicit CI workflow means contributors may get inconsistent feedback timing.
- No explicit coverage command/thresholds for quickly assessing test impact.
- Large app-level components and duplicated route variants increase onboarding and change-surface complexity.

---

## 7) Priority Findings (Top 5)

1. **Complexity concentration in oversized UI/state modules**
   - Files: `src/components/timeline/DualTimeline.tsx`, `src/store/useSuggestionStore.ts`, `src/components/viz/DataPoints.tsx`.
   - Risk: high regression surface and slower safe refactoring.

2. **Major duplication in suggestion UI across route variants**
   - Files: `src/app/timeslicing/components/SuggestionCard.tsx`, `src/app/timeline-test-3d/components/SuggestionCard.tsx`, `src/app/timeslicing/components/SuggestionPanel.tsx`, `src/app/timeline-test-3d/components/SuggestionPanel.tsx`.
   - Risk: divergence and double maintenance cost.

3. **Type-safety bypasses at integration seams despite strict TS**
   - Files: `src/lib/db.ts`, `src/app/api/crime/stream/route.ts`, `src/components/viz/*` hotspots.
   - Risk: runtime failures escaping compile-time checks.

4. **API route test coverage is sparse**
   - Files: untested routes in `src/app/api/**/route.ts` (7 of 9 routes unpaired with tests).
   - Risk: backend regressions not caught early.

5. **Quality gates are not enforced via CI/coverage policy**
   - Paths: missing `.github/workflows/*`, no coverage script/threshold in `package.json` and `vitest.config.mts`.
   - Risk: quality standards vary by contributor and environment.

---

## 8) Suggested Next Actions (Ordered)

1. **Stabilize change risk:** split `DualTimeline` and `useSuggestionStore` into smaller modules with explicit boundaries.
2. **Remove duplicated route UI:** create shared `SuggestionCard`/`SuggestionPanel` building blocks and thin wrappers.
3. **Strengthen test surface:** add tests for untested API routes starting with `crime/stream`, `crime/facets`, `study/log`.
4. **Tighten type boundaries:** replace `any` in DB/API adapters with narrow interfaces and typed result mappers.
5. **Add mandatory quality gate:** introduce CI workflow running `lint`, `typecheck`, `test`, plus coverage reporting.
