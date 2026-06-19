---
phase: 06-category-encoding
plan: 01
subsystem: shared-data
tags: [category-legend, viewport, helper, testing]

# Dependency graph
requires:
  - phase: 05-clustering
    provides: cube filters and cluster-aware context
provides:
  - viewport-driven category legend model
  - deterministic legend sorting and color threading
affects: [06-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure legend helper, count-based ordering]

key-files:
  created: [src/lib/category-legend.ts, src/lib/category-legend.test.ts]
  modified: []

### Phase 06 Plan 01 Summary

The category legend now comes from real viewport crime records instead of a hardcoded list.

## Accomplishments
- Added `buildCategoryLegendEntries()` to derive live legend entries from viewport crime records.
- Kept palette colors and canonical labels aligned with existing category maps.
- Added regression tests for empty input, counts, stable ordering, and palette threading.

## Verification
- `./node_modules/.bin/vitest run src/lib/category-legend.test.ts`

## Commit
- `8149b73` — `feat(06-category-encoding-01): add shared category legend helper`

## Decisions Made
- Use actual viewport crime records as the source of truth for category visibility.
- Keep the helper pure so both map and cube legends can consume it.

## Deviations from Plan
None.

## Next Phase Readiness
- The shared legend model is ready for UI wiring.
- Phase 06 plan 02 can replace the static legends with the shared component.
