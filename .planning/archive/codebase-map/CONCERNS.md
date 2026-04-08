# Codebase Concerns

**Analysis Date:** 2026-04-02

## Risk Prioritization Method

- **Impact:** Severity if exploited/fails (`High`, `Medium`, `Low`)
- **Likelihood:** Probability under normal operation (`High`, `Medium`, `Low`)
- **Priority:** Combined urgency for remediation

## Top Priority Risks (Security + Operational)

1. **SQL injection risk in API query construction** — Impact: **High**, Likelihood: **High**, Priority: **P0**
2. **Unauthenticated, unthrottled public API surface** — Impact: **High**, Likelihood: **High**, Priority: **P0**
3. **Fail-open behavior returns mock/demo data on backend errors** — Impact: **High**, Likelihood: **Medium**, Priority: **P1**
4. **Tracked `.env` file + weak env-file ignore pattern** — Impact: **High**, Likelihood: **Medium**, Priority: **P1**
5. **DuckDB runtime patch/symlink install path is brittle** — Impact: **Medium**, Likelihood: **High**, Priority: **P1**

## Tech Debt

**Server query layer duplicated and mixed with route logic:**
- Issue: Direct SQL string assembly occurs in route handlers and in data-layer helpers, with inconsistent sanitization and parameterization.
- Files: `src/app/api/crime/stream/route.ts`, `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/meta/route.ts`, `src/lib/queries.ts`, `src/lib/queries/builders.ts`, `src/lib/queries/sanitization.ts`
- Impact: Security review becomes error-prone; fixes in one path do not protect others.
- Fix approach: Move all SQL construction behind one query-builder boundary (`src/lib/queries/*`), enforce placeholder parameters only, and ban string-interpolated SQL in `src/app/api/**/route.ts`.

**Large high-churn UI/state modules are hard to modify safely:**
- Issue: Multiple files exceed ~600 lines and mix state, side effects, and rendering logic.
- Files: `src/components/timeline/DualTimeline.tsx`, `src/store/useSuggestionStore.ts`, `src/app/timeslicing/components/SuggestionPanel.tsx`, `src/components/viz/DataPoints.tsx`, `src/hooks/useSuggestionGenerator.ts`
- Impact: Regression risk rises for feature work; localized fixes often require broad retesting.
- Fix approach: Split into domain hooks + pure render components + side-effect services; add focused tests before/after extraction.

## Known Bugs

**Study log endpoint can fail when `logs/` directory is missing:**
- Symptoms: `/api/study/log` returns 500 due to failed `appendFile` call.
- Files: `src/app/api/study/log/route.ts`
- Trigger: Fresh environment without pre-created `logs/` directory.
- Workaround: Manually create `<repo>/logs` before running.

**Facets API uses different dataset path than other crime APIs:**
- Symptoms: `/api/crime/facets` may show data inconsistent with `/api/crimes/range` or `/api/crime/stream`.
- Files: `src/app/api/crime/facets/route.ts`, `src/lib/db.ts`, `src/app/api/crime/stream/route.ts`
- Trigger: `data/crime.parquet` and `data/sources/Crimes_-_2001_to_Present_20260114.csv` diverge.
- Workaround: Keep parquet and CSV regenerated from the same source snapshot.

## Security Considerations

**SQL injection in dynamic filters (critical):**
- Risk: User-controlled query params are directly injected into SQL text.
- Files: `src/app/api/crime/stream/route.ts` (crime type list interpolation), `src/lib/duckdb-aggregator.ts` (types/districts interpolation)
- Current mitigation: Partial numeric parsing in some params; no robust escaping/parameter binding for string filters.
- Recommendations:
  - Replace string interpolation with parameterized placeholders in all dynamic clauses.
  - Centralize filters through `buildCrimeRangeFilters` in `src/lib/queries/filters.ts`.
  - Add malicious-input tests in `src/app/api/crime/stream/route.test.ts` and `src/lib/duckdb-aggregator.test.ts`.

**Missing API authentication/authorization and abuse controls:**
- Risk: All routes under `src/app/api/**/route.ts` are callable without auth, origin checks, or request quotas.
- Files: `src/app/api/crimes/range/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/stkde/hotspots/route.ts`, `src/app/api/study/log/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, `src/app/api/adaptive/global/route.ts`
- Current mitigation: Input validation exists in selected handlers only.
- Recommendations:
  - Add auth gate (session/API key) per route class.
  - Add per-IP and per-session rate limiting for high-cost endpoints (`/api/crime/stream`, `/api/stkde/hotspots`, `/api/adaptive/global`).
  - Add request-size caps for POST bodies (`/api/study/log`, `/api/stkde/hotspots`).

**Potential sensitive configuration leakage via tracked env file:**
- Risk: `.env` is currently tracked; future secrets can be accidentally committed.
- Files: `.env`, `.gitignore`
- Current mitigation: `.gitignore` ignores only `.env*.local`.
- Recommendations:
  - Ignore `.env` directly in `.gitignore`.
  - Remove tracked `.env` from VCS and rotate any previously stored secrets.
  - Use `.env.example` for non-sensitive defaults.

**Log ingestion endpoint accepts arbitrary payloads without validation:**
- Risk: Unbounded JSON array payload can cause disk growth, noisy logs, or data poisoning.
- Files: `src/app/api/study/log/route.ts`, `src/lib/logger.ts`
- Current mitigation: Only checks that payload is an array.
- Recommendations:
  - Validate each event schema and enforce max batch size.
  - Ensure `logs/` directory creation with strict file permissions.
  - Reject oversized requests and add throttling.

## Performance Bottlenecks

**Repeated full CSV scans in request path:**
- Problem: Several endpoints query `read_csv_auto(...)` per request.
- Files: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/meta/route.ts`, `src/lib/db.ts` (table creation), `src/lib/duckdb-aggregator.ts`
- Cause: Hot routes bypass persistent sorted-table/query-cache path in `src/lib/queries.ts`.
- Improvement path: Route all crime queries through `ensureSortedCrimesTable()` + cached/materialized tables; avoid request-time CSV parsing.

