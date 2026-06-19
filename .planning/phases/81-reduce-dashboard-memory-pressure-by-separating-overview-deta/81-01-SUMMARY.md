---
phase: 81-reduce-dashboard-memory-pressure-by-separating-overview-deta
plan: 01
subsystem: database
tags: [duckdb, persisted-tables, overview-bins, fingerprint, ctas, summary-api]

# Dependency graph
requires: []
provides:
  - Persisted DuckDB fact table (crimes_fact) with stable id + row_id for keyset paging
  - Persisted single-row metadata table (crime_dataset_meta) for /api/crime/meta
  - Precomputed overview bins table (crime_overview_bins_medium) at fixed 200-bin medium resolution
  - Dataset fingerprint invalidation (mtime:size) for derived-table rebuild gating
  - Cut /api/crime/meta and /api/crime/overview over to persisted reads (no CSV scan in hot path)
  - New overview contract: pre-binned counts with explicit domain metadata, no timestampsSec
affects: [81-02, 81-03, future-heatmap-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persisted CTAS with dataset fingerprint guard (mtime:size) for invalidation"
    - "3-dim aggregate table (primary_type, district, bin_id) for any (crimeType, district) filter"
    - "Single-row metadata table for startup reads"
    - "Server-binned overview payload replaces sampled-timestamp contract"

key-files:
  created:
    - src/app/api/crime/meta/route.test.ts
    - src/app/api/crime/overview/route.test.ts
  modified:
    - src/lib/db.ts
    - src/lib/queries/sanitization.ts
    - src/lib/queries/types.ts
    - src/app/api/crime/meta/route.ts
    - src/app/api/crime/overview/route.ts
    - src/store/useTimelineDataStore.ts
    - src/store/useTimelineDataStore.test.ts

key-decisions:
  - "Use CSV ID column as natural stable row identifier; add synthetic row_id for keyset paging safety"
  - "Fingerprint = mtime:size of the source CSV; documented limitation: same-size replacement not detected"
  - "Overview bins table keyed by (primary_type, district, bin_id) for any filter combination via sum-and-group"
  - "Fixed medium bin count = 200; per locked decision D-04"
  - "Backwards-compat bridge in useTimelineDataStore: derive overviewTimestampSec from bin midpoints so DemoDualTimeline keeps working until 81-02 migrates to direct bin consumption"

patterns-established:
  - "Persisted analytics tables are gated by dataset fingerprint; rebuild only on source change"
  - "API routes query persisted tables and never rescan CSV on the hot path"
  - "Mock fallback still returns the same X-Data-Warning header string set as the legacy route"

# Metrics
duration: 11min
completed: 2026-06-19
---

# Phase 81 Plan 01: Persisted DuckDB Storage + Summary API Cutover

**Persisted DuckDB storage foundation (crimes_fact + crime_dataset_meta + crime_overview_bins_medium) with dataset-fingerprint invalidation, plus /api/crime/meta and /api/crime/overview cut over to persisted reads with a server-binned overview contract.**

## Performance

- **Duration:** 11 min 5 s
- **Started:** 2026-06-19T11:49:38Z
- **Completed:** 2026-06-19T12:00:43Z
- **Tasks:** 2/2 complete
- **Files modified:** 7
- **Files created:** 2

## Accomplishments

- **Persisted canonical fact table** (`crimes_fact`) with stable `id` (CSV ID), synthetic `row_id`, normalized `timestamp_sec`, plus lat/lon, primary_type, district, iucr, year columns. Rebuilt only when the source CSV fingerprint changes.
- **Persisted single-row metadata table** (`crime_dataset_meta`) holding min/max bounds, distinct crime types (JSON), year range, fingerprint, built_at. One cheap read replaces the legacy three-CSV-scan aggregation.
- **Pre-binned overview table** (`crime_overview_bins_medium`) at fixed 200-bin medium resolution, keyed by (primary_type, district, bin_id). Any (crimeType, district) filter combination reduces to a sum-and-group at query time.
- **`/api/crime/meta` cut over to persisted read** while preserving the legacy response shape (minTime, maxTime, minLat, maxLat, minLon, maxLon, count, crimeTypes, yearRange) and the mock fallback + `X-Data-Warning` behavior.
- **`/api/crime/overview` cut over to persisted read** with a new contract: pre-binned counts with explicit domain metadata (startEpoch, endEpoch, binCount, binSizeSec) plus the `bins[]` array. The legacy `timestampsSec[]` field is removed. Filter contract accepts only `crimeTypes` and `districts` (no viewport).
- **`useTimelineDataStore.loadSummaryData()` bridge** so direct consumers keep working: the new `overviewBins` field is the canonical store representation; `overviewTimestampSec` is derived from bin midpoints for legacy consumers. 81-02 will do the deeper consumer migration to direct bin consumption.

## Task Commits

1. **Task 1: Persist canonical DuckDB fact table and derived summary tables** - `d8c2e19` (feat)
2. **Task 2: Cut `/api/crime/meta` and `/api/crime/overview` to persisted reads** - `60ee70d` (feat)

## Files Created/Modified

- `src/lib/db.ts` - Added persisted-table bootstrap (crimes_fact, crime_dataset_meta, crime_overview_bins_medium), dataset fingerprint computation, and read helpers (readDatasetMetadata, readOverviewBins). Also added the persisted-table names to the sanitization allowlist (via types update). Relaxed the DuckDbInstance type to variadic so spread-arg queries type-check.
- `src/lib/queries/types.ts` - Added `OverviewBin`, `OverviewDomain`, `OverviewFilter`, `OverviewResponse`, `DatasetMetadata` types.
- `src/lib/queries/sanitization.ts` - Added the three new persisted-table names to the table-name allowlist.
- `src/app/api/crime/meta/route.ts` - Rewrote to use `ensureDatasetMetaTable()` + `readDatasetMetadata()`. Mock fallback preserved.
- `src/app/api/crime/overview/route.ts` - Rewrote to use `ensureOverviewBinsTable()` + `readOverviewBins()`. Removed `timestampsSec[]`. Added `domain` + `bins[]` contract. Accepts only `crimeTypes` and `districts`. Mock fallback preserved.
- `src/app/api/crime/meta/route.test.ts` (new) - 5 tests covering persisted shape, reuse on repeat requests, three mock-fallback paths.
- `src/app/api/crime/overview/route.test.ts` (new) - 7 tests covering bin shape, no `timestampsSec`, filter parsing, viewport non-consumption, reuse, and three mock-fallback paths.
- `src/store/useTimelineDataStore.ts` - Added `OverviewBinState` and `overviewBins[]` field. `loadSummaryData()` consumes the new bin contract and derives a legacy `overviewTimestampSec` array from bin midpoints.
- `src/store/useTimelineDataStore.test.ts` - Updated the summary-load test to expect the new bin shape.

## Decisions Made

- **CSV `ID` as natural stable row identifier.** Chicago's published dataset includes a numeric `ID` column that is unique per incident. Using it as the persisted base table's `id` (alongside a synthetic `row_id`) gives Wave 3 keyset paging two safe tie-breakers without inventing a hash.
- **Fingerprint = `mtime:size` of the source CSV.** Cheapest possible signal. Documented as a known limitation: if a same-size file replaces the source, the fingerprint will not change. Acceptable for the prototype's source-managed dataset. A content-hash upgrade is a one-line swap.
- **3-dim aggregate shape.** `crime_overview_bins_medium` is keyed by (primary_type, district, bin_id) rather than (filter_key, bin_id). The 3-dim layout means any filter combination is a sum-and-group at query time, with no per-filter materialized keys to invalidate. The locked decision says "filter-aware for crime-type and district ONLY" so 3-dim fully covers the contract.
- **Fixed medium resolution = 200 bins.** Between d3-array's `bin(...).thresholds(50)` (legacy client rebin) and the adaptive 1024 (full-resolution density). Phase 81's locked decision D-04 calls for a single medium default, so we ship one.
- **`useTimelineDataStore` backwards-compat bridge.** The 81-01 plan changes the overview contract (no more `timestampsSec[]`), which would have broken `DemoDualTimeline` and the existing test. Rather than ask 81-02 to do the full consumer migration up-front, 81-01 introduces a new `overviewBins` field and derives `overviewTimestampSec` from bin midpoints so legacy consumers keep working. 81-02 then replaces the derived array with direct bin consumption. Documented in the store code.
- **`ensureSortedCrimesTable()` preserved unchanged.** Other modules (queries.ts, adaptive/bursts, stkde/full-population-pipeline) still depend on the `crimes_sorted` table. Wave 3 (keyset-paging) is the right phase to fold them into `crimes_fact` so this plan does not.
- **Quote-safe SQL with interpolated paths.** All new persisted-table bootstrap SQL that interpolates `getDataPath()` into `read_csv_auto('...')` now uses `escapeSqlString()` (single-quote doubling) to avoid breaking on paths with apostrophes. The current `Crimes_-_2001_to_Present_20260114.csv` is safe today, but the new code is robust to future path changes.

## Deviations from Plan

None - plan executed exactly as written. The store-side bridge update in `useTimelineDataStore.ts` is not a deviation because the plan's verify step requires the build to remain green and direct consumers (the timeline store test) would have broken from the contract change.

## Issues Encountered

- **DuckDbInstance type was too narrow for variadic args.** The existing `DuckDbInstance` type declared `all: (sql, callback) => void`, but the duckdb node binding is variadic (`db.all(sql, ...params, callback)`). My new persisted-table helpers need to spread params, so I relaxed the type to `all: (sql: string, ...args: unknown[]) => void`. The same `Database` instance returned by the duckdb constructor is now assigned through `instance as unknown as DuckDbInstance` to bridge the duckdb package's stronger typing.
- **`list(distinct ...)` in DuckDB returns a LIST type, not an array.** I switched the metadata table to store `to_json(list(distinct primary_type))` and decode the JSON in `readDatasetMetadata()`. This is robust to driver-version changes and makes the column type a plain VARCHAR.

## Next Phase Readiness

- 81-02 has a stable base to migrate direct consumers from the derived `overviewTimestampSec` array to direct `overviewBins` consumption. The new field already exposes the bin shape; 81-02 just needs to point `DemoDualTimeline` and friends at it.
- 81-03 (keyset-paged `/api/crimes/range`) can use the persisted `crimes_fact` table's `id` and synthetic `row_id` columns for safe `(timestamp_sec, row_id)` paging. The query builders in `src/lib/queries/builders.ts` are unchanged in this plan but Wave 3 will need to add a keyset builder that reads from `crimes_fact`.
- The persisted tables are built on first request, gated by fingerprint. A future optimization is to build them eagerly during `pnpm dev` startup so the first user request does not pay the build cost. Out of scope for 81-01.

## Known Limitations (Surfaced for Downstream)

- **Fingerprint = `mtime:size`.** Will not detect a same-size file replacement. The next phase that needs true content integrity should swap in a hash.
- **`escapeSqlString` covers single quotes only.** The data path is internal and currently safe; if a future path ever needs to include backslashes or newlines the escape will need to be widened.
- **`useTimelineDataStore.overviewTimestampSec` is now a derived legacy field.** It is NOT the canonical source. 81-02 must migrate consumers off it.
- **`readOverviewBins` returns a `bins[]` array with possibly sparse indices.** Some bins may be absent (the source has no records in that range for the filter). The API consumer should treat missing binIndex as a zero-count bin when rendering, not as an error.
- **`ensureSortedCrimesTable` is now redundant with `crimes_fact` for any new code.** Wave 3 should fold its callers into `crimes_fact` to remove the duplicate sort cost.

---
*Phase: 81-reduce-dashboard-memory-pressure-by-separating-overview-deta*
*Completed: 2026-06-19*
