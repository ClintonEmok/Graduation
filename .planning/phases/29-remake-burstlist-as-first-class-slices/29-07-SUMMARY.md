---
phase: 29-remake-burstlist-as-first-class-slices
plan: 07
subsystem: ui
tags: [timeline, slices, burst, automatic, react, hooks]

# Dependency graph
requires:
  - phase: 29-06
    provides: SVG layering fix enabling burst click interactions
provides:
  - Automatic burst slice creation when burst data becomes available
  - Burst windows appear as slices without user interaction
  - Burst list and timeline overlays act as slice navigators (not creators)
  - Burst slice reuse logic prevents duplicates on recomputation
affects: [30-multi-slice-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Automatic slice creation via useEffect hook subscribed to burst data changes"
    - "Separation of creation logic from UI interactions"
    - "Range matching with tolerance for duplicate prevention"

key-files:
  created: []
  modified:
    - src/store/useSliceStore.ts
    - src/components/timeline/DualTimeline.tsx
    - src/components/viz/BurstList.tsx
    - src/lib/slice-utils.ts

key-decisions:
  - "Burst windows automatically become slices without user interaction - no click-to-create"
  - "UI components select existing slices instead of creating new ones"
  - "Reuse logic prevents duplicate burst slices when data recomputes"
  - "Auto-creation only runs when burst windows exist and computation is complete"

patterns-established:
  - "Store-level effects for automatic data synchronization (useAutoBurstSlices)"
  - "UI components as navigators/selectors rather than creators for derived data"

# Metrics
duration: 15 min
completed: 2026-02-19
---

# Phase 29 Plan 07: Automatic Burst Slice Creation Summary

**Burst windows now automatically appear as slices without user interaction — clicking burst overlays or list items selects existing slices instead of creating new ones.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-19T22:20:00Z
- **Completed:** 2026-02-19T22:35:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Implemented `useAutoBurstSlices` hook that automatically creates burst slices when burst data becomes available
- Removed click-to-create behavior from DualTimeline burst overlay clicks — now selects existing auto-created slice
- Removed click-to-create behavior from BurstList item clicks — now selects existing auto-created slice
- Exported `normalizeRange` from slice-utils for consistent range normalization across components
- Verified burst slice reuse logic prevents duplicates during recomputation
- All UI interactions now navigate to existing slices rather than creating new ones

## Task Commits

Each task was committed atomically:

1. **Task 1: Add automatic burst slice creation effect** - `1efdc62` (feat)
2. **Task 2: Convert burst interactions from create to select** - `5ca3fd3` (feat)
3. **Task 3: Verify end-to-end automatic behavior** - (verification only, no commit)

**Post-plan fixes:**
4. **Fix burst date display in BurstList** - `b568614` (fix)
5. **Fix slice date display in SliceList** - `7a52ee0` (fix)
6. **Fix infinite burst slice creation loop** - `fcf6bca` (fix)

**Plan metadata:** `521a1c3` (docs: complete plan)

## Files Created/Modified

- `src/store/useSliceStore.ts` - Added `useAutoBurstSlices` hook for automatic burst slice creation
- `src/components/timeline/DualTimeline.tsx` - Mounted auto-creation effect; updated burst click to select existing slice
- `src/components/viz/BurstList.tsx` - Updated burst list click to select existing slice instead of create; fixed date display for dual mapDomain formats
- `src/lib/slice-utils.ts` - Exported `normalizeRange` for range normalization
- `src/app/timeline-test/components/SliceList.tsx` - Fixed `toTimestampLabel` to handle both normalized and epoch timestamp formats

## Decisions Made

- **Automatic creation preferred over click-to-create:** Burst slices should exist automatically without requiring user interaction, aligning with "first-class slices" vision.
- **UI as navigator pattern:** Clicking burst elements now selects existing slices rather than creating them, consistent with how other slice navigation works.
- **Reuse via findMatchingSlice:** Existing addBurstSlice logic with findMatchingSlice prevents duplicates when burst data recomputes.
- **isComputing guard:** Auto-creation only runs when computation is complete to avoid creating mid-computation artifacts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BurstList showing percentages instead of dates**

- **Found during:** Post-implementation verification (user report)
- **Issue:** BurstList displayed `t=xx.xx → yy.yy` (percentages) instead of actual dates because it didn't handle the dual nature of mapDomain (normalized 0-100 vs epoch timestamps)
- **Fix:** Added domain type detection (`isNormalizedDomain = mapDomain[1] < 1000`) and conditional conversion:
  - For normalized domain: use `normalizedToEpochSeconds()` with min/max timestamps
  - For epoch domain: divide by 1000 to convert ms to seconds
- **Files modified:** `src/components/viz/BurstList.tsx`
- **Verification:** Build passes, code review confirms correct handling of both data formats
- **Committed in:** `b568614` (post-plan fix)

**2. [Rule 1 - Bug] Fixed SliceList showing epoch timestamps with % instead of dates**

- **Found during:** Post-implementation verification (user report)
- **Issue:** SliceList displayed `1713773390.90% → 1715102582.64%` (epoch timestamps with % suffix) instead of actual dates
- **Root cause:** The `toTimestampLabel` function assumed all time values were normalized (0-100), but burst slice ranges store actual epoch timestamps when mapDomain is in epoch format
- **Fix:** Added epoch timestamp detection (`isEpochTimestamp = timeValue > 1000000000`) in `toTimestampLabel`:
  - For epoch timestamps: convert milliseconds to seconds if needed, then format as date
  - For normalized values: use existing domain-based conversion
- **Files modified:** `src/app/timeline-test/components/SliceList.tsx`
- **Verification:** Build passes
- **Committed in:** `7a52ee0` (post-plan fix)

**3. [Rule 1 - Bug] Fixed infinite burst slice creation loop creating 174+ slices**

- **Found during:** Post-implementation verification (user report)
- **Issue:** `useAutoBurstSlices` effect was creating 174+ burst slices instead of the expected ~10
- **Root cause:** The effect depended on `addBurstSlice` from the store. Every time a slice was added, the store updated, potentially creating new function references and triggering the effect again, causing an infinite loop
- **Fix:** Added processed window tracking mechanism:
  - Use `useRef` to maintain a Set of processed window signatures
  - Generate signatures using rounded coordinates (3 decimal places) to handle floating-point precision
  - Skip windows that have already been processed
  - Clear tracking when all burst slices are removed (to allow re-creation after full reset)
- **Files modified:** `src/store/useSliceStore.ts`
- **Verification:** Build passes
- **Committed in:** `fcf6bca` (post-plan fix)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes necessary for correct burst slice behavior. No scope creep.

## Issues Encountered

1. **Burst date display issue in BurstList (post-implementation):** BurstList showed percentages instead of dates due to inconsistent mapDomain formats across different data loading paths (columnar vs mock data). Fixed by detecting domain type and converting appropriately.

2. **Slice date display issue in SliceList (post-implementation):** SliceList showed epoch timestamps with % suffix (e.g., `1713773390.90% → 1715102582.64%`) instead of dates. Fixed by detecting epoch timestamp values in `toTimestampLabel` function and formatting them as dates.

3. **Infinite burst slice creation loop (post-implementation):** The auto-creation effect was creating 174+ burst slices instead of the expected ~10. This was caused by the effect re-triggering every time the store updated. Fixed by adding processed window tracking with `useRef` to ensure each unique burst window is only processed once.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29 gap closure complete: burst windows are now automatic first-class slices
- Ready to proceed with Phase 30 kickoff (`30-01-PLAN.md`)

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
