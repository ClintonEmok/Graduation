---
phase: 29-remake-burstlist-as-first-class-slices
plan: 04
subsystem: ui
tags: [timeslicing, burst, slices, timeline, zustand, accessibility]

# Dependency graph
requires:
  - phase: 29-02
    provides: Unified slice list parity and burst chip behavior for manual and burst-derived slices
  - phase: 29-03
    provides: Burst interactions wired to slice store create/select lifecycle
provides:
  - Burst and manual slices render with unified committed timeline treatment
  - Burst boundary editing, deletion, and recreation lifecycle parity through slice-store updates
  - Active burst overlay highlight synchronized from active burst slice state
affects: [30-multi-slice-management, 31-slice-metadata-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Burst matching for burst actions uses burst-only range lookup to avoid accidental manual-range reuse
    - Active overlay highlight derives from active burst slice range with tolerance-based matching

key-files:
  created: []
  modified:
    - src/app/timeline-test/components/CommittedSliceLayer.tsx
    - src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx
    - src/components/timeline/DualTimeline.tsx
    - src/components/viz/BurstList.tsx
    - src/store/useSliceStore.ts
    - src/store/useSliceStore.test.ts
    - src/app/timeline-test/page.tsx

key-decisions:
  - "Burst recreation should ignore manual-only range matches; reuse is limited to burst-derived slices."
  - "Burst overlay highlighting is active only when the active slice is burst-origin and range-matches a burst window."

patterns-established:
  - "Lifecycle parity: burst slices follow the same create/edit/delete flow as manual slices, with recreation after deletion from the same burst trigger."
  - "Verification affordances: timeline and handle layers expose origin metadata/labels to validate mixed slice behavior safely."

# Metrics
duration: 4 min
completed: 2026-02-19
---

# Phase 29 Plan 04: Burst Lifecycle Parity Summary

**Burst-derived slices now behave as full first-class slices across timeline rendering, boundary editing, active overlay sync, and delete/recreate lifecycle handling.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T15:06:03Z
- **Completed:** 2026-02-19T15:10:59Z
- **Tasks:** 5
- **Files modified:** 7

## Accomplishments
- Ensured committed timeline rendering path remains uniform for burst and manual slices, including edge-safe point geometry.
- Preserved boundary adjustment parity for burst slices with lock-aware handle behavior and stronger accessibility metadata.
- Synced burst overlay highlight directly from active burst slice range matching for consistent bidirectional selection UX.
- Fixed burst deletion/recreation edge behavior by preventing manual-only range matches from hijacking burst recreation.
- Polished integration UX with burst linkage memoization, improved burst list accessibility states, and explicit lifecycle verification guidance on the test page.

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify burst slices render on timeline** - `a81d62c` (fix)
2. **Task 2: Verify boundary adjustment works for burst slices** - `477a7f9` (fix)
3. **Task 3: Sync burst overlay highlight with active slice** - `48d375b` (fix)
4. **Task 4: Handle burst slice deletion and recreation** - `8f06a57` (fix)
5. **Task 5: Final integration test and polish** - `4feca68` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/app/timeline-test/components/CommittedSliceLayer.tsx` - Added edge-safe point clamping and origin metadata while keeping unified slice rendering.
- `src/app/timeline-test/components/SliceBoundaryHandlesLayer.tsx` - Added handle labeling/origin metadata to support burst/manual parity verification and accessibility.
- `src/components/timeline/DualTimeline.tsx` - Derived burst highlight from active burst slice range instead of per-window slice lookup equality.
- `src/store/useSliceStore.ts` - Added burst-only matching option and constrained burst reuse logic to burst-derived slices.
- `src/store/useSliceStore.test.ts` - Added regression test covering burst creation when only a manual matching range exists.
- `src/components/viz/BurstList.tsx` - Switched to burst-only lookup + memoized linkage map and richer accessibility/state treatment.
- `src/app/timeline-test/page.tsx` - Added burst lifecycle verification checklist copy for integration validation.

## Decisions Made
- Keep burst lifecycle deterministic by restricting `addBurstSlice` reuse to burst-derived matches, so deletion and re-click reliably recreate burst slices.
- Keep overlay highlighting tied to active burst slices only; manual slices do not light burst overlays unless they are burst-origin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed edge clipping for committed point slices**
- **Found during:** Task 1 (Verify burst slices render on timeline)
- **Issue:** Point slices at viewport boundaries could render partially clipped due to unclamped left offset.
- **Fix:** Clamp point geometry left position to chart range.
- **Files modified:** `src/app/timeline-test/components/CommittedSliceLayer.tsx`
- **Verification:** Targeted lint passed for component; geometry path remains shared for all slice types.
- **Committed in:** `a81d62c`

**2. [Rule 1 - Bug] Prevented manual ranges from blocking burst recreation**
- **Found during:** Task 4 (Handle burst slice deletion and recreation)
- **Issue:** `findMatchingSlice` matched any range slice, so manual slices could be reused by burst creation and break expected recreate behavior.
- **Fix:** Added optional burst-only matching and updated burst reuse callers to use it.
- **Files modified:** `src/store/useSliceStore.ts`, `src/components/viz/BurstList.tsx`, `src/store/useSliceStore.test.ts`
- **Verification:** `npm test -- src/store/useSliceStore.test.ts` passed with new regression coverage.
- **Committed in:** `8f06a57`

---

**Total deviations:** 2 auto-fixed (2 bug)
**Impact on plan:** Auto-fixes were required for lifecycle correctness and visual parity; no scope creep.

## Issues Encountered
- Repository-wide `npm run lint` currently fails due many pre-existing unrelated lint violations outside this plan scope.
- Plan files lint clean via targeted checks, and `npm run build` succeeds.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29 burst-as-slices lifecycle parity is complete and ready to hand off.
- Ready for Phase 30 multi-slice management work.

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
