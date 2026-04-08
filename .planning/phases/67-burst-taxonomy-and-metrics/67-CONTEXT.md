# Phase 67: Burst Taxonomy and Metrics - Context

**Gathered:** 2026-03-30
**Last updated:** 2026-04-08
**Status:** Stub ready for planning

## Phase Boundary

Define and operationalize burst behavior classes inside temporal bins so users can distinguish prolonged peaks, isolated spikes, valleys, and neutral regions in a consistent, explainable, deterministic way.

## Why This Phase Exists

The app already detects burst-like structure, but that structure is still mostly expressed as generic density, burstiness, and burst window behavior. Phase 67 turns that into a first-class taxonomy so the review workflow can explain what kind of burst a window represents, not just that it is dense or unusual.

This is important because the current UI lets users adjust a burst cutoff and inspect burst windows, but it does not give them a stable label system for comparing windows across slices, time ranges, or review sessions.

## Current Implementation Snapshot

- `src/lib/queries.ts` computes `densityMap`, `countMap`, `burstinessMap`, and `warpMap` for adaptive views.
- `src/workers/adaptiveTime.worker.ts` mirrors the same adaptive map generation logic for client-side computation.
- `src/components/viz/BurstList.tsx` ranks burst windows using density or burstiness and lets users change the threshold.
- `src/components/viz/BurstDetails.tsx` shows burst composition, gaps, and top crime types for the selected windows.
- `src/store/useSliceStore.ts` auto-creates burst slices from detected burst windows and normalizes them into shared slice state.
- `src/components/timeline/DualTimeline.tsx` feeds `useBurstWindows()` into `useAutoBurstSlices()` so bursts influence the timeline workflow.
- `src/lib/binning/engine.ts` already has a `burstiness` strategy, but it still produces bins from burst heuristics rather than explicit semantic classes.
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts` already emits the legacy `burst-pattern` diagnostic label.

## Agreed Direction

- Use global thresholds for the base class cutoffs.
- Apply local neighborhood rules for tie-breaks, short runs, and ambiguous edge cases.
- Keep the result deterministic so the same input always yields the same class.
- Keep the result explainable so the UI can show why a label was chosen.
- Treat the classification as metadata layered on top of the existing burst workflow, not a replacement for it.

## Target Labels

- `prolonged-peak`: a sustained high run across multiple adjacent bins.
- `isolated-spike`: a brief high burst that is not supported by a longer neighborhood run.
- `valley`: a meaningful low-activity stretch that stands out relative to surrounding activity.
- `neutral`: a bin or window that is not clearly peak, spike, or valley.

## Metadata To Carry

- `burstClass`
- `burstRuleVersion`
- `burstScore`
- `burstConfidence`
- `burstProvenance`
- `tieBreakReason`
- `thresholdSource`
- `neighborhoodSummary`

## UI Surfaces

- `src/components/binning/BinningControls.tsx` should surface taxonomy labels and any generation-time legend or chip state.
- `src/components/timeline/DualTimeline.tsx` should carry the label information into timeline indicators and burst-slice propagation.
- `src/components/viz/BurstList.tsx` should show the class alongside the burst window ranking and cutoff controls.
- `src/components/viz/BurstDetails.tsx` should show the class, confidence, and rationale for the selected window.
- Hover and review surfaces should use the same label vocabulary so users do not see one taxonomy in the list and another in the timeline.

## Edge Cases

- Flat windows need a deterministic default, with neutral as the fallback unless neighborhood evidence justifies valley.
- Single-bin high windows should default to isolated-spike unless the adjacent bins extend the run.
- Threshold ties must be resolved the same way every time.
- Near-threshold ambiguity should use the neighborhood rule before falling back to neutral.
- Sparse windows should not invent stronger labels than the data supports.

## Compatibility Notes

- Preserve the current burst window pipeline and auto-slice behavior.
- Bridge the existing `burst-pattern` diagnostic into the new taxonomy instead of leaving it as a separate path.
- Reuse the confidence/provenance patterns in `src/lib/confidence-scoring.ts` where possible.
- Keep `dashboard-v2` as the main user-facing surface; this phase adds taxonomy inside the existing workflow.

## Non-Goals

- Do not replace the adaptive map computation stack.
- Do not introduce a separate route or a new milestone shell.
- Do not use non-deterministic or learned classification.
- Do not remove the existing density and burstiness metrics.

## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/lib/binning/types.ts`
- `src/lib/binning/engine.ts`
- `src/lib/binning/rules.ts`
- `src/lib/queries.ts`
- `src/lib/confidence-scoring.ts`
- `src/components/binning/BinningControls.tsx`
- `src/components/timeline/DualTimeline.tsx`
- `src/components/viz/BurstList.tsx`
- `src/components/viz/BurstDetails.tsx`
- `src/store/useCoordinationStore.ts`
- `src/store/useSliceStore.ts`
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`

## Success Criteria

- Same input yields the same burst class output.
- Peaks, spikes, valleys, and neutral regions are distinguishable in the UI.
- Confidence and provenance are visible where users review slices.
- Sparse, dense, and mixed windows are covered by regression tests.
- Existing burst workflows keep working after the taxonomy is added.

---

*Phase: 67-burst-taxonomy-and-metrics*
*Context updated: 2026-04-08*
