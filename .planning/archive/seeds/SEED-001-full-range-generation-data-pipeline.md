---
id: SEED-001
status: dormant
planted: 2026-03-29
planted_during: v3.0 / Phase 65 complete, preparing Phase 66
trigger_when: next milestone where generation accuracy over long windows is a priority
scope: Medium
---

# SEED-001: Full-range generation mode so timeslicing uses all events in selected range, not capped/sampled UI fetches

## Why This Matters

This improves effectiveness and analytical trust. Right now, long-window generation can run on a capped/sampled dataset, which can hide burst structure and produce bins that do not reflect the full population in-range.

## When to Surface

**Trigger:** next milestone where generation accuracy over long windows is a priority

This seed should be presented during `/gsd-new-milestone` when the milestone
scope matches any of these conditions:
- Accuracy and trust in generated bins are prioritized over quick sampled generation.
- The roadmap includes full-population analysis, chunked fetching, or server-side generation for timeslicing.

## Scope Estimate

**Medium** — likely one to two phases: add a dedicated full-range generation pipeline (separate from UI render fetch), track provenance, and verify performance and correctness.

## Breadcrumbs

Related code and decisions found in the current codebase:

- `.planning/STATE.md` (v3.0 context, current phase status, and decisions)
- `.planning/ROADMAP.md` (v3.0 phases; Phase 56 note on variable sampling API)
- `src/app/timeslicing/page.tsx` (uses `useCrimeData` with `limit: 50000`)
- `src/hooks/useCrimeData.ts` (range fetch hook and query params)
- `src/app/api/crimes/range/route.ts` (`totalMatches`, `sampleStride`, `sampled` behavior)
- `src/components/binning/BinningControls.tsx` (`filteredEvents` generation input and metadata eventCount)
- `src/store/useBinningStore.ts` (constraints with `maxBins: 40` default)
- `src/lib/binning/engine.ts` (constraint-driven generation and post-process)
- `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` (sampled/full-population provenance patterns)

## Notes

Seed came from UI QA discussion where selected ranges (example: Jan 2001 to Oct 2005) showed generated bins using a smaller event subset than expected. Desired future state: generation can intentionally run on full in-range population (with progress/cancel and provenance) while keeping UI rendering responsive.
