# Crime Data Directory Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
neon-tiger/
├── data/
│   ├── cache/
│   │   └── crime.duckdb                    # DuckDB database (auto-created)
│   └── sources/
│       └── Crimes_-_2001_to_Present_20260114.csv  # Source CSV (~8.5M rows)
├── datapreprocessing/
│   ├── crime_pipeline.ipynb                # Jupyter preprocessing notebook
│   └── *.png                               # Visualization outputs
├── src/
│   ├── types/
│   │   ├── crime.ts                        # Canonical CrimeRecord type (SINGLE SOURCE OF TRUTH)
│   │   ├── index.ts                        # Legacy types: CrimeEvent, Bin, ColumnarData
│   │   └── autoProposalSet.ts
│   ├── lib/
│   │   ├── db.ts                           # DuckDB connection, mock flag, sorted table bootstrap
│   │   ├── queries.ts                      # Main query facade (queryCrimesInRange, queryCrimeCount, etc.)
│   │   ├── queries/
│   │   │   ├── index.ts                    # Barrel re-export
│   │   │   ├── types.ts                    # Duplicate CrimeRecord, QueryCrimesOptions, DensityBin
│   │   │   ├── builders.ts                 # SQL query builders (range, count)
│   │   │   ├── filters.ts                  # WHERE clause fragment builders
│   │   │   ├── aggregations.ts             # Adaptive density/burst/warp queries + cache ops
│   │   │   └── sanitization.ts             # Table name allowlist, value clamping
│   │   ├── coordinate-normalization.ts     # Chicago bounds, lon/lat ↔ x/z conversion
│   │   ├── stkde/
│   │   │   ├── contracts.ts                # StkdeRequest, StkdeResponse, validation, coercion
│   │   │   ├── compute.ts                  # STKDE kernel density engine (sampled + full-pop)
│   │   │   ├── compute.test.ts
│   │   │   ├── full-population-pipeline.ts # Server-side DuckDB aggregation for full-pop mode
│   │   │   └── full-population-pipeline.test.ts
│   │   ├── duckdb-aggregator.ts            # Density bin aggregation (used by /api/crime/bins)
│   │   ├── crime-api.test.ts               # Standalone crime API utility tests
│   │   └── queries.test.ts                 # Query builder + facade tests
│   ├── workers/
│   │   ├── stkdeHotspot.worker.ts          # Web Worker for hotspot filtering/projection
│   │   └── stkdeHotspot.worker.test.ts
│   ├── store/
│   │   ├── useStkdeStore.ts                # Zustand store for STKDE state
│   │   └── useStkdeStore.test.ts
│   ├── hooks/
│   │   ├── useCrimeData.test.ts            # React hook integration tests
│   │   └── ...                             # Other hooks (no dedicated crime-data hook file)
│   ├── app/
│   │   ├── api/
│   │   │   ├── crimes/range/route.ts       # GET /api/crimes/range — viewport crime data
│   │   │   ├── crimes/range/route.test.ts
│   │   │   ├── crime/facets/route.ts       # GET /api/crime/facets — type/district aggregations
│   │   │   ├── crime/bins/route.ts         # GET /api/crime/bins — spatial density bins
│   │   │   ├── crime/meta/route.ts         # GET /api/crime/meta — dataset metadata
│   │   │   ├── crime/stream/route.ts       # Streaming crime data endpoint
│   │   │   ├── stkde/hotspots/route.ts     # POST /api/stkde/hotspots — STKDE computation
│   │   │   └── stkde/hotspots/route.test.ts
│   │   └── dashboard-v2/
│   │       ├── hooks/
│   │       │   ├── useDashboardStkde.ts     # STKDE orchestration hook
│   │       │   └── useDashboardStkde.test.ts
│   │       ├── page.tsx                     # Hotspot selection → filter commit logic
│   │       └── page.stkde.test.ts
│   └── components/
│       ├── stkde/
│       │   └── DashboardStkdePanel.tsx      # Hotspot list UI with selection
│       └── viz/
│           ├── CubeVisualization.tsx        # Shows selected hotspot details
│           └── CubeVisualization.stkde.test.ts
```

## Key File Locations

**Canonical type definition:**
- `src/types/crime.ts` — `CrimeRecord` interface. This is the single source of truth.
- `src/lib/queries/types.ts` — Duplicate definition (re-exported via `src/lib/queries.ts` facade).

**Database layer:**
- `src/lib/db.ts` — Connection management, mock flag, sorted table bootstrap.
- `src/lib/queries.ts` — Facade with `queryCrimesInRange()`, `queryCrimeCount()`, `getOrCreateGlobalAdaptiveMaps()`, `queryDensityBins()`.

**Query builders:**
- `src/lib/queries/builders.ts` — SQL generation for range/count queries.
- `src/lib/queries/filters.ts` — WHERE clause fragments.
- `src/lib/queries/aggregations.ts` — Adaptive density, burst, warp, cache queries.
- `src/lib/queries/sanitization.ts` — Table name allowlist, numeric clamping.

**STKDE hotspot engine:**
- `src/lib/stkde/contracts.ts` — Request/response types, validation, defaults, coercion ranges.
- `src/lib/stkde/compute.ts` — Core algorithm (`computeStkdeFromCrimes`, `computeStkdeFromAggregates`).
- `src/lib/stkde/full-population-pipeline.ts` — DuckDB-backed full-population aggregation.

**API endpoints:**
- `src/app/api/crimes/range/route.ts` — Main viewport query endpoint.
- `src/app/api/stkde/hotspots/route.ts` — STKDE POST endpoint.
- `src/app/api/crime/meta/route.ts` — Dataset metadata.
- `src/app/api/crime/facets/route.ts` — Type/district aggregations.
- `src/app/api/crime/bins/route.ts` — Spatial density bins.

## Where to Add New Code

**New crime API endpoint:**
- `src/app/api/crime/[name]/route.ts` — Follow existing pattern: `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, mock fallback.

**New query type:**
- Add builder to `src/lib/queries/builders.ts`
- Add filter logic to `src/lib/queries/filters.ts` if needed
- Export via `src/lib/queries/index.ts`
- Add facade function to `src/lib/queries.ts`

**New crime data type field:**
- Add to `src/types/crime.ts` (canonical)
- Mirror in `src/lib/queries/types.ts` (query-layer copy)
- Update `buildCrimeCoordinateSelectColumns()` in `src/lib/queries/builders.ts`
- Update mock generators in `src/lib/queries.ts` and `src/app/api/crimes/range/route.ts`

**New STKDE parameter:**
- Add to `StkdeRequest` in `src/lib/stkde/contracts.ts`
- Add to `COERCION_RANGES` for clamping
- Add to `DEFAULT_REQUEST`
- Add to `StkdeParams` in `src/store/useStkdeStore.ts`
- Add to `STKDE_PARAM_LIMITS`
- Wire through `useDashboardStkde.ts` request body

---

*Structure analysis: 2026-03-30*
