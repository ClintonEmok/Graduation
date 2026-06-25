# Codebase Concerns

**Analysis Date:** 2026-06-25

## Tech Debt

### SQL Injection in DuckDB Aggregator (`duckdb-aggregator.ts`)
- **Issue:** User-supplied `types` and `districts` filter values are interpolated directly into SQL strings with single-quote wrapping instead of parameterized queries.
- **Files:** `src/lib/duckdb-aggregator.ts` (lines 50-56)
- **Impact:** An attacker controlling query parameters can inject arbitrary DuckDB SQL. While DuckDB is local/offline, this still enables privilege escalation via URL-crafted requests and could be exploited if the app is exposed.
- **Fix approach:** Change to parameterized query binding (`?` placeholders) consistent with `src/lib/queries/builders.ts` and `src/lib/stkde/full-population-pipeline.ts`.

### Untested API Routes (8 of 13 route handlers)
- **Issue:** Majority of API handlers have zero test coverage.
- **Files:**
  - `src/app/api/adaptive/bursts/route.ts` - Burst detection endpoint
  - `src/app/api/adaptive/global/route.ts` - Global adaptive maps
  - `src/app/api/crime/around/route.ts` - Crime proximity query
  - `src/app/api/crime/bins/route.ts` - 3D bin aggregation
  - `src/app/api/crime/facets/route.ts` - Faceted filter data
  - `src/app/api/crime/stats-summary/route.ts` - Statistics pipeline
  - `src/app/api/crime/stream/route.ts` - Arrow IPC stream
  - `src/app/api/neighbourhood/poi/route.ts` - Point-of-interest data
- **Impact:** Breaking changes, regressions, and edge-case failures in these critical data APIs go undetected.
- **Fix approach:** Add integration tests per route handler using the `vi.mock('@/lib/db')` pattern already established in `stkde/hotspots/route.test.ts`.

### Silent Failure Masking (All API Routes)
- **Issue:** All API routes catch errors and return HTTP 200 with mock/fallback data and an `X-Data-Warning` header. This hides real failures (DuckDB crashes, disk full, corrupt CSV) from clients.
- **Files:** All route handlers in `src/app/api/` (e.g., `stats-summary/route.ts` line 304-312, `stream/route.ts` line 155-172)
- **Impact:** Production issues are invisible to monitoring; errors surface only in server console logs. The mock data can look plausible enough that users don't notice the `X-Data-Warning` header.
- **Fix approach:** Return 5xx for unrecoverable errors; reserve mock fallback only for graceful degradation in the demo/evaluation mode.

### Parallel API Route Implementations (`/api/crime/` vs `/api/crimes/range`)
- **Issue:** Two API path patterns exist with different implementation strategies. `/api/crime/stream`, `/api/crime/meta`, `/api/crime/overview`, `/api/crime/bins`, `/api/crime/stats-summary`, `/api/crime/around`, `/api/crime/facets` (singular, 7 routes) directly use `read_csv_auto` against the CSV file. `/api/crimes/range` (plural, 1 route) uses `lib/queries` with the optimized `crimes_sorted` table.
- **Files:** `src/app/api/crime/` vs `src/app/api/crimes/`
- **Impact:** Code duplication, inconsistent optimization, different error handling patterns. The singular routes bypass the zone-map optimization built into `crimes_sorted`.
- **Fix approach:** Consolidate all data access behind `src/lib/queries/`; retire the `read_csv_auto`-based routes or refactor them to use the query builder layer.

### Excessive `any` Usage (91+ instances)
- **Issue:** Widespread use of `any`, `as any`, `@ts-ignore`, and `@ts-expect-error` defeats TypeScript safety guarantees.
- **Files:** Concentrated in:
  - `src/components/viz/` - Three.js/R3F components (Trajectory, TrajectoryLayer, ClusterLabels, SlicePlane, DataPoints, SimpleCrimePoints, SelectedWarpSliceOverlay)
  - `src/hooks/useCrimeStream.ts` - untyped batch data
  - `src/app/api/crime/` - DuckDB callback type casts
  - `src/app/api/crime/stream/route.ts` line 120-121 - `(db.all as any)(...)`
  - `src/lib/data/types.ts` line 9 - `[key: string]: any`
  - `src/lib/adaptive-scale.ts` line 6 - `[key: string]: any`
  - Test files using `as any` for mock data
