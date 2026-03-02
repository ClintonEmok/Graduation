---
phase: 40
plan: 08
subsystem: timeslicing
tags:
  - timeslicing
  - persistence
  - gap-closure
requires:
  - "40-07: Disable auto burst slices on timeslicing route"
provides:
  - Clears persisted slices on timeslicing page mount
affects: []
tech-stack:
  added: []
  patterns:
    - Mount-time store clearing for clean state
---

# Phase 40 Plan 08: Clear Existing Burst Slices on Timeslicing Mount

**One-liner:** Clear persisted slices from localStorage on timeslicing page mount

## Overview

This GAP CLOSURE plan clears existing burst slices from persistence on the timeslicing route. Even though auto burst slice creation is disabled (plan 40-07), previously persisted burst slices in localStorage still appear on page refresh. This fix ensures a clean slate on every timeslicing page load.

## Changes Made

### 1. Timeslicing Page (`src/app/timeslicing/page.tsx`)

- Added `useEffect` that calls `clearSlices()` on component mount
- Uses the already-imported `clearSlices` function from `useSliceStore`
- Clears all slices (including any stale burst slices) when page loads

```typescript
// Clear existing slices on mount to prevent stale burst slices from persisting
useEffect(() => {
  clearSlices();
}, [clearSlices]);
```

## Verification

- **Expected:** Timeslicing page starts with no slices, even after browser refresh
- **Test:** Refresh timeslicing page - no orange slices, no slices at all initially
- **Flow:** User can then create fresh time slices without stale data interference

## Key Files

| File | Change |
|------|--------|
| `src/app/timeslicing/page.tsx` | Added useEffect to clear slices on mount |

## Commit

```
11b974b feat(40-08): clear existing slices on timeslicing page mount
```

## Decisions Made

1. **Clear all vs filter burst only:** Chose to clear all slices rather than filtering out only `isBurst` slices. Simpler approach that guarantees a completely clean state for the suggestion-based workflow on this page.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None - this was a purely frontend state management change.

## Next Phase Readiness

- Timeslicing page now has clean initial state
- No interference from previously persisted burst slices
- Ready for plan 40-09 or subsequent phases
