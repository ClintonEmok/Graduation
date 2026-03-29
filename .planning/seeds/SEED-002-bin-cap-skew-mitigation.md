---
id: SEED-002
status: dormant
planted: 2026-03-29
planted_during: v3.0 / Phase 65 complete, preparing Phase 66
trigger_when: next milestone that touches timeslicing quality hardening or generation correctness
scope: Medium
---

# SEED-002: Fix long-range bin-cap skew by replacing global merge with adjacent time-aware merging, adaptive caps, and cap-hit quality warnings

## Why This Matters

This makes generated bins useful instead of useless for burst analysis. Current long-range runs can collapse many periods into one oversized bin and leave the rest tiny, which distorts investigative interpretation.

## When to Surface

**Trigger:** next milestone that touches timeslicing quality hardening or generation correctness

This seed should be presented during `/gsd-new-milestone` when the milestone
scope matches any of these conditions:
- The team is improving long-window bin quality, burst analysis fidelity, or binning robustness.
- The roadmap includes work on `maxBins`, post-processing, warning/provenance UX, or adaptive bin-cap policy.

## Scope Estimate

**Medium** — likely one to two phases for algorithm fixes (time-local merge strategy + safer cap handling), UX feedback when cap is hit, and regression tests for skew cases.

## Breadcrumbs

Related code and decisions found in the current codebase:

- `.planning/STATE.md` (current milestone context and quality/hardening focus)
- `.planning/ROADMAP.md` (Phase 66 hardening/validation scope)
- `src/store/useBinningStore.ts` (default constraints including `maxBins: 40`)
- `src/lib/binning/engine.ts` (`generateIntervalBins`, `postProcessBins`, hard cap path)
- `src/lib/binning/rules.ts` (`mergeSmallBins` implementation and constraint validation)
- `src/components/binning/BinningControls.tsx` (generation flow, warnings, and metadata)
- `src/app/timeslicing/page.tsx` (timeslicing route where QA behavior surfaced)
- `.planning/seeds/SEED-001-full-range-generation-data-pipeline.md` (complementary seed for full-range generation data)

## Notes

Seed created from live QA where a long range (Jan 2001 to Dec 2024) produced one first bin with ~31k events and many bins under 40, while cap-hit behavior lacked a clear user-facing warning. Desired future state: preserve temporal shape under caps, surface truncation/condensation provenance clearly, and keep burst analysis trustworthy.
