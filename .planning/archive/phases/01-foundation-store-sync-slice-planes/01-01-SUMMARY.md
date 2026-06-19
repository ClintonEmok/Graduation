---
phase: 01-foundation-store-sync-slice-planes
plan: 01
subsystem: testing
tags: [typescript, vitest, binning, monthly, calendar-months, engine, rules]

# Dependency graph
requires:
  - phase: 13-ux-ia-redesign-cube-concept
    provides: dashboard-demo and cube foundation used by the new binning surface
provides:
  - Monthly granularity in the shared timeslicing vocabulary
  - Calendar-month bin generation in the legacy binning engine
  - Source-inspection regression coverage for the monthly contract
affects: [phase-01 cube wiring, phase-02 slice planes, any monthly-aware generation UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - shared granularity contract across stores, UI, and engine
    - calendar-boundary binning for monthly partitions
    - source-inspection regression tests for API vocabulary

key-files:
  created:
    - src/lib/binning/monthly-contract.phase1.test.ts
  modified:
    - src/store/useTimeslicingModeStore.ts
    - src/components/binning/BinningControls.tsx
    - src/lib/binning/rules.ts
    - src/lib/binning/engine.ts

key-decisions:
  - "Made monthly a first-class shared granularity so the demo and legacy binning surfaces cannot drift apart."
  - "Implemented monthly binning by calendar month boundaries rather than aliasing it to another fixed interval."

patterns-established:
  - "Pattern 1: keep the public binning vocabulary in sync across store, UI, rules, and engine."
  - "Pattern 2: validate vocabulary with source-inspection tests that fail on missing string tokens."

# Metrics
duration: 1 min
completed: 2026-05-06
---

# Phase 01 Plan 01: Monthly binning contract Summary

**Monthly granularity now flows through the shared binning contract and has a dedicated calendar-month engine path.**

## Performance

- **Duration:** 14 sec
- **Started:** 2026-05-06T22:05:56+02:00
- **Completed:** 2026-05-06T22:06:10+02:00
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Added `monthly` to the shared timeslicing granularity union.
- Exposed a Monthly option in the binning UI.
- Added `case 'monthly'` to the binning engine with calendar-month grouping.
- Locked the vocabulary with a source-inspection test.

## Task Commits

1. **Task 1: Normalize monthly binning contracts** - `cd6e38c` (fix)

## Files Created/Modified
- `src/store/useTimeslicingModeStore.ts` - adds monthly to shared granularity.
- `src/components/binning/BinningControls.tsx` - exposes Monthly in the generation UI.
- `src/lib/binning/rules.ts` - adds monthly strategy and preset.
- `src/lib/binning/engine.ts` - groups crime events into calendar-month bins.
- `src/lib/binning/monthly-contract.phase1.test.ts` - source contract regression test.

## Decisions Made
- Kept monthly in the shared contract instead of defining a one-off UI-only option.
- Used calendar boundaries so monthly slices line up with analyst expectations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm vitest` via Corepack failed with a signature/key mismatch; verification was run successfully with the local `./node_modules/.bin/vitest` binary instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The cube can now rely on monthly-aware generation vocabulary.
- Next work can wire the cube to the demo stores and render the slice planes in-scene.

---
*Phase: 01-foundation-store-sync-slice-planes*
*Completed: 2026-05-06*