- **Impact:** Type errors that would be caught at build time can slip through; refactoring is riskier.
- **Fix approach:** Type the DuckDB driver interface properly (already partially done in `db.ts` lines 4-8 but not used consistently); add R3F-specific types for Three.js internals.

### Large Components Needing Decomposition
- **Issue:** Several components exceed 500+ lines, making them hard to maintain, test, and reason about.
- **Files:**
  - `src/components/dashboard-demo/DemoSlicePanel.tsx` (854 lines)
  - `src/app/demo/non-uniform-time-slicing/showcase.tsx` (891 lines)
  - `src/app/stkde-3d/components/StkdeSliceStack.tsx` (833 lines)
  - `src/components/dashboard-demo/DemoInspectPanel.tsx` (675 lines)
  - `src/components/timeline/DemoDualTimeline.tsx` (826 lines)
  - `src/components/timeline/DualTimeline.tsx` (725 lines)
  - `src/app/timeslicing/components/SuggestionPanel.tsx` (765 lines)
  - `src/components/viz/DataPoints.tsx` (692 lines)
  - `src/app/timeline-test/page.tsx` (672 lines)
  - `src/components/binning/BinningControls.tsx` (552 lines)
  - `src/lib/stkde/compute.ts` (565 lines)
  - `src/lib/queries.ts` (530 lines)
- **Impact:** High cognitive load for modifications; increased defect risk; poor testability.
- **Fix approach:** Extract sub-components and utility hooks per separation of concerns (e.g., DataPoints can split rendering, interaction, and shader logic).

## Known Bugs

### Zone Map Optimization Bypassed by Multiple Routes
- **Symptoms:** Queries on the full CSV take longer than necessary because most API routes bypass the `crimes_sorted` table (which has zone-map optimization via `ORDER BY "Date"`). Only `/api/crimes/range` uses it.
- **Files:** `src/app/api/crime/stream/route.ts`, `meta/route.ts`, `overview/route.ts`, `stats-summary/route.ts`, `around/route.ts`, `src/lib/duckdb-aggregator.ts`
- **Trigger:** Any request hitting these endpoints when DuckDB is enabled.
- **Workaround:** None; the optimization infrastructure exists (`ensureSortedCrimesTable()` in `src/lib/db.ts`) but is underutilized.

### Mock Data Not Deterministic (Seeded Random Not Used Consistently)
- **Symptoms:** Mock data generically uses `Math.random()` (e.g., `duckdb-aggregator.ts` line 19-30, `bins/route.ts` line 16-27, `stream/route.ts` line 19-39). `lib/queries.ts` uses a deterministic seeded random. This means mock-based tests can be flaky.
- **Files:** `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/bins/route.ts`, `src/app/api/crime/stream/route.ts`
- **Trigger:** Any test or demo using these mock generators.
- **Workaround:** The `lib/queries.ts` `generateMockCrimeRecords()` uses seeded random correctly — port that pattern.

## Security Considerations

### No Input Validation Library for API Routes
- **Risk:** API routes parse query parameters manually with `parseInt`, `parseFloat`, and ad-hoc validation. No schema validation library (zod, yup) is used. This creates inconsistent validation behavior and potential for unvalidated numeric inputs causing crashes.
- **Files:** All API route handlers in `src/app/api/`
- **Current mitigation:** Some routes validate epoch ranges (`stats-summary/route.ts` lines 109-121); `STKDE` route has a custom `validateAndNormalizeStkdeRequest` function. Most others have minimal or no validation.
- **Recommendations:** Adopt a validation library (zod recommended — already compatible with TS) for all public API route inputs.

