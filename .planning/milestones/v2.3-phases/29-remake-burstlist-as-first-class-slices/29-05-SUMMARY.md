---
phase: 29-remake-burstlist-as-first-class-slices
plan: 05
subsystem: ui
tags: [timeslicing, slices, rename, accessibility, react, zustand]

# Dependency graph
requires:
  - phase: 29-02
    provides: Unified burst/manual slice list with rename-aware burst chip behavior
  - phase: 29-04
    provides: Burst/manual lifecycle parity for boundary edit, deletion, and recreation
provides:
  - Inline rename workflow in timeline-test SliceList with keyboard-first accessibility behavior
  - SliceManagerUI per-slice name input wired to shared slice store updates
  - Cross-surface rename parity with fallback naming and burst-chip visibility based on name
affects: [30-multi-slice-management, 31-slice-metadata-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Keep rename persistence centralized in `useSliceStore.updateSlice` from all UI surfaces
    - Treat empty/whitespace names as cleared values so fallback display naming remains canonical

key-files:
  created: []
  modified:
    - src/app/timeline-test/components/SliceList.tsx
    - src/components/viz/SliceManagerUI.tsx

key-decisions:
  - "SliceList uses an explicit edit button + inline input with Enter/Escape/blur controls to preserve keyboard accessibility and avoid accidental list activation."
  - "SliceManagerUI stores explicit names only; empty input clears `name` to reuse existing fallback naming logic."

patterns-established:
  - "Rename parity: both list surfaces write `name` through the same store API to keep state synchronized."
  - "Fallback-safe naming: clearing names always returns to generated labels (`Slice N` / `Burst N`) and controls burst chip visibility."

# Metrics
duration: 2 min
completed: 2026-02-19
---

# Phase 29 Plan 05: Rename Parity for Slice Lists Summary

**Slice naming is now editable from both timeline-test SliceList and SliceManagerUI, with synchronized store updates, keyboard editing controls, and fallback-safe burst chip behavior.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T15:53:04Z
- **Completed:** 2026-02-19T15:55:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added inline rename flow to `SliceList` with edit state, focused text input, and Enter/Escape/blur handling.
- Wired rename persistence in `SliceList` to `useSliceStore.updateSlice(id, { name })` with empty-name clearing.
- Added compact per-slice name input in `SliceManagerUI` above existing type/time controls using the same store update pathway.
- Preserved fallback display naming and burst-chip logic by clearing names to `undefined` when input is empty/whitespace.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inline rename to SliceList** - `521f67b` (feat)
2. **Task 2: Add rename input to SliceManagerUI** - `ef58b2d` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/app/timeline-test/components/SliceList.tsx` - Added inline rename affordance with edit button, focused input, save/cancel shortcuts, and propagation-safe controls.
- `src/components/viz/SliceManagerUI.tsx` - Added compact name input per slice with fallback placeholder and store-backed rename updates.

## Decisions Made
- Keep rename writes centralized via `updateSlice` in both surfaces so cross-location naming stays instantly consistent.
- Use explicit clear-to-undefined behavior for empty values so generated fallback labels remain source-of-truth for unnamed slices.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Manual browser verification steps were not executed in this CLI run; build/type verification passed and UI wiring matches required behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 29 rename gap is closed and burst/manual slices now expose full edit parity across list surfaces.
- Ready for Phase 30 multi-slice management kickoff (`30-01-PLAN.md`).

---
*Phase: 29-remake-burstlist-as-first-class-slices*
*Completed: 2026-02-19*
