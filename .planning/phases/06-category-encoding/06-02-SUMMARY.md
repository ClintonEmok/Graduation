---
phase: 06-category-encoding
plan: 02
subsystem: ui
tags: [legend, map, cube, filtering, category]

# Dependency graph
requires:
  - phase: 06-01
    provides: shared viewport category legend model
provides:
  - dynamic map legend
  - dynamic cube legend
  - shared category toggle wiring
affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared legend UI, wrapper components, viewport-driven data]

key-files:
  created: [src/components/viz/CrimeCategoryLegend.tsx, src/components/viz/category-legend.phase6.test.tsx]
  modified: [src/components/viz/SimpleCrimeLegend.tsx, src/components/map/MapTypeLegend.tsx]

### Phase 06 Plan 02 Summary

The map and cube now render the same data-driven crime-category legend UI.

## Accomplishments
- Added `CrimeCategoryLegend` as the shared UI that fetches current viewport crime records and builds legend entries.
- Replaced hardcoded cube and map category arrays with wrappers around the shared legend.
- Kept map hover/click affordances intact while preserving shared category filtering.
- Added source-inspection coverage to lock the no-hardcoded-array contract.

## Verification
- `./node_modules/.bin/vitest run src/components/viz/category-legend.phase6.test.tsx`

## Commit
- `fc60b97` — `feat(06-category-encoding-02): wire dynamic category legends`

## Decisions Made
- Let the viewport crime data determine which categories are visible.
- Preserve `selectedTypes` as the single category toggle state.

## Deviations from Plan
None.

## Next Phase Readiness
- The legend surfaces are dynamic and synchronized.
- Phase 06 plan 03 can add category shape encoding to the cube renderer.
