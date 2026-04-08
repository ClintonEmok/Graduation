# Codebase Concerns

**Analysis Date:** 2026-04-08

## Tech Debt

**SQL assembly across crime endpoints:**
- Issue: `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/stream/route.ts`, and `src/app/api/crime/facets/route.ts` still build SQL with string interpolation for user-controlled filters.
- Files: `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`
- Impact: query construction is brittle and hard to audit; malicious filter values can escape the intended query shape.
- Fix approach: move all filter construction to parameterized helpers in `src/lib/queries/*` and forbid raw string concatenation in route handlers.

**Mock-first failure handling:**
- Issue: `src/lib/db.ts` defaults to mock mode when env flags are absent, and `src/app/api/crime/meta/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, and `src/app/api/stkde/hotspots/route.ts` downgrade real errors to demo responses.
- Files: `src/lib/db.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, `src/app/api/stkde/hotspots/route.ts`
- Impact: missing data files, DB failures, and bad deployments present as valid app state instead of outages.
- Fix approach: separate demo-mode from error fallback, and surface non-demo failures as explicit 5xx responses or visible UI errors.

**Overgrown rendering/controller modules:**
- Issue: `src/components/timeline/DualTimeline.tsx` (1285 lines), `src/components/viz/DataPoints.tsx` (687 lines), and `src/app/stkde/lib/StkdeRouteShell.tsx` (443 lines) mix fetching, state syncing, geometry, and interaction logic.
- Files: `src/components/timeline/DualTimeline.tsx`, `src/components/viz/DataPoints.tsx`, `src/app/stkde/lib/StkdeRouteShell.tsx`
- Impact: changes in one behavior area can regress unrelated interactions.
- Fix approach: extract data prep, interaction state, and rendering primitives into smaller modules.

## Known Bugs

**Unauthenticated log ingestion:**
- Symptoms: `src/app/api/study/log/route.ts` appends any JSON array to `logs/study-sessions.jsonl`.
- Files: `src/app/api/study/log/route.ts`, `src/lib/logger.ts`
- Trigger: any client that can POST to the route.
- Workaround: none in code.
- Fix approach: add auth, schema validation, rate limits, and size caps before writing to disk.

**Process-local cache growth and cache misses:**
- Symptoms: `src/app/api/neighbourhood/poi/route.ts` keeps a module-level `Map` for 24h.
- Files: `src/app/api/neighbourhood/poi/route.ts`
- Trigger: many distinct bounds requests or multiple server instances.
- Workaround: none.
- Fix approach: cap entries and move to shared cache if the route stays hot.

**Demo mode can appear unintentionally:**
- Symptoms: `src/lib/db.ts` returns mock mode when `USE_MOCK_DATA`/`DISABLE_DUCKDB` is unset.
- Files: `src/lib/db.ts`, `src/app/api/crime/meta/route.ts`
- Trigger: missing env configuration.
- Workaround: manually set env flags.
- Fix approach: require explicit demo opt-in.

## Security Considerations

**SQL injection surface:**
- Risk: `types` and `districts` are interpolated into SQL in `src/lib/duckdb-aggregator.ts` and `src/app/api/crime/stream/route.ts`.
- Files: `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`
- Current mitigation: some endpoints clamp numeric params, but string filters are not parameterized here.
- Recommendations: use placeholders everywhere and escape/allowlist filter values before query construction.

**Log endpoint data exposure:**
- Risk: `src/lib/logger.ts` sends session/participant identifiers, and `src/app/api/study/log/route.ts` persists them without access control.
- Files: `src/lib/logger.ts`, `src/app/api/study/log/route.ts`
- Current mitigation: none beyond client-side batching.
- Recommendations: treat these events as sensitive telemetry, add auth and retention controls, and avoid storing raw identifiers unless required.

## Performance Bottlenecks

**Repeated full-table/CSV scans:**
- Problem: `src/app/api/crime/meta/route.ts` scans the dataset multiple times; `src/app/api/crime/stream/route.ts` reads and serializes up to 50k rows per request; `src/lib/db.ts` may build a sorted table with a full `ORDER BY`.
- Files: `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/lib/db.ts`
- Cause: each request re-derives metadata or streams large result sets from source data.
- Improvement path: persist derived metadata, precompute indexes, and page/stream data incrementally.

**Large STKDE payloads are trimmed after fetch:**
- Problem: `src/app/stkde/lib/StkdeRouteShell.tsx` and `src/app/dashboard-v2/hooks/useDashboardStkde.ts` serialize responses, measure payload size, then sort/slice heatmap cells client-side.
- Files: `src/app/stkde/lib/StkdeRouteShell.tsx`, `src/app/dashboard-v2/hooks/useDashboardStkde.ts`
- Cause: response-size guards happen after network transfer.
- Improvement path: cap or page at the API layer before serialization.

**Unbounded in-memory cache:**
- Problem: `src/app/api/neighbourhood/poi/route.ts` stores cached summaries in a module-level `Map` with no max size.
- Files: `src/app/api/neighbourhood/poi/route.ts`
- Cause: cache eviction is time-based only.
- Improvement path: add size-based eviction or an external cache.

## Fragile Areas

**Type escapes around core data paths:**
- Files: `src/lib/data/types.ts`, `src/lib/db.ts`, `src/app/api/crime/facets/route.ts`, `src/components/viz/Trajectory.tsx`, `src/components/viz/DataPoints.tsx`
- Why fragile: `any`, `[key: string]: any`, `as any`, and `@ts-ignore` appear at the database, shader, and event boundaries.
- Safe modification: keep these boundaries narrow and add explicit adapters before data reaches rendering code.
- Test coverage: type-related regressions are easy to miss because runtime tests do not exercise compile-time guarantees.

**Mouse/shader interaction code is tightly coupled to DOM and WebGL internals:**
- Files: `src/components/viz/DataPoints.tsx`, `src/components/viz/Trajectory.tsx`, `src/components/viz/SlicePlane.tsx`
- Why fragile: pointer events, instance IDs, and shader hooks are all coordinated manually.
- Safe modification: change these in small steps and keep interaction tests close to the affected component.
- Test coverage: no direct tests cover every pointer/shader branch.

## Test Coverage Gaps

**No direct coverage detected for the study logging path:**
- What's not tested: `src/app/api/study/log/route.ts` and `src/lib/logger.ts`
- Files: `src/app/api/study/log/route.ts`, `src/lib/logger.ts`
- Risk: payload growth, malformed input, and file-write failures can ship unnoticed.
- Priority: high

**No direct route tests detected for several fallback-heavy APIs:**
- What's not tested: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/neighbourhood/poi/route.ts`
- Files: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/neighbourhood/poi/route.ts`
- Risk: mock fallbacks and query construction regressions can hide behind 200 responses.
- Priority: high

**Very large UI modules are hard to cover exhaustively:**
- What's not tested: interaction branches in `src/components/timeline/DualTimeline.tsx` and `src/components/viz/DataPoints.tsx`
- Files: `src/components/timeline/DualTimeline.tsx`, `src/components/viz/DataPoints.tsx`
- Risk: regressions in one mode can break unrelated timeline/map behaviors.
- Priority: medium

---

*Concerns audit: 2026-04-08*
