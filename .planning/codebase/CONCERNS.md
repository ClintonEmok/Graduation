# Codebase Concerns

**Analysis Date:** 2026-03-11

## Tech Debt

**Duplicate slice-authored warp-map logic across routes:**
- Issue: Equivalent `buildSliceAuthoredWarpMap` logic exists in both `src/app/timeslicing/page.tsx` and `src/app/timeline-test/page.tsx`
- Files: `src/app/timeslicing/page.tsx`, `src/app/timeline-test/page.tsx`, `src/app/timeline-test-3d/lib/route-orchestration.ts`
- Impact: Drift risk when changing warp behavior; inconsistent adaptive results across routes
- Fix approach: Extract a single shared utility in `src/lib/` and consume it from all routes

**Large all-in-one UI modules:**
- Issue: Several high-complexity files exceed 700-1100 LOC
- Files: `src/components/timeline/DualTimeline.tsx`, `src/app/timeslicing/components/SuggestionToolbar.tsx`, `src/app/timeslicing/page.tsx`, `src/store/useSuggestionStore.ts`
- Impact: Slower onboarding, fragile edits, and higher regression probability
- Fix approach: Split by concern (data derivation hooks, render layers, action handlers) and add focused tests per extracted module

## Known Bugs

**Facets API references parquet path not created by default flow:**
- Symptoms: Facet requests can fail in real-data mode when `data/crime.parquet` is absent
- Files: `src/app/api/crime/facets/route.ts`, `scripts/setup-data.js`, `src/lib/db.ts`
- Trigger: Running app with DuckDB enabled but only CSV-based dataset setup
- Workaround: Generate `data/crime.parquet` via `scripts/setup-data.js` or keep mock mode enabled

## Security Considerations

**SQL string interpolation with user-provided filters:**
- Risk: Injection surface via unsanitized `types`, `districts`, and date filter interpolation
- Files: `src/lib/duckdb-aggregator.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`
- Current mitigation: Partial helper use (some routes parameterize via query builders in `src/lib/queries.ts`)
- Recommendations: Route all SQL generation through parameterized builders; avoid concatenating filter values into SQL strings

**Local environment file committed in repository:**
- Risk: Accidental credential leakage and environment drift
- Files: `.env`, `.gitignore`
- Current mitigation: None in code
- Recommendations: Remove tracked `.env` from version control and enforce `.env.example` pattern

## Performance Bottlenecks

**Repeated `read_csv_auto(...)` scans in metadata/facet/stream endpoints:**
- Problem: Hot API paths re-scan raw CSV instead of querying persisted sorted table/cache
- Files: `src/app/api/crime/meta/route.ts`, `src/app/api/crime/stream/route.ts`, `src/app/api/crime/facets/route.ts`
- Cause: Multiple endpoints bypass `ensureSortedCrimesTable` and query builders in `src/lib/queries.ts`
- Improvement path: Consolidate onto shared query layer/table and leverage persisted cache tables for repeated domain operations

## Fragile Areas

**Cross-store timeline synchronization contract:**
- Files: `src/components/timeline/DualTimeline.tsx`, `src/components/timeline/hooks/useBrushZoomSync.ts`, `src/components/timeline/hooks/usePointSelection.ts`, `src/store/useTimeStore.ts`, `src/store/useFilterStore.ts`, `src/lib/stores/viewportStore.ts`
- Why fragile: Behavior depends on synchronized updates across multiple stores and D3 event loops
- Safe modification: Preserve `applyRangeToStoresContract` semantics and update related hook tests together (`src/components/timeline/hooks/*.test.ts`)
- Test coverage: Moderate for helper hooks; limited direct tests for full `DualTimeline` integration

## Scaling Limits

**Client payload and render ceiling for viewport data:**
- Current capacity: API limits return payload to ~50k records (`limit` defaults in `src/hooks/useCrimeData.ts` and `src/app/api/crimes/range/route.ts`)
- Limit: Large ranges can still trigger heavy network/CPU cost and UI degradation
- Scaling path: Add server-side tiling/aggregation for map/timeline views and progressive chunked loading

## Dependencies at Risk

**Patched native DuckDB integration:**
- Risk: Postinstall symlink + patch-package workaround can break on dependency updates/platform differences
- Impact: Install/runtime failures for local and CI environments
- Migration plan: Pin supported DuckDB version and replace patch with upstream-compatible install strategy

## Missing Critical Features

**No CI enforcement for lint/type/test gates:**
- Problem: Quality checks are manual only
- Blocks: Reliable regression prevention across contributors

## Test Coverage Gaps

**Major route/page orchestration not directly tested:**
- What's not tested: End-to-end behavior of `src/app/timeslicing/page.tsx`, `src/app/timeline-test/page.tsx`, and map/cube integration
- Files: `src/app/timeslicing/page.tsx`, `src/app/timeline-test/page.tsx`, `src/components/map/MapVisualization.tsx`, `src/components/viz/CubeVisualization.tsx`
- Risk: Regressions in cross-panel synchronization and feature workflows can ship unnoticed
- Priority: High

---

*Concerns audit: 2026-03-11*
