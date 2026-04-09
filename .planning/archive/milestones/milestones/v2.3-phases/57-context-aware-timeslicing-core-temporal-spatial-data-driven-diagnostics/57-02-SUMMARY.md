---
phase: 57-context-aware-timeslicing-core-temporal-spatial-data-driven-diagnostics
plan: 02
subsystem: diagnostics
tags: [timeslicing, suggestion-metadata, diagnostics, zustand, vitest]

# Dependency graph
requires:
  - phase: 57-01
    provides: deterministic temporal/spatial diagnostics engine and profile comparison contracts
provides:
  - Suggestion metadata now persists dynamic profile diagnostics with explicit strong/weak/no-strong semantics
  - Backward-compatible profileName remains available for existing suggestion consumers
  - Regression coverage locks diagnostics metadata persistence and ranking-order parity
affects: [57-03 diagnostics UI, suggestion history auditing, QA explainability]

# Tech tracking
tech-stack:
  added: []
  patterns: [diagnostics computed once per generation run, additive metadata extension with backward compatibility, diagnostics-only ranking parity tests]

key-files:
  created:
    - src/hooks/useSuggestionGenerator.test.ts
  modified:
    - src/store/useSuggestionStore.ts
    - src/hooks/useSuggestionGenerator.ts

key-decisions:
  - "Keep `profileName` mapped to dynamic profile label for backward compatibility while adding nested diagnostics payload for richer auditing."
  - "Keep full-auto ranking inputs unchanged (`profileName` to orchestrator remains static profile) so diagnostics wiring is metadata-only and non-influential to ordering."

patterns-established:
  - "Pattern: Suggestion metadata carries explicit `sections.temporal/spatial.status` keys with missing notices instead of omitting unavailable diagnostics."
  - "Pattern: Compare baseline vs diagnostics-enabled full-auto outputs by ordered set id + score to lock non-influential diagnostics behavior."

requirements-completed: []

# Metrics
duration: 5 min
completed: 2026-03-17
---

# Phase 57 Plan 2: Suggestion Diagnostics Metadata Integration Summary

**Suggestion generation now persists dynamic context diagnostics (profile label, signal state, comparison reason, and section availability notices) into store/history metadata without changing ranking behavior for identical inputs.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T09:41:39Z
- **Completed:** 2026-03-17T09:46:01Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended `SuggestionContextMetadata` with auditable diagnostics payload covering dynamic/static comparison and weak/no-strong semantics.
- Wired diagnostics computation into `useSuggestionGenerator` once per run and propagated metadata to both full-auto and manual suggestion paths.
- Added focused regressions for metadata persistence, partial missing-section semantics, and ranking-order parity.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend suggestion metadata contract for diagnostics audit fields** - `071678b` (feat)
2. **Task 2: Integrate diagnostics computation into suggestion generation flow** - `aa50404` (feat)
3. **Task 3: Add pipeline regressions for metadata persistence and fallback semantics** - `10f0217` (test)

## Files Created/Modified
- `src/store/useSuggestionStore.ts` - Extended suggestion context contract with `contextDiagnostics` and preserved metadata through history/reapply paths.
- `src/hooks/useSuggestionGenerator.ts` - Added diagnostics build + metadata mapping helpers and integrated metadata assignment for generated suggestions.
- `src/hooks/useSuggestionGenerator.test.ts` - Added regressions for backward-compatible profileName mapping, weak/no-strong semantics, partial section notices, and ranking parity.

## Decisions Made
- Preserved orchestrator ranking contract by keeping static profile input for scoring while storing dynamic diagnostics strictly as metadata.
- Introduced dedicated metadata-builder helpers so diagnostics mapping logic is testable without hook runtime setup.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial weak-signal test fixture produced a strong state; adjusted fixture to represent missing spatial evidence so weak-signal semantics are asserted correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Diagnostics metadata persistence and parity constraints are now locked for suggestion runs and history auditing.
- Ready for **57-03** diagnostics UI surfacing.

---
*Phase: 57-context-aware-timeslicing-core-temporal-spatial-data-driven-diagnostics*
*Completed: 2026-03-17*
