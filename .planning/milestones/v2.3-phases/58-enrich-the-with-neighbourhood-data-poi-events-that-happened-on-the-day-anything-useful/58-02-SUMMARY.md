---
phase: 58-enrich-the-with-neighbourhood-data-poi-events-that-happened-on-the-day-anything-useful
plan: 02
subsystem: api
tags: [nextjs, api-route, caching, neighbourhood, context-diagnostics]

# Dependency graph
requires:
  - phase: 58-enrich-the-with-neighbourhood-data-poi-events-that-happened-on-the-day-anything-useful
    provides: 58-01 neighbourhood lib foundation (OSM/Chicago clients, buildNeighbourhoodSummary)
affects:
  - [future phases that use context diagnostics with neighbourhood data]

provides:
  - Server-side /api/neighbourhood/poi route with 24-hour caching
  - Async buildContextDiagnostics with neighbourhood integration
  - SuggestionContextMetadata extended with neighbourhood section

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory cache with TTL for API rate limiting avoidance"
    - "Async context diagnostics with graceful degradation"

key-files:
  created:
    - src/app/api/neighbourhood/poi/route.ts
  modified:
    - src/lib/context-diagnostics/index.ts
    - src/store/useSuggestionStore.ts
    - src/hooks/useSuggestionGenerator.ts
    - src/lib/context-diagnostics/context-diagnostics.test.ts
    - src/hooks/useSuggestionGenerator.test.ts

key-decisions:
  - "Made buildContextDiagnostics async to support dynamic neighbourhood import - neighbourhood fetch is on-demand and non-blocking"
  - "Derived bounds from crime data with 10% padding for neighbourhood enrichment area"
  - "Graceful fallback to neighbourhood.status='missing' when bounds unavailable"

patterns-established:
  - "Dynamic import of neighbourhood module to avoid circular dependencies"
  - "On-demand neighbourhood enrichment with explicit missing status"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-20T15:11:30Z
---

# Phase 58 Plan 2: Neighbourhood API Route and Diagnostics Integration Summary

**Server-side /api/neighbourhood/poi route with 24h caching, async buildContextDiagnostics with neighbourhood integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T15:06:41Z
- **Completed:** 2026-03-20T15:11:30Z
- **Tasks:** 5/5
- **Files modified:** 5

## Accomplishments
- Created `/api/neighbourhood/poi` server-side route with 24-hour in-memory caching
- Made `buildContextDiagnostics` async to support dynamic neighbourhood fetching
- Integrated neighbourhood into context diagnostics with graceful degradation
- Extended `SuggestionContextMetadata` with neighbourhood section and summary
- Added `deriveBoundsFromCrimes` helper for geo bounds computation with padding

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/neighbourhood/poi server-side route** - `2c1facf` (feat)
2. **Tasks 2-4: Extend context diagnostics with neighbourhood integration** - `e62ba55` (feat)

**Plan metadata:** [metadata commit]

## Files Created/Modified
- `src/app/api/neighbourhood/poi/route.ts` - Server-side GET route with bounds params, 24h cache, neighbourhood summary builder
- `src/lib/context-diagnostics/index.ts` - Made async, added neighbourhood field to result type
- `src/store/useSuggestionStore.ts` - Extended SuggestionContextMetadata with neighbourhood section
- `src/hooks/useSuggestionGenerator.ts` - Added neighbourhoodSummary, deriveBoundsFromCrimes helper, async buildContextDiagnostics call
- `src/lib/context-diagnostics/context-diagnostics.test.ts` - Updated to async/await pattern
- `src/hooks/useSuggestionGenerator.test.ts` - Updated to async/await, neighbourhood-aware assertions

## Decisions Made

- **Async context diagnostics:** Made `buildContextDiagnostics` async to support on-demand neighbourhood fetching via dynamic import. This keeps the neighbourhood enrichment non-blocking while still integrating into the diagnostics pipeline.
- **Bounds derivation:** Derived geographic bounds from crime data with 10% padding to ensure neighbourhood enrichment covers the area surrounding crime hotspots, not just the exact crime locations.
- **Graceful degradation:** When bounds are unavailable (no geolocated crimes), neighbourhood status falls back to 'missing' with explicit notice. This ensures diagnostics still work when neighbourhood data can't be fetched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 58 Plan 3 ready to execute
- Client-side neighbourhood data fetching can now be implemented to call `/api/neighbourhood/poi`
- Context diagnostics pipeline fully wired with neighbourhood integration

---
*Phase: 58-enrich-the-with-neighbourhood-data-poi-events-that-happened-on-the-day-anything-useful*
*Completed: 2026-03-20*
