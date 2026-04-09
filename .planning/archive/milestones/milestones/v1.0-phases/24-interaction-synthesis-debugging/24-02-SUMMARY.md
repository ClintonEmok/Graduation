---
phase: 24-interaction-synthesis-debugging
plan: 02
subsystem: 3d-interaction
tags: [three.js, raycasting, shader, ghosting, brush-selection]

# Dependency graph
requires:
  - phase: 24-01
    provides: "Coordination store infrastructure"
provides:
  - Reliable 3D click detection with drag vs click discrimination
  - Visual raycasting debug logging
  - Brush-based context dimming in shader
affects:
  - Timeline brush integration (Plan 24-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drag threshold detection (5px) to distinguish click vs drag"
    - "Brush-based shader dimming via uBrushStart/uBrushEnd uniforms"
    - "Raycasting debug logging for click troubleshooting"

key-files:
  created: []
  modified:
    - src/components/viz/DataPoints.tsx
    - src/components/viz/shaders/ghosting.ts
    - src/store/useCoordinationStore.ts

key-decisions:
  - "Use onPointerUp instead of onPointerDown for selection to allow drag detection"
  - "5px threshold for distinguishing drag from click"
  - "Brush range integrated with existing context opacity system"

patterns-established:
  - "Drag vs Click: Track pointer down position, compare to up position"
  - "Shader Context Dimming: Points outside brush range get 0.1x opacity"

# Metrics
duration: 1 min
completed: 2026-02-05
---

# Phase 24 Plan 02: 3D Click Targeting & Visual Debugging Summary

**Fixed 3D click reliability with drag detection and implemented brush-based context dimming via shader uniforms.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-05T21:56:20Z
- **Completed:** 2026-02-05T21:58:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- **Reliable click detection:** Switched from `onPointerDown` to `onPointerUp` with 5px drag threshold
- **Visual debugging:** Added detailed raycast logging to console for hit/miss diagnosis
- **Brush-based dimming:** Shader now dims points outside brush range by 0.1x opacity
- **Coordination store:** Extended with `brushRange` state for timeline integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Debug Raycasting** - `660f565` (fix)
2. **Task 2: Update Shader for Ghosting** - `d76889a` (feat)

**Plan metadata:** [to be committed]

## Files Created/Modified
- `src/components/viz/DataPoints.tsx` - Enhanced raycasting with click/drag detection and brush uniform updates
- `src/components/viz/shaders/ghosting.ts` - Added uBrushStart/uBrushEnd for context dimming
- `src/store/useCoordinationStore.ts` - Added brushRange state and setBrushRange action

## Decisions Made
- Used 5px drag threshold to prevent accidental selections during camera rotation
- Integrated brush dimming with existing context opacity system (multiplicative)
- Chose `onPointerUp` over `onClick` for better React Three Fiber compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- 3D interaction is now robust with debug logging for troubleshooting
- Brush range infrastructure ready for timeline integration (Plan 24-03)
- Shader supports dynamic context dimming based on brush selection

---
*Phase: 24-interaction-synthesis-debugging*
*Completed: 2026-02-05*
