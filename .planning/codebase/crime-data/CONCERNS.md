# Crime Data Concerns & Issues

**Analysis Date:** 2026-03-30

## Duplicate Type Definitions

**Issue:** `CrimeRecord` is defined in two separate locations with identical shape:
- `src/types/crime.ts` (canonical, includes optional `id` field)
- `src/lib/queries/types.ts` (query-layer copy, no `id` field)

**Files:** `src/types/crime.ts`, `src/lib/queries/types.ts`

**Impact:** Risk of drift if one is updated without the other. The query facade (`src/lib/queries.ts`) re-exports from `queries/types.ts` while the API route (`src/app/api/crimes/range/route.ts`) imports from `@/lib/queries`. The STKDE compute module imports from `@/types/crime`. Developers must know which definition to update.

**Fix approach:** Unify to a single definition in `src/types/crime.ts`. Update `src/lib/queries/types.ts` to re-export from there. Or make `queries/types.ts` the canonical and have `src/types/crime.ts` re-export.

## Legacy Types Coexist

**Issue:** `src/types/index.ts` defines `CrimeEvent`, `Bin`, and `ColumnarData` — older type interfaces that overlap with `CrimeRecord` but use different shapes (`y` instead of `timestamp` for the temporal axis, `Date` type instead of epoch number).

**Files:** `src/types/index.ts`

**Impact:** Confusion about which type to use. The `Bin` type from `index.ts` is imported by `/api/crime/bins/route.ts`, while `DensityBin` from `queries/types.ts` is used by the query layer — they have similar shapes but different fields.

**Fix approach:** Migrate all usages to `CrimeRecord` and `DensityBin`, then deprecate `src/types/index.ts` crime-related types.

## Mock Data Enabled by Default

**Issue:** When `USE_MOCK_DATA` and `DISABLE_DUCKDB` env vars are unset, `isMockDataEnabled()` returns `true`. This means fresh clones return synthetic data silently.

**Files:** `src/lib/db.ts` (line 8–14)

**Impact:** New developers may not realize they're seeing fake data. API responses include `isMock: true` in meta and `X-Data-Warning` header, but there's no console warning or startup log.

**Fix approach:** Consider defaulting to `false` or logging a prominent warning at startup when mock mode is active.

## Dual Mock Generators

**Issue:** Two separate mock crime generators exist with different sophistication levels:
- `generateMockCrimes()` in `src/app/api/crimes/range/route.ts` — uniform random, simple
- `generateMockCrimeRecords()` in `src/lib/queries.ts` — spatial hotspots, temporal peaks, type weighting

**Files:** `src/app/api/crimes/range/route.ts` (lines 50–84), `src/lib/queries.ts` (lines 148–221)

**Impact:** The route-level generator is used by the `/api/crimes/range` endpoint directly, while the query-facade generator is used by `queryCrimesInRange()`. They produce different distributions. The route generator uses simpler randomization; the query generator uses seeded random with realistic spatial clustering.

**Fix approach:** Consolidate to one generator (prefer the more sophisticated one in `queries.ts`) and have the route import from the facade.

## Callback-Style DuckDB API

**Issue:** DuckDB is accessed via Node.js callback style (`db.all(sql, ...params, callback)`) wrapped in manual Promises. This pattern is repeated in `src/lib/queries.ts`, `src/lib/db.ts`, `src/lib/stkde/full-population-pipeline.ts`, and `src/app/api/crime/facets/route.ts`.

**Files:** `src/lib/queries.ts` (lines 233–257), `src/lib/stkde/full-population-pipeline.ts` (lines 9–18)

**Impact:** Boilerplate duplication. Error handling is inconsistent (some places check `err`, some propagate). The `executeAll` helper is defined separately in both `queries.ts` and `full-population-pipeline.ts` with slightly different signatures.

**Fix approach:** Extract a shared `executeQuery<T>(db, sql, params): Promise<T[]>` utility in `src/lib/db.ts` and use it everywhere.

## No Input Validation on /api/crime/bins

**Issue:** The `/api/crime/bins` route parses `resX`, `resY`, `resZ` as integers without bounds checking. Negative or zero values will produce nonsensical results.

**Files:** `src/app/api/crime/bins/route.ts` (lines 36–38)

**Impact:** Malformed requests could trigger excessive memory allocation (e.g., `resX=999999`). The `clampDensityResolution` function exists in `src/lib/queries/sanitization.ts` (range 1–1000) but is only used in `buildDensityBinsQuery()`, not in the route handler for the mock path.

**Fix approach:** Apply `clampDensityResolution()` in the route handler before passing to `getAggregatedBins()`.

## STKDE Response Size Guard Is Client + Server

**Issue:** Response size truncation for STKDE hotspots happens in two places:
- Server: `applyResponsePayloadGuard()` in `src/lib/stkde/compute.ts`
- Client: `sanitizeResponseSize()` in `src/app/dashboard-v2/hooks/useDashboardStkde.ts`

**Files:** `src/lib/stkde/compute.ts` (lines 154–183), `src/app/dashboard-v2/hooks/useDashboardStkde.ts` (lines 41–63)

**Impact:** The limit constant `STKDE_RESPONSE_SIZE_LIMIT_BYTES` (2.5MB) is shared, but the client guard applies additional truncation (8000 cells max) and adds a separate `client-response-size-guard` fallback note. This creates confusing double-truncation behavior.

**Fix approach:** Rely on the server-side guard only, or document why client-side truncation is also needed.

## Facets API Uses Different Data Source

**Issue:** `/api/crime/facets` queries `data/crime.parquet` while all other endpoints query `crimes_sorted` (from the CSV). Column discovery is runtime-introspected.

**Files:** `src/app/api/crime/facets/route.ts` (line 25)

**Impact:** If the parquet and CSV are out of sync, facet counts won't match actual data. Column name resolution (`Primary Type` vs `primary_type` vs `type`) adds fragility.

**Fix approach:** Query `crimes_sorted` table instead of parquet, or document the parquet source as a derived/cached artifact.

## BigInt Serialization Risk

**Issue:** DuckDB returns `bigint` values for COUNT and epoch extractions. Multiple locations manually convert via `typeof row.x === 'bigint' ? Number(row.x) : row.x`.

**Files:** `src/lib/queries.ts` (lines 274–284), `src/lib/queries/aggregations.ts` (lines 18–22), `src/app/api/crime/meta/route.ts` (lines 85–86)

**Impact:** If any new query path forgets the conversion, `JSON.stringify()` will throw `TypeError: Do not know how to serialize a BigInt`.

**Fix approach:** Add a `toNumber()` utility to the shared db module and use it consistently in all query result mapping.

## Test Coverage Gaps

**Untested areas:**
- `src/app/api/crime/bins/route.ts` — no test file found
- `src/app/api/crime/meta/route.ts` — no test file found
- `src/app/api/crime/facets/route.ts` — no test file found
- `src/app/api/crime/stream/route.ts` — no test file found
- `src/lib/coordinate-normalization.ts` — tested indirectly but no dedicated test
- Hotspot selection → spatial bounds commit flow in `page.tsx` — tested in `page.stkde.test.ts` but only for the investigative overlay copy

**Files:** Test files only exist for `crimes/range`, `stkde/hotspots`, `queries.ts`, `crime-api.test.ts`, `stkde/compute.test.ts`, `stkde/full-population-pipeline.test.ts`.

**Risk:** Regressions in metadata, facets, bins, or stream endpoints would go undetected.

---

*Concerns audit: 2026-03-30*
