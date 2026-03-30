---
phase: 63-map-visualization
plan: 01
subsystem: ui
tags: [dashboard-v2, map, timeline, refinement, layer-manager, zustand]

# Dependency graph
requires:
  - phase: 62-user-driven-timeslicing-manual-mode
    provides: generate-review-apply workflow, draft-bin-to-slice promotion
  - phase: 61-dynamic-binning-system
    provides: bin generation strategies, bin CRUD
provides:
  - unified dashboard-v2 route combining map investigation, timeline context, and slice refinement
  - layer manager with POI, district, and event layer toggles
  - manual refinement UX for applied/generated slices
affects: [64-dashboard-redesign, 65-stkde-integration, 66-full-integration-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [unified-investigation-surface, panel-toggle-layout, sidebar-refinement-workflow]

key-files:
  created:
    - src/app/dashboard-v2/page.tsx
  modified:
    - src/store/useLayoutStore.ts

key-decisions:
  - "dashboard-v2 is the single user-facing v3.0 route replacing route-hopping between /timeslicing and /map"
  - "Layout uses collapsible left sidebar for refinement, center split for map+timeline, right sidebar for layer manager"
  - "useLayoutStore extended with panel visibility state and mapRatio for persisted layout preferences"
  - "Map layer toggles exposed both as quick-pill buttons on the map overlay and via the full MapLayerManager sidebar"
  - "Applied slices shown as a dedicated list in the refinement sidebar for quick inspection"
  - "Map layer visibility uses local component state (lightweight per-session) rather than zustand persistence"

patterns-established:
  - "Three-panel investigation layout: refinement sidebar (left), map+timeline (center), layer manager (right)"
  - "Panel toggles in the top bar let users customize their workspace without leaving dashboard-v2"
  - "Applied slices and draft bins are visually separated (emerald vs amber) in the refinement sidebar"

# Metrics
duration: 1 session
completed: 2026-03-26
---

# Phase 63 Plan 01: Map Visualization Summary

**Unified dashboard-v2 investigation surface combining slice refinement, map layers (OSM, POI, districts), and timeline context for the v3.0 milestone**

## Performance

- **Duration:** 1 session
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments

### Task 1: Unified Phase 63 shell
- Created `src/app/dashboard-v2/page.tsx` as the single user-facing v3.0 route
- Built a full-height three-panel layout: refinement sidebar (left), map+timeline (center), layer manager (right)
- Added top bar with panel toggle buttons for timeline, refinement, and layers
- Extended `useLayoutStore` with panel visibility state (`panels`, `setPanel`, `togglePanel`) and `mapRatio` for persisted layout preferences
- Retained backward-compatible layout fields (`outerLayout`, `innerLayout`)

### Task 2: Manual refinement UX
- Refinement sidebar shows applied slices (emerald-styled) with index and size info
- Draft bins (amber-styled) are listed with event counts and quick Apply/Clear actions
- SuggestionToolbar integrated into the sidebar for the full generate → review → apply workflow
- Workflow state banner provides status context (generating, draft ready, applied, idle)
- Sidebar can be collapsed to a narrow strip and re-opened without losing context

### Task 3: Map investigation layers
- Map renders OSM tiles via MapLibre (through `MapBase` using CartoDB dark-matter style)
- POI markers render with category-specific icons/colors (police, schools, transit, parks)
- District boundaries render as GeoJSON polygons with fill and stroke layers
- Crime event points render via `MapEventLayer` with burst color mode
- Legend overlays show POI categories and district lists

### Task 4: Layer management and workflow connection
- `MapLayerManager` wired into the right sidebar with full toggle and opacity controls
- Quick-pill layer toggles overlay on the map for fast visibility switching
- Timeline section below the map shows the same DualTimeline used in /timeslicing
- Map and timeline share the same crime data and viewport state
- Layer manager visibility persisted across expand/collapse

## Task Commits

None. Per user instruction, no git commits were created during execution.

## Files Created/Modified

- `src/app/dashboard-v2/page.tsx` — **Created.** The unified v3.0 investigation surface with three-panel layout, map+timeline stacking, refinement sidebar, and layer manager integration.
- `src/store/useLayoutStore.ts` — **Modified.** Extended with `panels` (PanelVisibility state), `setPanel`/`togglePanel` actions, `mapRatio` for map/timeline split control, and backward-compatible legacy layout fields.

## Decisions Made

- Used local `useState` for map layer visibility (events/poi/districts) rather than persisting to zustand — lighter weight for per-session toggling while the MapLayerManager component handles its own more detailed state.
- Placed SuggestionToolbar inside the refinement sidebar rather than duplicating its controls — avoids code duplication while keeping the generate-review-apply workflow accessible.
- Map takes 55% of vertical space by default (configurable via `mapRatio` in layout store) to balance spatial investigation with timeline detail.
- Collapsed refinement sidebar shows a narrow open-button strip rather than completely disappearing, making it easy to restore.

## Verification Results

### TypeScript Typecheck
- **Status:** PASS
- `npx tsc --noEmit` — zero errors

### Targeted Tests
- **Status:** ALL PASS (47 tests across 9 files)
  - `src/store/useTimeslicingModeStore.test.ts` — 1 test PASS
  - `src/store/useFilterStore.test.ts` — 4 tests PASS
  - `src/store/useSliceStore.test.ts` — 9 tests PASS
  - `src/store/useAdaptiveStore.test.ts` — 2 tests PASS
  - `src/components/timeline/DualTimeline.tick-rollout.test.ts` — 3 tests PASS
  - `src/components/timeline/lib/interaction-guards.test.ts` — 12 tests PASS
  - `src/hooks/useCrimeData.test.ts` — 7 tests PASS
  - `src/components/timeline/hooks/usePointSelection.test.ts` — 5 tests PASS
  - `src/components/timeline/hooks/useBrushZoomSync.test.ts` — 4 tests PASS

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None blocking. The MapEventLayer `colorMode` prop was initially missing from the page template but was caught during initial typecheck and fixed before proceeding.

## User Setup Required

None — no external service configuration required. The route works with existing CartoDB dark-matter tile style and mock/demo crime data.

## Next Phase Readiness

- Phase 64 (Dashboard Redesign) can build on this layout to add header controls and consolidated settings.
- Phase 65 (STKDE Integration) can add STKDE hotspot overlays to the existing map layer system.
- Phase 66 (Full Integration Testing) can target `/dashboard-v2` as the canonical user-facing route.

---

*Phase: 63-map-visualization*
*Completed: 2026-03-26*
