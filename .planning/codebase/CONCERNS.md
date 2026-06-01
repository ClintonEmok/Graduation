# Codebase Concerns

**Analysis Date:** 2026-06-01

## Tech Debt

### SQL Injection Risk in DuckDB Aggregator

- **Issue:** `src/lib/duckdb-aggregator.ts` constructs SQL queries using raw string interpolation for user-supplied filter values (`types`, `districts`), while the newer `src/lib/queries/` system (builders, filters) correctly uses parameterized `?` placeholders. This creates an inconsistent and dangerous pattern.
- **Files:** `src/lib/duckdb-aggregator.ts` (lines 50-57, 66)
- **Impact:** Any API route or component that calls `getAggregatedBins()` can be exploited via SQL injection if untrusted input reaches the `types[]` or `districts[]` parameters.
- **Fix approach:** Rebuild `duckdb-aggregator.ts` to use the parameterized query patterns from `src/lib/queries/filters.ts` (which uses `?` placeholders and `buildInListFilter`). Remove the string-interpolation pattern entirely.

### Inconsistent SQL Query Patterns Across the Codebase

- **Issue:** Two different SQL construction patterns coexist:
  1. `src/lib/queries/builders.ts`, `src/lib/queries/filters.ts` — parameterized queries with `?` placeholders and `params: unknown[]` arrays (safe)
  2. `src/lib/duckdb-aggregator.ts` — raw string interpolation with template literals (dangerous)
- **Files:** Compare `src/lib/queries/filters.ts` vs `src/lib/duckdb-aggregator.ts`
- **Impact:** New developers are likely to copy the wrong pattern, introducing injection vulnerabilities.
- **Fix approach:** Deprecate `duckdb-aggregator.ts` and migrate all callers to the `queries/` module. Consider adding a lint rule that bans string interpolation in SQL-building contexts.

### 65 Dependency Vulnerabilities (38 High, 23 Moderate)

- **Issue:** `pnpm audit` reports 65 vulnerabilities. The highest-risk items:
  - Next.js 16.1.6 has a **high** severity Middleware/Proxy bypass vulnerability (GHSA-36qx-fr4f-26g5). Patch is 16.2.5.
  - `patch-package` transitively depends on `tmp` with a **high** severity path traversal vulnerability (GHSA-ph9p-34f9-6g65).
- **Files:** `package.json`, `pnpm-lock.yaml`
- **Impact:** Running `next dev` or `next start` with an unpatched Next.js exposes the app to request bypass attacks in i18n-aware routes. The `tmp` vulnerability in `patch-package` is a supply-chain risk.
- **Fix approach:** Upgrade `next` to `^16.2.5`. Evaluate whether `patch-package` is still needed (see DuckDB patch below). Run `pnpm audit --fix` where possible.

### DuckDB Native Module Workaround via patch-package

- **Issue:** `patches/duckdb+1.4.4.patch` adds `napi_versions: [3]` and changes the `module_path` template to include `{napi_build_version}`, allowing the DuckDB native binding to load. The `postinstall` script (`package.json`) further creates a symlink from `node_modules/duckdb/lib/binding/3/duckdb.node` pointing to `../duckdb.node`. This is a fragile workaround for a DuckDB npm packaging issue.
- **Files:** `patches/duckdb+1.4.4.patch`, `package.json` (postinstall script), `next.config.ts` (`serverExternalPackages: ["duckdb"]`)
- **Impact:** The symlink approach breaks if the DuckDB npm package fixes its binary path or if the Node.js NAPI version changes. The postinstall script is not idempotent and may fail in CI environments with restrictive file permissions.
- **Fix approach:** Pin to a DuckDB version that ships correct NAPI bindings. Test the postinstall script in CI. Consider a `prepare` script wrapper for robustness.

### TypeScript Compilation Errors in Test Files

