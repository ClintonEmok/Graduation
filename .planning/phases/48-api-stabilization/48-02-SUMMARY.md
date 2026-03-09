---
phase: 48-api-stabilization
plan: 02
subsystem: api
tags: [react-query, buffering, hook, api-contract, vitest]

# Dependency graph
requires:
  - phase: 48-01
    provides: shared coordinate normalization and range-route contract coverage before client/API buffering cleanup
provides:
  - Single authoritative buffering layer in `/api/crimes/range`
  - `useCrimeData` requests keyed by visible range plus `bufferDays`
  - Hook regression coverage aligned with API-applied buffer metadata
affects: [timeline-data-plumbing, suggestion-generation, viewport-fetching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client hooks pass visible ranges to API boundaries and consume server-reported buffer metadata as the source of truth

key-files:
  created: []
  modified:
    - src/hooks/useCrimeData.ts
    - src/hooks/useCrimeData.test.ts
    - package.json

key-decisions:
  - "Treat `/api/crimes/range` as the only buffering authority and have `useCrimeData` report the API's applied range instead of recomputing it client-side."
  - "Include `bufferDays` in the React Query key so alternate buffer settings cannot reuse stale visible-range cache entries."

patterns-established:
  - "Single-layer buffering: hooks forward visible epochs, APIs expand them."
  - "Buffer metadata parity: consumers trust `meta.buffer.applied` for the actual fetched range."

# Metrics
duration: 2 min
completed: 2026-03-09
---

# Phase 48 Plan 02: API Buffering Contract Summary

**`useCrimeData` now sends visible epochs to `/api/crimes/range`, while the API alone applies `bufferDays` and reports the fetched span back through metadata.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T00:29:50Z
- **Completed:** 2026-03-09T00:31:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Removed client-side date math from `useCrimeData` so buffering no longer happens twice.
- Forwarded `bufferDays` to `/api/crimes/range` and used API metadata to populate the hook's `bufferedRange`.
- Updated hook tests to assert visible-range requests and API-driven buffer metadata for default and custom buffers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove client-side buffering from useCrimeData** - `09eea47` (fix)
2. **Task 2: Update useCrimeData tests for API-driven buffering** - `16ff69b` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `src/hooks/useCrimeData.ts` - Sends visible range plus `bufferDays` to the API and reports the API-applied range.
- `src/hooks/useCrimeData.test.ts` - Verifies visible-range requests, forwarded `bufferDays`, and metadata-backed `bufferedRange` values.
- `package.json` - Adds a `typecheck` script so plan verification can run with `npm run typecheck`.

## Decisions Made
- Kept buffering logic exclusively in `/api/crimes/range` so the hook cannot drift from server-side range expansion.
- Used `meta.buffer.applied` as the hook's authoritative fetched range so downstream consumers observe the real API window.
- Added `bufferDays` to the query key because visible start/end alone are no longer enough to identify unique fetches.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `bufferDays` to the hook query key**
- **Found during:** Task 1 (Remove client-side buffering from useCrimeData)
- **Issue:** Once the hook stopped pre-buffering epochs, the existing query key no longer distinguished requests that shared a visible range but used different buffer sizes.
- **Fix:** Included `bufferDays` in the React Query key while still keying on visible start/end epochs.
- **Files modified:** `src/hooks/useCrimeData.ts`
- **Verification:** `npm test -- useCrimeData.test.ts`, `npm run typecheck`
- **Committed in:** `09eea47` (part of task commit)

**2. [Rule 3 - Blocking] Added missing typecheck script for plan verification**
- **Found during:** Task 1 (Remove client-side buffering from useCrimeData)
- **Issue:** The repository did not expose `npm run typecheck`, so the plan's required verification command failed before TypeScript could be checked.
- **Fix:** Added `"typecheck": "tsc --noEmit"` to `package.json`.
- **Files modified:** `package.json`
- **Verification:** `npm run typecheck`
- **Committed in:** `09eea47` (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required to preserve correct cache behavior and to make the planned verification path executable. No scope creep.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 48 is complete and the hook/API buffering contract is now aligned.
- Suggestion generation and viewport consumers can rely on `bufferedRange` reflecting the actual server-fetched span.

---
*Phase: 48-api-stabilization*
*Completed: 2026-03-09*