### Secret/Env Exposure Risk
- **Risk:** The `.env` file contains only `USE_MOCK_DATA=false` but `.gitignore` only ignores `.env*.local` files. The `.env` file is NOT in `.gitignore`, meaning environment configuration is committed.
- **Files:** `.env` (committed), `.gitignore` (line 27: `# local env files` but only `*.env*.local` is ignored)
- **Current mitigation:** No sensitive credentials are currently stored in `.env`, but the pattern is risky.
- **Recommendations:** Add `.env` to `.gitignore` and create `.env.example` for documentation.

## Performance Bottlenecks

### DuckDB CSV Re-scanning on Every Request
- **Problem:** Multiple API routes execute `read_csv_auto('${dataPath}')` on every request. For an 8.5M-row CSV, this involves full file parsing, type inference, and no partition pruning (no zone map).
- **Files:** `src/app/api/crime/stream/route.ts`, `stats-summary/route.ts`, `meta/route.ts`, `overview/route.ts`, `around/route.ts`, `src/lib/duckdb-aggregator.ts`
- **Cause:** These routes do not use the `crimes_sorted` table or `ensureSortedCrimesTable()`.
- **Improvement path:** Route all queries through `src/lib/queries/` which uses the sorted table. The `ensureSortedCrimesTable()` function creates a zone-map-optimized table once per server session.

### Inefficient Data Serialization in Stream Route
- **Problem:** The `/api/crime/stream` route fetches all matching rows into an array, then serializes the entire array through `tableFromJSON` + `tableToIPC`. For large ranges this means full materialization in memory before any byte is sent to the client.
- **Files:** `src/app/api/crime/stream/route.ts` (lines 100-153)
- **Cause:** DuckDB's Node.js API does not support streaming cursors natively.
- **Improvement path:** Implement cursor-based pagination (already available in `lib/queries.ts` via `LIMIT/OFFSET`) and send smaller Arrow batches.