- **Issue:** `npx tsc --noEmit` reveals 4 errors in 3 test files:
  - `src/app/cube-sandbox/lib/resetSandboxState.test.ts` (line 52): `WarpSlice` type is missing `source` and `warpProfileId` properties.
  - `src/lib/clustering/cluster-analysis.test.ts` (lines 9-10): Duplicate spread overrides `typeId` and `districtId`.
  - `src/store/useStkdeStore.test.ts` (lines 51, 81): `StkdeResponse` type is missing required `sliceResults` property.
- **Impact:** Tests that do not compile will fail in CI pipelines, eroding confidence in the test suite. These errors indicate type definitions have drifted from test data factories.
- **Fix approach:** Update test data builders to match their respective type definitions. Run `tsc --noEmit` as a pre-commit hook so test type errors are caught early.

### Store Bloat and Duplication (Dashboard Demo / Production Fork)

- **Issue:** The store directory contains 29 files (7,704 total lines) with significant duplication between "Demo" and "production" versions:
  - `useDashboardDemoTimeslicingModeStore.ts` (20,267 lines) vs `useTimeslicingModeStore.ts` (14,411 lines) — same domain, forked
  - `useDashboardDemoCoordinationStore.ts` (18,591 lines) vs `useCoordinationStore.ts` (4,847 lines)
  - `useDashboardDemoFilterStore.ts` (7,032 lines) vs `useFilterStore.ts` (8,409 lines)
- **Impact:** The Demo stores have grown larger than the originals they forked from, indicating scope creep. Any fix applied to one must be manually ported to the other. Reviewers and new developers must navigate duplicated logic.
- **Fix approach:** Consolidate the Dashboard Demo stores into the production stores with feature flags or a shared base. Remove dead code paths that only exist in one fork. The test files for Demo stores (which total ~2,364 lines across 4 files) should also be consolidated.

### Extremely Large Single-File Components

- **Issue:** Several components exceed 700 lines, indicating poor separation of concerns:
  - `src/app/demo/non-uniform-time-slicing/showcase.tsx` — 891 lines (single page component combining data, presentation, and business logic)
  - `src/components/timeline/DemoDualTimeline.tsx` — 857 lines (mixes D3 binning, store selectors, warp map building, and rendering)
  - `src/app/timeslicing/components/SuggestionPanel.tsx` — 765 lines
  - `src/components/viz/DataPoints.tsx` — 692 lines
- **Impact:** These components are difficult to test, review, and refactor. The non-uniform-time-slicing showcase embeds multiple dialogs, data calculation logic, and rendering in a single file.
- **Fix approach:** Extract data hooks, sub-components, and utility functions into separate files. Aim for <400 lines per component file.

### 81 `as any` Type Assertions Weakening Type Safety

- **Issue:** Despite `tsconfig.json` having `"strict": true`, the codebase uses `as any` 81+ times across 30+ files. Key offenders:
  - `src/lib/db.ts` — entire DuckDB instance typed as `any` (line 4, 58)
  - `src/components/viz/Trajectory.tsx` — Three.js objects, events typed as `any` (lines 19, 80, 144, 153)
  - `src/components/viz/TrajectoryLayer.tsx` — controls, points typed as `any` (lines 24, 38, 70)
  - `src/hooks/useCrimeStream.ts` — batch data typed as `any` (line 8)
- **Impact:** Loss of type-checking coverage in critical rendering and data pipeline paths. Refactoring becomes riskier since the compiler can't verify these paths.
- **Fix approach:** Replace `as any` with proper types. Where types are complex (e.g., Three.js events), use the library's exported types or create narrow interfaces. DuckDB should use a properly typed wrapper/repository pattern.

### Unused Dependencies Bloating Bundle

- **Issue:** `@deck.gl/aggregation-layers` and `@deck.gl/mapbox` are declared in `package.json` but have zero imports in the source code. These add ~900KB+ of unused JavaScript.
- **Files:** `package.json` (dependencies), `node_modules/` (installed but unused)
- **Impact:** Unnecessarily large `node_modules`, longer CI install times, potential confusion for new developers.
- **Fix approach:** Remove `@deck.gl/aggregation-layers` and `@deck.gl/mapbox` from `package.json`. If deck.gl integration is planned, add it when actually wired.

