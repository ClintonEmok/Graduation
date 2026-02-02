---
phase: 08-coordinated-views
plan: 02
subsystem: ui
tags: [react, zustand, maplibre, three, d3]

# Dependency graph
requires:
  - phase: 08-01
    provides: Dual-scale timeline with time/filter synchronization
provides:
  - Shared selection store with source tagging
  - Cube picking with shader highlight for selected instance
  - Map and timeline selection markers tied to shared index
affects: [09-study-logging, 10-study-content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared selection store for cross-view coordination
    - Selection helpers for index/time/scene resolution

key-files:
  created:
    - src/store/useCoordinationStore.ts
    - src/lib/selection.ts
    - src/components/map/MapSelectionMarker.tsx
  modified:
    - src/components/viz/DataPoints.tsx
    - src/components/viz/shaders/ghosting.ts
    - src/components/map/MapVisualization.tsx
    - src/components/timeline/DualTimeline.tsx

key-decisions:
  - "None - followed plan as specified"

patterns-established:
  - "Selection updates flow through useCoordinationStore with source tagging"
  - "Selection resolution centralized in src/lib/selection.ts"

# Metrics
duration: 19 min
completed: 2026-02-02
---

# Phase 08 Plan 02: Coordinated Selection Summary

**Cross-view selection now synchronizes cube, map, and timeline highlights via a shared store and lookup helpers.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-02T19:25:36Z
- **Completed:** 2026-02-02T19:45:36Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a shared coordination store and selection lookup helpers for index/time/scene resolution
- Enabled cube instance picking with shader-driven highlight for the selected event
- Rendered synchronized map/timeline selection markers with click-to-select behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a coordination selection store and helpers** - `39129ac` (feat)
2. **Task 2: Enable cube picking and shader highlighting** - `bb7962e` (feat)
3. **Task 3: Render selection markers in map and timeline** - `c2e4037` (feat)

**Plan metadata:** (docs: complete plan)

## Files Created/Modified
- `src/store/useCoordinationStore.ts` - Shared selection state with source tagging
- `src/lib/selection.ts` - Selection resolution helpers for index/time/scene lookups
- `src/components/map/MapSelectionMarker.tsx` - MapLibre marker for selected event
- `src/components/viz/DataPoints.tsx` - Cube instance picking and selection uniforms
- `src/components/viz/shaders/ghosting.ts` - Shader highlight for selected instance
- `src/components/map/MapVisualization.tsx` - Map selection marker and click-to-select
- `src/components/timeline/DualTimeline.tsx` - Timeline selection marker and click-to-select

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 8 coordinated selection is complete; ready to move into Phase 9 logging infrastructure. Existing lint/LSP issues remain unchanged.

---
*Phase: 08-coordinated-views*
*Completed: 2026-02-02*
