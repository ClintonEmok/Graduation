---
phase: 24-interaction-synthesis-debugging
plan: 01
subsystem: ui

tags: [three.js, shader, focus+context, coordination, zustand, visx]

requires:
  - phase: 23-interaction-synthesis-debugging
    provides: Map interaction and debug visualization
  - phase: 21-timeline-redesign
    provides: Visx-based timeline with brush component

provides:
  - Centralized selection state via useCoordinationStore
  - Ghosting shader with dynamic opacity support
  - Timeline-to-3D synchronization via time range
  - Focus+Context visualization in 3D view

affects:
  - Plan 24-03 (selection sync hook)
  - Future map-timeline-cube coordination features

tech-stack:
  added: []
  patterns:
    - "Single source of truth: useCoordinationStore for selection state"
    - "Opacity-based dithering for smooth ghosting transitions"
    - "Normalized time range (0-100) as common currency between components"

key-files:
  created: []
  modified:
    - src/store/useCoordinationStore.ts
    - src/components/viz/shaders/ghosting.ts
    - src/components/timeline/Timeline.tsx

key-decisions:
  - "Deferred selection-to-time sync to Plan 03 via useSelectionSync hook"
  - "Dynamic dithering based on uContextOpacity for smoother ghosting than fixed patterns"
  - "Timeline brush converts dates to normalized time (0-100) for shader consumption"

patterns-established:
  - "Shader ghosting: discard rate tied to opacity uniform for visual density control"
  - "Time normalization: all components use 0-100 range for cross-compatibility"

duration: 2min
completed: 2026-02-05
---

# Phase 24 Plan 01: Interaction Synchronization Summary

**Centralized selection state and dynamic ghosting shader for Focus+Context interactions between Map, Timeline, and 3D Cube**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T21:53:27Z
- **Completed:** 2026-02-05T21:54:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Verified useCoordinationStore provides centralized selection state with typed source tracking
- Enhanced ghosting shader with opacity-based dithering for smoother Focus+Context visuals
- Fixed timeline brush to convert Date selections to normalized time range (0-100)
- Established data flow: Timeline Brush → timeRange store → DataPoints shader uniforms

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance Coordination Store** - `5348824` (feat)
2. **Task 2: Implement Focus+Context in 3D** - `defab7d` (feat)

**Plan metadata:** (to be added after final commit)

## Files Created/Modified

- `src/store/useCoordinationStore.ts` - Verified as single source of truth for selection state
- `src/components/viz/shaders/ghosting.ts` - Dynamic opacity-based ghosting with dithering
- `src/components/timeline/Timeline.tsx` - Brush selection now updates store with normalized time

## Decisions Made

- Store verification sufficient for now; sync logic deferred to Plan 03 via `useSelectionSync` hook
- Replaced fixed 50% dither pattern with opacity-proportional discard threshold
- Timeline uses `epochSecondsToNormalized` utility for consistent time representation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Store ready for Plan 03's useSelectionSync hook
- Shader ready for opacity-controlled ghosting
- Timeline-3D sync established via timeRange
- Ready for Plan 24-02: Additional synchronization features

---
*Phase: 24-interaction-synthesis-debugging*
*Completed: 2026-02-05*