---

## Known Bugs

### DuckDB Table Creation Error on Cold Start

- **Symptoms:** On first launch with `USE_MOCK_DATA=false`, `ensureSortedCrimesTable()` at `src/lib/db.ts:101-108` runs `CREATE TABLE crimes_sorted AS SELECT * FROM read_csv_auto(...)`. If the CSV path is wrong or the 2.2GB file is still downloading, this fails silently and subsequent queries return no data or an error.
- **Files:** `src/lib/db.ts`, `src/app/api/crime/*/route.ts`
- **Trigger:** Cold start with a missing or partial CSV file at `data/sources/Crimes_-_2001_to_Present_20260114.csv`.
- **Workaround:** Set `USE_MOCK_DATA=true` in `.env` to bypass DuckDB entirely.

### TypeScript Errors in Test Files Prevent Reliable CI

- **Symptoms:** `npx tsc --noEmit` reports 4 errors (see Tech Debt section). These errors prevent the test suite from being a reliable safety net.
- **Files:** `src/store/useStkdeStore.test.ts`, `src/lib/clustering/cluster-analysis.test.ts`, `src/app/cube-sandbox/lib/resetSandboxState.test.ts`
- **Trigger:** Running type checking before tests, or running tests in an environment that respects `tsconfig.json` strict mode.

### Study Log Endpoint Accepts Unlimited Data

- **Symptoms:** `POST /api/study/log` at `src/app/api/study/log/route.ts` accepts any JSON array, writes it to disk without size limits, and returns `{ success: true }`. A large or malicious payload could fill the disk or cause a denial of service.
- **Files:** `src/app/api/study/log/route.ts`
- **Trigger:** Posting a large payload to the endpoint.
- **Workaround:** Only accessible to client-side code; not exposed externally without deployment configuration.

---

## Security Considerations

### SQL Injection in `duckdb-aggregator.ts`

- **Risk:** `src/lib/duckdb-aggregator.ts:51` constructs `WHERE "Primary Type" IN ('THEFT','BATTERY')` via string interpolation. If `types` array values originate from user-controlled input (URL params, filter controls, store state populated from API responses), an attacker can inject arbitrary SQL.
- **Files:** `src/lib/duckdb-aggregator.ts` (lines 48-57, 66)
- **Current mitigation:** The filters are populated from Zustand store state, which is client-side. However, if an API route wraps this function, the injection surface expands to HTTP parameters.
- **Recommendations:** Replace with parameterized queries using `src/lib/queries/filters.ts`. Add a lint rule enforcing parameterized queries for all DuckDB interactions.

### Unauthenticated Study Log Endpoint

- **Risk:** `POST /api/study/log` writes arbitrary JSON to disk with no authentication, rate limiting, or payload size validation. This could be used to fill disk space, log spam, or (with crafted JSON) potentially exploit `JSON.stringify` or `appendFile` edge cases.
- **Files:** `src/app/api/study/log/route.ts`
- **Current mitigation:** The endpoint is only reachable by client-side study session code, which sends structured data.
- **Recommendations:** Add a maximum payload size check (e.g., reject payloads >1MB). Add rate limiting if the app is publicly deployed. Consider rotating the log file to prevent unbounded growth (currently ~312KB).

### Single DuckDB Instance with Global Mutable State

- **Risk:** `src/lib/db.ts:4` stores a global `let db: any = null` reference. This means all concurrent requests share a single DuckDB connection, which is not thread-safe. If two API routes query simultaneously, one may close or error the connection mid-query.
- **Files:** `src/lib/db.ts`
- **Current mitigation:** DuckDB's Node binding handles concurrent queries with internal queuing, but the global mutable pattern is fragile if connection management needs to change (e.g., for serverless deployment).
- **Recommendations:** Wrap in a lazy singleton that creates new connections for concurrent access if DuckDB's Node API supports it. At minimum, add a connection pool or document the single-connection constraint.

