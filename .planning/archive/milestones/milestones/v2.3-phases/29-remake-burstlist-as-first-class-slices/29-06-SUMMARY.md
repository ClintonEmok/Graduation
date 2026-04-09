---
phase: 29-remake-burstlist-as-first-class-slices
plan: 06
subsystem: ui
tags: [timeline, svg, pointer-events, burst, slices, react]

# Dependency graph
requires:
  - phase: 29-03
    provides: Burst click handlers create/reuse slices via shared slice store utilities
provides:
  - DualTimeline detail SVG now renders zoom overlay before burst windows so burst rects are on top for click capture
  - Burst window rectangles explicitly opt into pointer events while zoom overlay keeps interactive zoom behavior
  - Burst click path remains wired to burst slice create/reuse flow without TypeScript regressions
affects: [30-multi-slice-management, 31-slice-metadata-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Resolve SVG interaction conflicts by controlling document-order layering before introducing behavioral workarounds
    - Keep interactive rect intent explicit with pointer-events attributes on overlapping SVG hit layers

key-files:
  created: []
  modified:
    - src/components/timeline/DualTimeline.tsx

key-decisions:
  - "Burst interaction reliability is solved by moving burst rects after the zoom overlay in SVG document order instead of disabling zoom hit-testing globally."
  - "Pointer-event intent is made explicit (`zoom: auto`, `burst: all`) to avoid future regressions when interaction layers are refactored."

patterns-established:
  - "SVG stacking contract: interaction-priority overlays render later when they must capture clicks over transparent zoom layers."
  - "Timeline interaction layering keeps zoom/pan overlay active while allowing burst-specific click interception in overlapping regions."

# Metrics
duration: 1 min
completed: 2026-02-19
---

# Phase 29 Plan 06: Burst Window Click Layering Summary

**DualTimeline now renders burst windows above the zoom hit layer, restoring burst click-to-slice creation while preserving zoom/pan interaction behavior on the detail timeline.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-19T22:17:47Z
- **Completed:** 2026-02-19T22:19:35Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Reordered detail SVG rendering so the zoom overlay rect renders before burst rectangles, making burst windows topmost among overlapping hit targets.
- Kept burst click binding intact (`onClick` to burst handler) and added explicit `pointerEvents="all"` on burst rects for dependable click capture.
- Set explicit `pointerEvents="auto"` on the zoom interaction rect to preserve intended zoom/pan pointer handling outside burst rect hit regions.
- Verified the change compiles cleanly with production build + TypeScript checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reorder SVG rendering for burst windows** - `8da8c9b` (fix)
2. **Task 2: End-to-end burst click verification** - `b71200f` (fix)

**Plan metadata:** pending

## Files Created/Modified
- `src/components/timeline/DualTimeline.tsx` - Reordered zoom/burst SVG layering and made pointer-event intent explicit for both interaction layers.

## Decisions Made
- Prefer SVG document-order re-layering over disabling zoom overlay pointer handling, so burst clicks are fixed without sacrificing timeline zoom mechanics.
- Keep overlap behavior explicit with `pointerEvents` on both rect layers to guard against future interaction regressions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Manual browser verification for burst click create/reuse and zoom/pan UX was not executed in this CLI run; automated `npm run build` verification passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29 gap closure is complete: timeline burst windows now sit above zoom overlay for click-driven slice creation.
- Ready to proceed with Phase 30 kickoff (`30-01-PLAN.md`).

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
