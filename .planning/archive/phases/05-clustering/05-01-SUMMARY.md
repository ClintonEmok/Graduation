---
phase: 05-clustering
plan: 01
subsystem: viz
tags: [dbscan, clustering, store, helper, testing]

# Dependency graph
requires: [04-evolution-view]
provides:
  - shared DBSCAN clustering helper
  - richer cluster store shape for global and slice-scoped results
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure analysis helper, store-backed cluster orchestration]

key-files:
  created: [src/lib/clustering/cluster-analysis.ts, src/lib/clustering/cluster-analysis.test.ts]
  modified: [src/store/useClusterStore.ts, src/components/viz/ClusterManager.tsx]

### Phase 05 Plan 01 Summary

Shared DBSCAN analysis is now extracted from render code and backed by a richer cluster store shape.

## Accomplishments
- Added `analyzeClusters()` for reusable DBSCAN analysis over filtered cube points.
- Added `groupClusterAnalysesBySlice()` to support future slice-scoped buckets.
- Expanded `useClusterStore` to hold global clusters, slice clusters, and hover/selection state.
- Refactored `ClusterManager` to use the shared helper instead of inline DBSCAN logic.

## Verification
- `./node_modules/.bin/vitest run src/lib/clustering/cluster-analysis.test.ts`

## Commit
- `8eafc8f` — `feat(05-clustering-01): add shared cluster analysis`

## Decisions Made
- Keep clustering logic in `src/lib/clustering/` so the cube scene stays thin.
- Keep cluster ids scope-prefixed so global and slice clusters can coexist safely.

## Deviations from Plan
None.

## Next Phase Readiness
- The cube can now consume reusable cluster results.
- Phase 05 plan 02 can render the global overlays directly from the store.