---

## Performance Bottlenecks

### 2.2GB CSV Queried via `read_csv_auto` on Every API Call

- **Problem:** Multiple API routes (`src/app/api/adaptive/bursts/route.ts`, `src/app/api/stkde/hotspots/route.ts`, etc.) and the aggregator (`src/lib/duckdb-aggregator.ts`) read directly from the source CSV file using `read_csv_auto`. The `crimes_sorted` table mitigates this for some queries (`src/lib/db.ts:101-121`), but `duckdb-aggregator.ts` calls `read_csv_auto` on every invocation.
- **Files:** `src/lib/duckdb-aggregator.ts` (line 75), `src/lib/db.ts` (lines 103-108)
- **Cause:** The aggregator reads from `read_csv_auto('${dataPath}')` on every call rather than querying the DuckDB-native table.
- **Improvement path:** Have `duckdb-aggregator.ts` use the `crimes_sorted` table (or the persisted DuckDB database) instead of re-parsing the CSV. Also add materialized aggregations for common time ranges.

### Sequential Burst Bin Processing

- **Problem:** `src/app/api/adaptive/bursts/route.ts:206-221` processes burst bins in "batches of 4" but the individual bin computations are sequential within each batch (`for...of` with `await`). Each bin triggers 2-4 separate DuckDB queries.
- **Files:** `src/app/api/adaptive/bursts/route.ts` (lines 206-222)
- **Cause:** The loop uses sequential `await` per partition, converting a potential parallel operation into a serial bottleneck.
- **Improvement path:** Run partition queries in parallel using `Promise.all()` within each batch. Add a DuckDB CPU budget check to prevent oversubscription.

### 29 Zustand Stores with Cross-Store Subscriptions

- **Problem:** The codebase has 29 store files (7,704 lines). Components that subscribe to multiple stores via `useStore` or direct hook calls re-render when any slice changes. The Dashboard Demo components (`DemoDualTimeline.tsx` at line 4-20) import from 6+ stores.
- **Files:** All files under `src/store/`
- **Cause:** Fine-grained state separation without a coordination layer. Each store is independently created with Zustand's `create()`, so there is no built-in batch update mechanism.
- **Improvement path:** Use Zustand's `subscribeWithSelector` to minimize re-renders or consolidate related state into fewer stores. Consider using a single store with multiple slices/subsets.

### No `strictNullChecks` or `noUncheckedIndexedAccess` in tsconfig

