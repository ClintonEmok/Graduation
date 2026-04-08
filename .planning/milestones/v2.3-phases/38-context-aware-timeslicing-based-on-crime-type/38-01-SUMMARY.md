---
phase: 38-context-aware-timeslicing-based-on-crime-type
plan: "01"
subsystem: ui
tags: [timeslicing, context-aware, zustand, react-hooks]

# Dependency graph
requires:
  - phase: 37-algorithm-integration
    provides: Suggestion generation toolbar and hook pipeline used as integration surface
provides:
  - Context extraction hook for visible vs selected-range analysis
  - Smart profile detection for burglary, violent crime, and all-crimes contexts
  - Toolbar analysis scope toggle wired into generation trigger params
affects: [phase-38-plan-02, phase-38-plan-03, context-metadata-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [fine-grained selector composition, deterministic context signatures, memoized smart-profile matching]

key-files:
  created:
    - src/hooks/useContextExtractor.ts
    - src/hooks/useSmartProfiles.ts
  modified:
    - src/app/timeslicing/components/SuggestionToolbar.tsx

key-decisions:
  - "Use viewport string filters as primary context values, with ID-based fallback tokens to avoid empty context drift."
  - "Pass analysis scope mode through toolbar trigger payload now so later generator plans can consume it without UI rework."

patterns-established:
  - "Context signature pattern: sorted filters + normalized time range + mode in a stable pipe-delimited key"
  - "Scope toggle pattern: local toolbar state with explicit visible/all labels and tooltip guidance"

# Metrics
duration: 3 min
completed: 2026-02-28
---

# Phase 38 Plan 01: Context Extraction Foundation Summary

**Context extraction and smart profile scaffolding now drives a visible-vs-all analysis mode path from active filters into suggestion generation triggers.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T01:32:38Z
- **Completed:** 2026-02-28T01:35:45Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added `useContextExtractor` with exported `FilterContext`, `getCurrentContext`, and deterministic `getContextSignature` utilities.
- Added `useSmartProfiles` with memoized matching for all-crimes, burglary-only, and violent-crime-only contexts.
- Added an `Analyze Visible` / `Analyze All` scope toggle in `SuggestionToolbar` and passed selected mode into `trigger` params.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useContextExtractor hook** - `33969d3` (feat)
2. **Task 2: Create useSmartProfiles hook** - `390feb6` (feat)
3. **Task 3: Add mode toggle to SuggestionToolbar** - `b5e160e` (feat)

**Plan metadata:** Pending metadata commit for SUMMARY/STATE updates.

## Files Created/Modified
- `src/hooks/useContextExtractor.ts` - Builds context from filter + viewport selectors and exports signature helpers.
- `src/hooks/useSmartProfiles.ts` - Maps context combinations to predefined smart profiles.
- `src/app/timeslicing/components/SuggestionToolbar.tsx` - Adds analysis scope toggle and forwards scope mode on generate.

## Decisions Made
- Used viewport filter names as the canonical context source for profile detection while retaining fallback tokens from numeric filter IDs.
- Kept analysis scope state local to toolbar for this foundational plan, with runtime payload forwarding into generation trigger.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 01 foundation is complete and ready for context-aware generation integration in subsequent Phase 38 plans.
- No blockers identified.

---
*Phase: 38-context-aware-timeslicing-based-on-crime-type*
*Completed: 2026-02-28*
