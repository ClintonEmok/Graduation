---
phase: 03-adjacent-slice-comparison-burst-evolution
plan: 04
subsystem: ui
tags: [timeline, visualization, react, burst-score, rails]

# Dependency graph
requires:
  - phase: 03-01
    provides: comparison state and slice snapshot context
  - phase: 03-03
    provides: burst continuity context in the cube
provides:
  - per-slice burst score series helper
  - compact burst score rail in the dual timeline
  - regression coverage for score normalization and rail wiring
affects: [future timeline/evolution work]

# Tech tracking
tech-stack:
  added: []
  patterns: [timeline series helper, absolute-position rail rendering, source-inspection tests]

key-files:
  created: [src/components/timeline/lib/burst-score-series.ts, src/components/timeline/BurstScoreRail.tsx, src/components/timeline/lib/burst-score-series.test.ts, src/components/timeline/burst-score-series.phase3.test.tsx]
  modified: [src/components/timeline/DemoDualTimeline.tsx, src/components/timeline/DualTimelineSurface.tsx]

key-decisions:
  - "Represent burst intensity as a stable ordered series derived from the visible slice geometry."
  - "Highlight the strongest slice in the rail while preserving neutral zero-score bars."

patterns-established:
  - "Pattern 1: Timeline rail decorations should be driven by helper output, not ad hoc rendering math."
  - "Pattern 2: Empty-series rendering falls back to a neutral, readable placeholder."

# Metrics
duration: 3min
completed: 2026-05-07
---

# Phase 03: Adjacent Slice Comparison + Burst Evolution Summary

**A per-slice burst score rail now complements the dual timeline with stable normalized intensity bars**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-07T23:14:14Z
- **Completed:** 2026-05-07T23:14:14Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Built `buildBurstScoreSeries()` for stable per-slice scoring.
- Rendered a compact `BurstScoreRail` above the detail timeline.
- Wired the demo timeline into the surface so burst scores appear in the rail.

## Task Commits

1. **Task 1: Burst score rail** - `b915dd6` / `e39f394` (test / feat)

## Files Created/Modified
- `src/components/timeline/lib/burst-score-series.ts` - burst score series helper
- `src/components/timeline/BurstScoreRail.tsx` - rail renderer
- `src/components/timeline/DemoDualTimeline.tsx` - derives the score series
- `src/components/timeline/DualTimelineSurface.tsx` - mounts the rail
- `src/components/timeline/lib/burst-score-series.test.ts` - score normalization coverage
- `src/components/timeline/burst-score-series.phase3.test.tsx` - rail source wiring coverage

## Decisions Made
- Keep score normalization relative to the strongest visible slice.
- Use neutral fallback bars when burst scores are absent.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- None beyond normal timeline wiring.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 03 is fully implemented and ready for final planning-doc commit.
- Future phases can reuse the comparison state, burst overlay, and burst score rail contracts.

---
*Phase: 03-adjacent-slice-comparison-burst-evolution*
*Completed: 2026-05-07*