- **Problem:** `tsconfig.json` sets `"strict": true` but does not enable `strictNullChecks`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes`. This means array access (`arr[i]`) returns `T` instead of `T | undefined`, and optional properties can be accessed without checking.
- **Files:** `tsconfig.json`
- **Cause:** Next.js default strict does not enable these sub-flags.
- **Improvement path:** Enable `noUncheckedIndexedAccess` to catch out-of-bounds array access. Enable `exactOptionalPropertyTypes` to catch undefined property access.

---

## Fragile Areas

### DuckDB Postinstall Symlink + patch-package

- **Files:** `patches/duckdb+1.4.4.patch`, `package.json` (postinstall script)
- **Why fragile:** The symlink `ln -sf ../duckdb.node node_modules/duckdb/lib/binding/3/duckdb.node` is highly dependant on the DuckDB internal directory structure. Any DuckDB version bump that changes the binary layout or removes the `lib/binding/` directory will break the build. The error message would be cryptic (module not found).
- **Safe modification:** When upgrading `duckdb`, verify the patch still applies and the symlink target exists. Before removing `patch-package`, confirm DuckDB's npm package has fixed its NAPI binding path.
- **Test coverage:** None. No test validates that the DuckDB binary loads correctly.

### Demo Store Fork Divergence

- **Files:** `src/store/useDashboardDemoTimeslicingModeStore.ts` vs `src/store/useTimeslicingModeStore.ts` (and similar pairs)
- **Why fragile:** Logic fixes applied to the production store must be manually copied to the Demo variant. The Demo stores have grown larger than their counterparts, meaning extra functionality exists only in Demo and may be lost if Demo is deprecated.
- **Safe modification:** Before modifying any shared logic, check both the Demo and production versions. Consider creating a shared base store with features toggled via props/context.
- **Test coverage:** Demo stores have tests (e.g., `useDashboardDemoTimeslicingModeStore.test.ts` at 420 lines), but they test different behavior than the production store tests. Consolidation would reduce overall test maintenance.

### Large Rendering Components with Three.js

- **Files:** `src/components/viz/DataPoints.tsx` (692 lines), `src/components/viz/AggregatedBars.tsx`, `src/app/timeline-test-3d/components/TimeSlices3D.tsx` (595 lines)
- **Why fragile:** Three.js rendering code is tightly coupled with React lifecycle (useFrame, useMemo, useEffect). A small change to data structures (e.g., `CrimeRecord` format change) can break 3D rendering silently (no compile error for Three.js types used as `any`).
- **Safe modification:** Change data transforms in a separate function and unit-test the output. Use the Three.js devtools to verify rendering output after changes.
- **Test coverage:** Minimal. `DataPoints.tsx` has no unit test file; rendering is only validated via visual inspection.

---

## Scaling Limits

### DuckDB Connection Capacity

- **Current capacity:** Single global DuckDB connection (`src/lib/db.ts:4`, `let db: any = null`).
- **Limit:** If two API requests attempt queries simultaneously, they queue on the same connection. Under load (e.g., 5+ concurrent users), response times will degrade linearly.
- **Scaling path:** Implement a connection pool. For serverless deployment, consider using DuckDB WASM (which supports multiple instances) instead of the Node binary binding.

### Hotspot Computation Memory Usage

- **Current capacity:** `src/app/api/adaptive/bursts/route.ts` samples up to 50,000 points per query and processes 4 batches sequentially.
- **Limit:** The STKDE pipeline (`src/lib/stkde/compute.ts`, `src/lib/stkde/full-population-pipeline.ts`) loads all crime records matching the date range into memory. For a full-year query with 8.5M total records, memory could exceed 2GB.
- **Scaling path:** Implement progressive loading with DuckDB window functions. Pre-aggregate by day/week and compute STKDE on aggregates, then refine on full data for hotspot regions only.

---

## Dependencies at Risk

| Package | Risk | Impact | Migration |
|---------|------|--------|-----------|
| `duckdb` 1.4.4 | Native binary requires platform-specific build. Patch file needed for NAPI binding. | App cannot start without DuckDB binary. No serverless support. | Evaluate DuckDB WASM (`@duckdb/duckdb-wasm`) for browser-based queries, or use a DuckDB server connector. |
| `next` 16.1.6 | High-severity security advisory (GHSA-36qx-fr4f-26g5). Middleware bypass in Pages Router with i18n. | Request bypass in middleware-protected routes. | Upgrade to `>=16.2.5`. |
| `patch-package` 8.0.1 | Transitively depends on `tmp` with path traversal vulnerability (GHSA-ph9p-34f9-6g65). | Supply-chain risk. | Remove once DuckDB patch is no longer needed. |
| `@deck.gl/*` ^9.3.2 | Zero imports in source code. Unused dependency bloat. | Wasted install time and bundle analysis time. | Remove from dependencies. |

---

## Configuration / Complexity Risks

### Environment Variable Ambiguity

- **Issue:** `src/lib/db.ts:9` checks `process.env.USE_MOCK_DATA ?? process.env.DISABLE_DUCKDB` — two different env vars that control the same behavior. `USE_MOCK_DATA=true` and `DISABLE_DUCKDB=true` mean the same thing, but `DISABLE_DUCKDB=false` with `USE_MOCK_DATA` unset would disable DuckDB (because `''.trim()` is falsy, `if (!raw) return true`).
- **Files:** `src/lib/db.ts` (line 8-14), `.env`
- **Impact:** Confusing behavior — setting `DISABLE_DUCKDB=false` actually disables DuckDB. The `isMockDataEnabled()` function defaults to `true` (mock mode) when no env var is set, which may surprise developers expecting live data.
- **Fix approach:** Consolidate to a single env var (`USE_MOCK_DATA`), remove `DISABLE_DUCKDB`. Use a boolean parser that treats `false`, `0`, `no` as explicit opt-out.

### Test Environment Misconfiguration

- **Issue:** `vitest.config.mts` sets `environment: 'node'` but some components use `jsdom` APIs (browser globals). When tests import R3F (`@react-three/fiber`) or MapLibre components, they may fail silently or produce false passes because the DOM environment is missing.
- **Files:** `vitest.config.mts`, `src/components/viz/*.test.tsx`
- **Impact:** Tests for 3D and map components may not accurately test rendering behavior. The test suite passes but gives false confidence.
- **Fix approach:** Configure component tests with `environment: 'jsdom'` or `@testing-library/react` where DOM interaction is needed. Add environment annotations per test file.

### Study Sessions Log Files Lack Rotation

- **Issue:** `src/app/api/study/log/route.ts` appends to `logs/study-sessions.jsonl` indefinitely. The file is currently 312KB but will grow unboundedly with usage.
- **Files:** `src/app/api/study/log/route.ts`, `logs/study-sessions.jsonl`
- **Impact:** Disk space exhaustion over extended use. No mechanism to archive or truncate old sessions.
- **Fix approach:** Add log rotation (e.g., split by date). Consider using the study_log table in DuckDB instead of flat files.

---

## Test Coverage Gaps

### Web Workers Barely Tested

- **What's not tested:** `src/workers/kdeSlice.worker.ts` has no test file. `src/workers/adaptiveTime.worker.ts` and `stkdeHotspot.worker.ts` each have one test file, but coverage focuses on basic message passing, not edge cases (empty data, malformed messages, termination during computation).
- **Files:** `src/workers/`
- **Risk:** Worker crashes or incorrect computation on edge-case data go undetected. The main thread has no fallback if a worker returns unexpected results.
- **Priority:** Medium

### Store Integration Tests Missing

- **What's not tested:** Cross-store interaction (e.g., how `useSliceDomainStore` state changes affect `useSuggestionStore` subscriptions). Tests exist for individual stores but not for the coordination flow.
- **Files:** `src/store/`
- **Risk:** Changes to one store that break another store's behavior are caught only by manual testing.
- **Priority:** Medium

### Three.js Component Rendering Untested

- **What's not tested:** `src/components/viz/DataPoints.tsx`, `src/components/viz/AggregatedBars.tsx`, `src/components/viz/SlicePlane.tsx`, `src/components/viz/ClusterLabels.tsx` — no rendering tests exist. These rely on visual inspection.
- **Files:** `src/components/viz/`
- **Risk:** Refactoring the data pipeline or Three.js version upgrade can silently break rendering. The 3D scene may render incorrectly but tests still pass.
- **Priority:** Medium

### Mock Data Drift from Real Schema

- **What's not tested:** The mock data generators (`src/lib/queries.ts:31-57`, `src/lib/duckdb-aggregator.ts:15-34`, `src/lib/mockData.ts`) produce simplified data that may not match the structure of real DuckDB query results. No test verifies mock vs real data equivalence.
- **Files:** `src/lib/queries.ts`, `src/lib/mockData.ts`, `src/lib/duckdb-aggregator.ts`
- **Risk:** Components that work perfectly with mock data may break when connected to real DuckDB, because the mock omits nulls, edge values, or unexpected types present in the CSV.
- **Priority:** Low

---

*Concerns audit: 2026-06-01*
