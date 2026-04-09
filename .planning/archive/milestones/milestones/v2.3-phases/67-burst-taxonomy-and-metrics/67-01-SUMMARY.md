---
phase: 67-burst-taxonomy-and-metrics
plan: 01
subsystem: testing
tags: [burst-taxonomy, adaptive-diagnostics, deterministic-classification, vitest, typescript]

# Dependency graph
requires:
  - phase: 66-full-integration-testing
    provides: blocker-journey hardening context and validation expectations for the taxonomy phase
provides:
  - deterministic burst taxonomy core helpers
  - adaptive diagnostics annotated with burst class, confidence, provenance, and tie-break metadata
  - regression coverage for prolonged peaks, isolated spikes, valleys, neutral windows, and threshold ties
affects: [67-02, burst-review-ui, timeline-indicators, future-analysis-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [deterministic neighborhood-based classification, legacy compatibility bridge, metadata-rich diagnostics rows]

key-files:
  created: [src/lib/binning/burst-taxonomy.ts]
  modified: [src/lib/binning/types.ts, src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts, src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.test.ts]

key-decisions:
  - "Use global thresholds for the base burst cutoffs and local neighborhood rules only for ties and ambiguous edge cases."
  - "Keep the legacy burst-pattern signal as a compatibility bridge instead of replacing it with semantic labels."
  - "Expose burst taxonomy metadata on adaptive diagnostics rows so later UI work can read a stable contract."

patterns-established:
  - "Pattern 1: deterministic classifier input -> class/confidence/rationale output"
  - "Pattern 2: diagnostic rows carry both semantic taxonomy and legacy burst-pattern metadata"

# Metrics
duration: 40m
completed: 2026-04-08
---

# Phase 67: Burst Taxonomy and Metrics Summary

**Deterministic burst taxonomy helpers with adaptive diagnostics metadata and legacy burst-pattern compatibility**

## Performance

- **Duration:** 40 min
- **Started:** 2026-04-08T08:05:00Z
- **Completed:** 2026-04-08T08:45:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added a reusable burst taxonomy helper with stable labels, scores, confidence, provenance, and tie-break reasoning.
- Extended adaptive diagnostics so each row now carries the semantic taxonomy contract alongside the legacy burst-pattern bridge.
- Locked the taxonomy behavior with regression tests for sustained peaks, isolated spikes, valleys, and near-threshold ties.

## Task Commits

1. **Task 1: Add the deterministic burst taxonomy helper and shared types** - `b42aa0a` (feat)
2. **Task 2: Annotate adaptive diagnostics with taxonomy metadata and lock regressions** - `b42aa0a` (feat)

## Files Created/Modified
- `src/lib/binning/burst-taxonomy.ts` - deterministic burst classification helper
- `src/lib/binning/types.ts` - optional burst taxonomy fields on bins
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts` - taxonomy-enriched diagnostics rows
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.test.ts` - edge-case regression coverage

## Decisions Made
- Burst meaning should be derived from deterministic neighborhood rules, not a learned or random signal.
- The review workflow must preserve the existing burst-pattern label so older diagnostics remain interpretable.
- Confidence and provenance should travel with the taxonomy output from the core helper.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- One regression expectation needed human-readable wording (`isolated spike`) in the tie-break message, which was resolved by adjusting the helper text and rerunning tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Burst taxonomy is ready for UI exposure in Phase 67-02.
- The adaptive diagnostics contract now has stable metadata for later analysis and review surfaces.

---
*Phase: 67-burst-taxonomy-and-metrics*
*Completed: 2026-04-08*
