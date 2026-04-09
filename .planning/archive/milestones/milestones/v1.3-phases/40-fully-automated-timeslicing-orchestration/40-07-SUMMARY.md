---
phase: 40
plan: 07
subsystem: timeslicing
tags:
  - timeslicing
  - burst-slices
  - dualtimeline
  - gap-closure
requires: []
provides:
  - Auto burst slices disabled on timeslicing route
  - New disableAutoBurstSlices prop on DualTimeline component
affects: []
tech-stack:
  added: []
  patterns:
    - Prop-based feature flag for auto slice creation
---

# Phase 40 Plan 07: Disable Auto Burst Slices on Timeslicing Route

**One-liner:** Added disableAutoBurstSlices prop to DualTimeline to hide orange burst slices on timeslicing page

## Overview

This GAP CLOSURE plan disables automatic burst slice creation on the timeslicing route. The timeslicing page should focus on user-created time slices and warp profiles, not automatic burst detection.

## Changes Made

### 1. DualTimeline Component (`src/components/timeline/DualTimeline.tsx`)

- Added `disableAutoBurstSlices?: boolean` prop to `DualTimelineProps` interface
- Made the `useAutoBurstSlices(burstWindows)` call conditional based on this prop
- When `disableAutoBurstSlices={true}`, the component skips auto-creating burst slices

### 2. Timeslicing Page (`src/app/timeslicing/page.tsx`)

- Passed `disableAutoBurstSlices={true}` to both DualTimeline instances
- The Timeline section and Selection Timeline section now both disable auto burst slices

## Verification

- **Expected:** No orange burst slices appear on timeslicing page
- **Actual:** Only user-created time slices should be visible
- **Focus:** Remains on warp profiles and suggestion workflow

## Key Files

| File | Change |
|------|--------|
| `src/components/timeline/DualTimeline.tsx` | Added `disableAutoBurstSlices` prop |
| `src/app/timeslicing/page.tsx` | Pass `disableAutoBurstSlices={true}` to both timelines |

## Commit

```
cd05fa9 feat(40-07): disable auto burst slices on timeslicing route
```

## Decisions Made

1. **Prop-based approach:** Added a boolean prop to DualTimeline rather than removing the hook entirely, preserving the functionality for other routes that need auto burst slices.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- The timeslicing route now properly focuses on user-created slices
- Other routes continue to work with auto burst slices enabled
- No blockers identified for subsequent plans
