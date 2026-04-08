---
phase: 16-heatmap-layer
plan: 03
subsystem: ui
tags: [react, three.js, heatmap, maplibre]

# Dependency graph
requires:
  - phase: 16-heatmap-layer
    provides: [GPGPU Heatmap Engine, Heatmap Store]
provides:
  - Heatmap visibility in 3D Cube view
  - Heatmap overlay synchronized with Map view
affects: [Phase 17: Cluster Highlighting]

# Tech tracking
tech-stack:
  added: []
  patterns: [Two-pass GPGPU rendering, Camera synchronization between Three.js and MapLibre]

key-files:
  created: [src/components/map/MapHeatmapOverlay.tsx]
  modified: [src/components/viz/MainScene.tsx, src/components/map/MapVisualization.tsx, src/components/viz/HeatmapOverlay.tsx]

key-decisions:
  - "Use a separate Three.js Canvas for the map overlay to avoid complex integration with MapLibre's internal GL context."
  - "Sync the Three.js orthographic camera using Web Mercator projection units at a fixed base zoom (12) to match the data projection."

patterns-established:
  - "Map-Three.js Sync: Synchronizing a Three.js camera with MapLibre's view state for perfectly aligned overlays."

# Metrics
duration: 15 min
completed: 2026-02-05
---

# Phase 16 Plan 03: View Integration Summary

**Integrated the GPGPU Heatmap engine into both the 3D Cube and 2D Map views with perfectly synchronized camera movement.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-05T14:07:00Z
- **Completed:** 2026-02-05T14:22:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Integrated `HeatmapOverlay` into `MainScene.tsx` for visibility in the 3D Cube view.
- Implemented `MapHeatmapOverlay.tsx` which provides a Three.js Canvas overlay for the map panel.
- Developed a camera synchronization hook that aligns the Three.js view with MapLibre's pan and zoom.
- Added support for `AdditiveBlending` in `HeatmapOverlay` to improve visibility over map labels and features.

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate into 3D Cube Scene** - `8ef1169` (feat)
2. **Task 2: Add Three.js Overlay to Map Panel** - `24ff426` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `src/components/viz/MainScene.tsx` - Added HeatmapOverlay to the 3D scene.
- `src/components/map/MapVisualization.tsx` - Added MapHeatmapOverlay to the map panel.
- `src/components/map/MapHeatmapOverlay.tsx` - Created new component for map-synchronized heatmap rendering.
- `src/components/viz/HeatmapOverlay.tsx` - Added `blending` prop to support different view modes.

## Decisions Made
- Used a separate Canvas for the map overlay. While rendering directly into MapLibre's context is possible, a separate Canvas is more robust and easier to manage with React Three Fiber.
- Opted for `AdditiveBlending` on the map view as requested, which helps map details shine through the heatmap hotspots.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Heatmap layer is fully functional and integrated.
- Ready for Phase 17: Cluster Highlighting.

---
*Phase: 16-heatmap-layer*
*Completed: 2026-02-05*