**Expensive API payloads with permissive limits:**
- Problem: High volume responses (up to 50k records) and large adaptive map arrays.
- Files: `src/app/api/crimes/range/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/adaptive/global/route.ts`
- Cause: High default limits and no adaptive payload budgeting on these endpoints.
- Improvement path: Add hard response-size budgeting, pagination/windowing, and client-driven chunk fetches.

## Fragile Areas

**Native DuckDB install compatibility path:**
- Files: `package.json` (`postinstall`), `patches/duckdb+1.4.4.patch`, `next.config.ts`
- Why fragile: Build depends on patched package internals and symlinked binary path (`node_modules/duckdb/lib/binding/3/duckdb.node`).
- Safe modification: Upgrade DuckDB only with lockstep patch validation and cross-platform CI matrix.
- Test coverage: No automated install/runtime smoke test in CI (no `.github/workflows/*.yml` detected).

**In-memory cache without bounds for neighbourhood endpoint:**
- Files: `src/app/api/neighbourhood/poi/route.ts`
- Why fragile: Unbounded `Map` cache can grow with unique viewport keys across process lifetime.
- Safe modification: Add LRU + max entries + memory budget + background eviction.
- Test coverage: No route test found for `src/app/api/neighbourhood/poi/route.ts`.

**Silent fallback pathways hide production failures:**
- Files: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/meta/route.ts`
- Why fragile: Errors convert to HTTP 200 with mock data warning headers, masking outage and corrupting analytics expectations.
- Safe modification: Return explicit non-2xx for backend failures in non-demo mode; gate mock fallback by environment flag.
- Test coverage: Fallback behavior is not comprehensively covered across all failure branches.

## Scaling Limits

**Per-process local file logging:**
- Current capacity: Single local JSONL append target.
- Limit: Multi-instance deployments fragment logs; local disk can fill.
- Scaling path: Move to centralized log sink (managed logging/queue), include backpressure and retention policy.
- Files: `src/app/api/study/log/route.ts`, `src/lib/logger.ts`

**Single-process in-memory caches:**
- Current capacity: Process-local map cache for neighbourhood responses.
- Limit: Cache misses across instances; memory footprint scales with request diversity.
- Scaling path: Shared cache (Redis) or deterministic edge cache keying with TTL.
- Files: `src/app/api/neighbourhood/poi/route.ts`

## Dependencies at Risk

**`duckdb@1.4.4` with local patching and symlink workaround:**
- Risk: Upgrades or environment changes can break binary loading and block all data APIs.
- Impact: Core API routes fail (`/api/crimes/range`, `/api/crime/stream`, `/api/crime/meta`, `/api/crime/bins`, `/api/adaptive/global`, `/api/stkde/hotspots`).
- Migration plan: Pin tested platform matrix, add startup health check, evaluate switching to a managed analytical backend or precomputed parquet + Arrow pipeline for production.
- Files: `package.json`, `patches/duckdb+1.4.4.patch`, `next.config.ts`, `src/lib/db.ts`

## Missing Critical Features

**No formal security middleware for API routes:**
- Problem: Missing authentication, rate limiting, and abuse prevention in production-facing endpoints.
- Blocks: Safe internet exposure and multi-tenant usage.
- Files: `src/app/api/**/route.ts`

**No CI enforcement detected:**
- Problem: No repository workflow found under `.github/workflows/*.yml`.
- Blocks: Reliable regression prevention for security/performance-sensitive paths.

**No explicit data-governance safeguards for logging endpoint:**
- Problem: Arbitrary event payloads can include unexpected PII without schema controls.
- Blocks: Compliance-ready study logging.
- Files: `src/lib/logger.ts`, `src/app/api/study/log/route.ts`

## Migration Hazards

**Dataset format/path drift across APIs:**
- Hazard: Some routes use CSV (`read_csv_auto` via `getDataPath`), others use parquet (`data/crime.parquet`).
- Files: `src/lib/db.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/facets/route.ts`
- Impact: Inconsistent results and difficult cutovers during schema evolution.
- Mitigation: Introduce a single dataset abstraction/version contract and migrate all routes through it.

**Mock-data default behavior can affect production expectations:**
- Hazard: `isMockDataEnabled` defaults to enabled when env flags are absent.
- Files: `src/lib/db.ts`
- Impact: Accidental demo-mode operation in misconfigured environments.
- Mitigation: In production, require explicit `USE_MOCK_DATA=false` with startup hard-fail when data source is unavailable.

## Test Coverage Gaps

**Untested API endpoints with operational/security impact:**
- What's not tested: `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`, `src/app/api/crime/meta/route.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/study/log/route.ts`, `src/app/api/neighbourhood/poi/route.ts`, `src/app/api/adaptive/global/route.ts`
- Files: `src/app/api/**/route.ts`
- Risk: Regressions in validation, fallback semantics, and error handling can ship undetected.
- Priority: **High**

**No tests for SQL-injection guardrails in routes that interpolate filters:**
- What's not tested: malicious `crimeTypes`, `types`, `districts` payloads.
- Files: `src/app/api/crime/stream/route.ts`, `src/lib/duckdb-aggregator.ts`
- Risk: Security defects can pass normal functional tests.
- Priority: **High**

---

*Concerns audit: 2026-04-02*
