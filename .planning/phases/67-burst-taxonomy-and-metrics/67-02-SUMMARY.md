---
phase: 67-burst-taxonomy-and-metrics
plan: 02
subsystem: ui
tags: [burst-taxonomy, dashboard-v2, timeline, react, vitest]

# Dependency graph
requires:
  - phase: 67-burst-taxonomy-and-metrics
    provides: deterministic burst taxonomy metadata and diagnostics contract from plan 67-01
provides:
  - taxonomy chips in generation controls
  - burst class/confidence/rationale/provenance in burst review details
  - timeline summary indicators and route-level regression coverage for taxonomy wiring
affects: [68-01, dashboard-v2, timeline-review, burst-details]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared taxonomy vocabulary, visible metadata chips, source-based route contract tests]

key-files:
  created: []
  modified: [src/components/binning/BinningControls.tsx, src/components/timeline/DualTimeline.tsx, src/components/viz/BurstList.tsx, src/components/viz/BurstDetails.tsx, src/app/timeslicing-algos/page.timeline-algos.test.ts]

key-decisions:
  - "Expose the taxonomy in-place where analysts already compare burst windows instead of introducing a new surface."
  - "Keep existing burst selection and focus behavior unchanged while adding visible class, confidence, rationale, and provenance copy."
  - "Use a source-based route test to keep the vocabulary and wiring strings stable."

patterns-established:
  - "Pattern 1: review surfaces show class/confidence/rationale chips alongside operational stats"
  - "Pattern 2: timeline and generation controls share the same burst taxonomy vocabulary"

# Metrics
duration: 30m
completed: 2026-04-08
---

# Phase 67: Burst Taxonomy and Metrics Summary

**Burst review surfaces now explain class, confidence, rationale, and provenance inline across the timeline and burst details UI**

## Performance

- **Duration:** 30 min
- **Started:** 2026-04-08T08:45:00Z
- **Completed:** 2026-04-08T09:01:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added taxonomy chips to the binning controls so the generation workflow advertises the label vocabulary.
- Threaded burst taxonomy labels into the burst list, burst detail panel, and timeline summary indicators.
- Expanded the route-intent regression test so source checks fail if the taxonomy vocabulary or wiring disappears.

## Task Commits

1. **Task 1: Thread taxonomy labels into burst list and timeline indicators** - `2741d45` (feat)
2. **Task 2: Show burst class, confidence, and rationale in the detail panel and lock the route contract** - `2741d45` (feat)

## Files Created/Modified
- `src/components/binning/BinningControls.tsx` - taxonomy legend chips near generation controls
- `src/components/timeline/DualTimeline.tsx` - burst taxonomy summary badges in the timeline area
- `src/components/viz/BurstList.tsx` - burst class/confidence/rationale chips in each burst card
- `src/components/viz/BurstDetails.tsx` - selected-window taxonomy metadata and provenance display
- `src/app/timeslicing-algos/page.timeline-algos.test.ts` - source-based route contract assertions

## Decisions Made
- The taxonomy should be visible inline in existing review and timeline workflows rather than hidden in a separate diagnostics-only panel.
- The timeline needs a compact burst indicator summary so the vocabulary is visible without changing selection behavior.
- Route intent coverage should verify specific strings, keeping the contract stable for future refactors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- No blocking issues; the new UI copy and route assertions passed after the taxonomy helper from plan 67-01 landed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 67 now has both the semantic taxonomy core and the visible UI contract needed for later burst-analysis work.
- Phase 68 can build on the shared vocabulary without redefining burst labels.

---
*Phase: 67-burst-taxonomy-and-metrics*
*Completed: 2026-04-08*
