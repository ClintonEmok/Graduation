# Phase 67: Burst Taxonomy and Metrics - Context

**Gathered:** 2026-03-30
**Status:** Stub ready for planning

## Phase Boundary

Define and operationalize burst behavior classes inside temporal bins so users can distinguish prolonged peaks, isolated spikes, and valleys in a consistent way.

## Expectations

- Burst classification is explicit, not implicit.
- Classification remains explainable and deterministic.
- Metrics must be visible where users review slices.

## Candidate Outputs

- Burst labels per bin: `prolonged-peak`, `isolated-spike`, `valley`, `neutral`.
- Confidence/provenance metadata for each label.
- UI indicators in timeline and review surfaces.

## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `src/lib/binning/engine.ts`
- `src/components/binning/BinningControls.tsx`
- `src/components/timeline/DualTimeline.tsx`

---

*Phase: 67-burst-taxonomy-and-metrics*
*Context gathered: 2026-03-30*