### No Pagination in `/api/crime/stats-summary`
- **Problem:** The stats-summary route executes 7 separate SQL queries sequentially against the full CSV for every request, even for time ranges spanning decades.
- **Files:** `src/app/api/crime/stats-summary/route.ts` (lines 148-239)
- **Cause:** Each dimension (type, hour, day, month, district, total) is a separate `db.all()` call.
- **Improvement path:** Combine queries where possible (single-pass aggregation with multiple `GROUP BY` or use DuckDB's `GROUPING SETS`).

## Fragile Areas

### DuckDB Connection Management
- **Files:** `src/lib/db.ts`
- **Why fragile:** Global singleton pattern with a promise cache (`__quietTigerDuckDbInitPromise`). If initialization fails once, it resets the promise, but concurrent callers during initialization may race. The module-level `getDb()` has no connection pooling. Error recovery clears the promise but does not retry.
- **Safe modification:** Always test with `isMockDataEnabled()`; avoid changing the init sequence without testing the error flow.
- **Test coverage:** No tests for `db.ts` (the database initialization module has zero test coverage).

### Full-Population STKDE Pipeline Timeout Handling
- **Files:** `src/app/api/stkde/hotspots/route.ts` (lines 70-107), `src/lib/stkde/full-population-pipeline.ts`
- **Why fragile:** The `withTimeout` pattern uses `Promise.race` with a timer. If the DuckDB query hangs (e.g., waiting on file lock), the timer fires, but DuckDB internals may not abort. The `AbortSignal` is passed but the DuckDB Node.js driver may not respect it. The timeout fallback produces different results (sampled vs full-population) which affects study data comparability.
- **Safe modification:** Test with `fullPopulationTimeoutMs` set to very low values to exercise the fallback path.
- **Test coverage:** Covered in `src/app/api/stkde/hotspots/route.test.ts`.

### Web Worker Test Fragility
- **Files:** `src/workers/adaptiveTime.worker.test.ts`, `src/workers/stkdeHotspot.worker.test.ts`
- **Why fragile:** Tests delete `globalThis.Worker` and `globalThis.window` to force synchronous execution or simulate worker environments. This can produce false positives (tests pass but worker integration fails) or interact badly with test runners that depend on these globals.
- **Example:** `useAdaptiveStore.test.ts` lines 26-37 — deletes `globalThis.window` and `Worker` then restores.
- **Test coverage:** Both worker test files exist but rely on this pattern.

### Study Logger Retry Logic
- **Files:** `src/lib/logger.ts`
- **Why fragile:** The logger uses linear backoff (750ms, 1500ms, 2250ms) with max 4 attempts. During `beforeunload`, it sends a `sendBeacon` which drops the full queue depth (only sends metadata). The acknowledged `submit()` path works but `enqueue()` background writes can silently fail after exhausting retries (line 147: `console.error` only).
- **Safe modification:** Ensure critical study events (trial completion, questionnaire) always use `submit()` not `enqueue()`.
- **Test coverage:** `src/lib/logger.ts` has no tests (246 lines).

## Test Coverage Gaps

### Untested Core Library Modules
| Module | Lines | Risk |
|--------|-------|------|
| `src/lib/logger.ts` | 246 | Study data loss |
| `src/lib/interval-detection.ts` | 328 | Burst interval logic |
| `src/lib/warp-generation.ts` | 350 | Time warp computation |
| `src/lib/confidence-scoring.ts` | 277 | Proposal confidence |
| `src/lib/selection.ts` | 166 | Point/slice selection |
| `src/lib/slice-geometry.ts` | 137 | 3D slice geometry |
| `src/lib/category-maps.ts` | 167 | Crime category mapping |
| `src/lib/duckdb-aggregator.ts` | 101 | 3D bin aggregation |

### Untested Routes (see Tech Debt section above)

### Store Tests Missing for Key Stores
- **Priority: High:** `src/store/useSuggestionStore.ts` (539 lines, no test)
- **Priority: High:** `src/store/useEvaluationStudyStore.ts` (526 lines, no test)
- **Priority: Medium:** `src/store/useFilterStore.ts`, `src/store/useAdaptiveStore.ts`, `src/store/useBinningStore.ts`

## Duplicate Implementations

### Dual Timeline Components
- **Files:** `src/components/timeline/DualTimeline.tsx` (725 lines) and `src/components/timeline/DemoDualTimeline.tsx` (826 lines) share significant rendering logic but are separate implementations.
- **Impact:** Bug fixes and improvements must be applied to both; they diverge over time.

### Point Rendering Components
- **Files:** `src/components/viz/DataPoints.tsx` (692 lines), `SimpleCrimePoints.tsx` (289 lines), `SliceCrimePoints.tsx`
- **Impact:** Multiple strategies for rendering crime points in R3F, each with different interaction models.

### Dashboard Implementations
- **Files:** `src/app/dashboard/`, `src/app/dashboard-v2/`, `src/app/dashboard-demo/`
- **Impact:** Three separate dashboard implementations with shared underlying stores but different component trees.

## Hardcoded Configuration

### Geographic Bounds Duplicated
- **Issue:** Chicago coordinate bounds (`minLon: -87.9, maxLon: -87.5, minLat: 41.6, maxLat: 42.1`) are hardcoded in at least 5 locations.
- **Files:** `src/lib/duckdb-aggregator.ts` (line 46), `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stats-summary/route.ts`, `src/app/api/crime/stream/route.ts` (indirectly via coordinate normalization), `src/lib/queries.ts` (`CHICAGO_BOUNDS` import)
- **Impact:** Changing the spatial area of interest requires modifying multiple files.

### Magic Constants in Compute Code
- **Issue:** `TEMPORAL_BUCKET_SIZE_SEC = 3600`, `METERS_PER_LAT_DEGREE = 111_320`, and similar constants are defined inline in `src/lib/stkde/compute.ts` (lines 15-16) rather than in a shared constants module.
- **Impact:** Inconsistent values could cause subtle numeric discrepancies.

---

*Concerns audit: 2026-06-25*
