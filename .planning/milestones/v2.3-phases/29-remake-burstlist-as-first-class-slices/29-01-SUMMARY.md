---
phase: 29-remake-burstlist-as-first-class-slices
plan: 01
subsystem: timeline
tags: [timeslicing, zustand, burst, range-matching, vitest]

# Dependency graph
requires:
  - phase: 28-slice-boundary-adjustment
    provides: Stable range slice creation and boundary-adjustment state/store patterns
provides:
  - Burst-derived slices as first-class `TimeSlice` entries with `isBurst` and `burstSliceId`
  - Store-level burst creation/reuse flow using tolerance-based range matching
  - Shared range matching utilities (`rangesMatch`, `calculateRangeTolerance`, `withinTolerance`)
  - Timeline-sorted slice store ordering with manual-before-burst tie-breaking at equal starts
affects: [29-02-unified-slice-list, 29-03-burst-interaction-wiring, 30-multi-slice-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Burst windows map to canonical range slices via tolerance matching before creation
    - Slice ordering is store-owned so UI consumers render in timeline order without local sorting logic

key-files:
  created:
    - src/lib/slice-utils.ts
    - src/lib/slice-utils.test.ts
  modified:
    - src/store/useSliceStore.ts
    - src/store/useSliceStore.test.ts
    - src/app/timeline-test/components/SliceList.tsx

key-decisions:
  - "Default burst matching tolerance is 0.5% of candidate range span (`0.005 * span`)."
  - "When starts are equal, manual slices are ordered before burst-derived slices; same-class ties preserve insertion order."

patterns-established:
  - "Burst-to-slice reuse: `addBurstSlice` delegates to `findMatchingSlice` before new slice creation."
  - "Store-sorted source of truth: add/update flows re-sort slices by timeline start for consistent list behavior."

# Metrics
duration: 3 min
completed: 2026-02-19
---

# Phase 29 Plan 01: Burst Slice Mapping Foundation Summary

**Burst windows now become reusable first-class range slices with tolerance-based matching and store-owned timeline sorting, enabling no-duplicate burst mapping as the baseline for unified slice UX.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T14:47:45Z
- **Completed:** 2026-02-19T14:51:06Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extended `TimeSlice` and `useSliceStore` with burst metadata (`isBurst`, `burstSliceId`) plus `addBurstSlice` and `findMatchingSlice` APIs.
- Implemented tolerance-based reuse so near-identical burst ranges select existing slices instead of creating duplicates.
- Added shared range matching utilities in `src/lib/slice-utils.ts` with edge-case unit coverage.
- Enforced timeline-start sorting in the store (manual-before-burst ties) and updated `SliceList` fallback naming to trust store ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend TimeSlice type with burst metadata** - `c178306` (feat)
2. **Task 2: Create slice range matching utilities** - `3503c18` (feat)
3. **Task 3: Add burst slice sorting by start time** - `bced479` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/store/useSliceStore.ts` - Added burst slice APIs, tolerance matching integration, and stable store-level sorting.
- `src/store/useSliceStore.test.ts` - Added burst creation/reuse tests and ordering assertions.
- `src/lib/slice-utils.ts` - Added reusable tolerance and range-matching utilities.
- `src/lib/slice-utils.test.ts` - Added utility edge-case coverage for tolerance and range matching.
- `src/app/timeline-test/components/SliceList.tsx` - Switched fallback numbering to store-order ordinal lookup.

## Decisions Made
- Kept default burst matching tolerance at 0.5% of range span to absorb float jitter while avoiding broad false-positive matches.
- Centralized slice ordering in the store so all consumers (including SliceList) receive deterministic timeline order without duplicated UI logic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29-01 foundation is complete and ready for 29-02 unified list presentation with burst chip treatment.
- No blockers identified.

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
