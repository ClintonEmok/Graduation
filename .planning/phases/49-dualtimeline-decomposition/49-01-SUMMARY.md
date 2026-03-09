---
phase: 49-dualtimeline-decomposition
plan: 01
subsystem: ui
tags: [timeline, dualtimeline, hooks, react, vitest]

# Dependency graph
requires:
  - phase: 46-guardrails-and-baselines
    provides: Interaction guardrails and parity testing patterns used by timeline refactors
provides:
  - Dedicated transform-domain hook for adaptive and linear timeline scale conversion
  - Dedicated density-strip derivation hook with recompute-versus-fallback parity behavior
  - DualTimeline rewired to consume extracted hooks while preserving orchestration behavior
affects: [49-02, 49-03, timeline decomposition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Extract pure timeline derivation domains into focused hooks before interaction extraction
    - Preserve parity with deterministic hook-level tests during refactors

key-files:
  created:
    - src/components/timeline/hooks/useScaleTransforms.ts
    - src/components/timeline/hooks/useScaleTransforms.test.ts
    - src/components/timeline/hooks/useDensityStripDerivation.ts
    - src/components/timeline/hooks/useDensityStripDerivation.test.ts
  modified:
    - src/components/timeline/DualTimeline.tsx

key-decisions:
  - "Reuse the same detail-density threshold constant from the extracted hook to keep render-mode parity."
  - "Keep DualTimeline interaction flow unchanged and limit this plan to structural extraction only."

patterns-established:
  - "Domain-to-display and display-to-domain scale transforms live in useScaleTransforms."
  - "Detail density strip derivation and fallback slicing live in useDensityStripDerivation."

# Metrics
duration: 10 min
completed: 2026-03-09
---

# Phase 49 Plan 01: DualTimeline Transform and Density Hook Extraction Summary

**DualTimeline now delegates adaptive scale transforms and detail density-strip derivation to dedicated hooks with deterministic parity tests.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-09T15:32:35Z
- **Completed:** 2026-03-09T15:42:35Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extracted adaptive/linear transform logic into `useScaleTransforms` with deterministic warp and non-warp coverage.
- Extracted detail density derivation into `useDensityStripDerivation` with threshold-based recompute and density-map fallback parity.
- Rewired `DualTimeline.tsx` to use both hooks while keeping brush/zoom/scrub/selection orchestration behavior intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract adaptive/linear transform logic into useScaleTransforms hook** - `deb617e` (feat)
2. **Task 2: Extract density-strip derivation into useDensityStripDerivation hook** - `83bffec` (feat)
3. **Task 3: Rewire DualTimeline orchestration to consume transform and density hooks** - `f9b720a` (feat)

## Files Created/Modified
- `src/components/timeline/hooks/useScaleTransforms.ts` - Extracted transform-domain adaptive/linear scale conversion logic.
- `src/components/timeline/hooks/useScaleTransforms.test.ts` - Deterministic transform parity tests.
- `src/components/timeline/hooks/useDensityStripDerivation.ts` - Extracted detail-density derivation and fallback behavior.
- `src/components/timeline/hooks/useDensityStripDerivation.test.ts` - Deterministic derivation branch-coverage tests.
- `src/components/timeline/DualTimeline.tsx` - Rewired orchestrator to consume extracted hooks.

## Decisions Made
- Use hook-owned `DETAIL_DENSITY_RECOMPUTE_MAX_DAYS` in DualTimeline render-mode resolution to avoid threshold drift.
- Keep this plan scoped to extraction and wiring; no behavior changes to brush/zoom or point-selection interactions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `49-02-PLAN.md` and `49-03-PLAN.md` decomposition follow-ups.
- No blockers identified for continuing phase 49.

---
*Phase: 49-dualtimeline-decomposition*
*Completed: 2026-03-09*
