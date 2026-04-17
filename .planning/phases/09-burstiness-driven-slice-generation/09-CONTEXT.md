# Phase 9: Burstiness-driven slice generation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn burst windows into draft slices so the demo can point users toward bursty periods without treating burst mode as a standalone map state. This phase keeps burst generation demo-local, reviewable before apply, and synchronized with the existing timeline/workflow surfaces.

</domain>

<decisions>
## Implementation Decisions

### Burst source
- **D-01:** Reuse the existing burst windows already available in the timeline path instead of recomputing burst detection inside the demo generation store.
- **D-02:** Keep generation limited to the currently selected active time range.
- **D-03:** If the active selection has no burst windows, fall back to the existing preset-bias generation path rather than returning an empty draft state.
- **D-04:** Trigger burst generation explicitly through a user action rather than auto-regenerating on every selection change.

### Burst styling
- **D-05:** Burst-generated slices should carry `isBurst` metadata when they are applied.
- **D-06:** Burst-derived slices should be named with burst-first labels such as `Burst 1` rather than generic slice names.
- **D-07:** Burst-derived slices should default to warp-enabled so the adaptive effect stays visible.
- **D-08:** Keep the burst visual cue subtle but clear in the timeline companion and rail.

### Draft slice shape
- **D-09:** Burst-generated drafts should appear in both the workflow skeleton and the slice companion/timeline before apply.
- **D-10:** Draft bins should remain editable with merge, split, and delete controls before apply.
- **D-11:** Apply should replace the current slice set with the burst-derived slices.
- **D-12:** The timeline should preview burst drafts before apply instead of hiding them until commit.

### Map relationship
- **D-13:** The map should stay strictly synced to the selected burst-derived time window and should not expose a separate burst focus control.
- **D-14:** The map should keep its current density/heatmap language as the primary emphasis.
- **D-15:** Selecting a burst on the timeline should keep the map data time-filtered without moving the viewport.
- **D-16:** Burst cues should stay in the timeline and workflow surfaces only; the map should not keep a visible burst indicator.

### the agent's Discretion
- Exact burst-to-slice conversion math inside the existing generation path.
- Whether burst draft bins reuse the same note text as generic generated bins or get a burst-specific note string.
- Fine-grained wording for the generate/apply copy in the demo rail.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — Phase 9 boundary, goal, and dependency order after the inserted burstiness phase.
- `.planning/REQUIREMENTS.md` — `FLOW-01` through `FLOW-06` and the burst/decode requirements that frame the phase.
- `.planning/STATE.md` — Current milestone state and roadmap evolution note.

### Prior phase context
- `.planning/phases/08-contextual-data-enrichment/08-CONTEXT.md` — demo-local context layering and phase ordering.
- `.planning/phases/07-dashboard-demo-preset-thresholds/07-CONTEXT.md` — demo-local generation controls and preset vocabulary.
- `.planning/phases/06-demo-timeline-polish/06-CONTEXT.md` — demo timeline presentation and slice-authored warp styling.
- `.planning/phases/05-stats-stkde-interaction/05-CONTEXT.md` — demo-local isolation patterns and compact analysis surface rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — already owns demo-local generation state, `pendingGeneratedBins`, and apply flow hooks.
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` — already exposes generate/apply/clear controls for draft bins.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — already shows draft bin counts, burst badges, and rail-based generation controls.
- `src/components/timeline/DemoDualTimeline.tsx` — already renders pending generated bins as a preview layer.
- `src/store/slice-domain/createSliceCoreSlice.ts` — already supports burst slices, slice replacement from bins, and burst-aware sorting.
- `src/components/dashboard-demo/lib/demo-warp-map.ts` — existing demo-local warp helper for burst-adjacent slice presentation.

### Established Patterns
- Demo-local state is preferred when the feature is specific to `/dashboard-demo`.
- The demo workflow already uses review-before-apply semantics for generated bins.
- Stable route behavior is protected by source-inspection tests rather than shared mutable UI state.
- Burst cues belong in the timeline/slice surfaces, not as a competing map mode.

### Integration Points
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — generation trigger, draft state, metadata, and fallback behavior.
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` — explicit generate and apply entry points.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — burst labels, draft counts, and slice editing surface.
- `src/components/timeline/DemoDualTimeline.tsx` — draft preview layer and burst styling in the timeline.
- `src/components/map/MapVisualization.tsx` and `src/components/dashboard-demo/DemoMapVisualization.tsx` — keep the map synced to the active window without a standalone burst mode.

</code_context>

<specifics>
## Specific Ideas

- Burstiness should drive slice generation and help point the user toward bursty periods.
- The map should not expose a standalone burst mode because it is not useful for this demo story.
- The map should remain a synced density view while the timeline/workflow surfaces carry the burst cues.
- The generation trigger should stay deliberate rather than auto-refreshing on every selection change.

</specifics>

<deferred>
## Deferred Ideas

- Any future automatic burst regeneration on selection change belongs to later refinement, not this phase.
- If the map ever needs burst-specific annotations again, that would be a separate design decision outside this phase.

</deferred>

---

*Phase: 09-burstiness-driven-slice-generation*
*Context gathered: 2026-04-13*
