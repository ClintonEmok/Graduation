# Phase 62: Constraint-Driven Generation and Review-to-Apply - Context

**Gathered:** 2026-03-26
**Status:** Replanned for execution

<domain>
## Phase Boundary

Phase 62 is the first user-facing implementation step of v3.0. Its job is to make generated bins the default entry point into timeslicing.

Users should be able to describe what they want with domain constraints such as crime type, neighbourhood, time window, and granularity. The system should generate candidate bins from those inputs, show them clearly on the timeline, explain what was generated, and provide one obvious apply step that updates the working slice set across the rest of the product.

This phase is not primarily about freeform manual drawing. Manual refinement comes after generation and is deferred to Phase 63. Phase 62 should establish the suggestion-first workflow that the rest of v3.0 builds on.

</domain>

<decisions>
## Implementation Decisions

### Workflow Shape
- **D-01:** Default workflow is `generate -> review -> apply`, not manual-first editing.
- **D-02:** Generated bins are the primary result shown to the user after entering constraints.
- **D-03:** Apply is the point where generated bins become the active slice set used by coordinated views.
- **D-04:** Manual editing is not blocked, but detailed refinement UX belongs to Phase 63.

### Input Contract
- **D-05:** Phase 62 must support these generation inputs in the first usable flow: crime type, neighbourhood, time window, and granularity.
- **D-06:** Granularity must include at least hourly and daily as first-class options.
- **D-07:** The generator should not be framed around a fixed number of bins.
- **D-08:** Existing strategy infrastructure from Phase 61 remains the execution core behind the new constraint-driven UI.

### Review and Apply UX
- **D-09:** Generated bins should be visible immediately in the timeline as reviewable candidates.
- **D-10:** Review UI should show enough metadata to explain why bins were generated and what constraints were used.
- **D-11:** Apply should update the approved slice set in shared state so later phases can synchronize timeline, map, heatmap, dashboard, and cube from the same source of truth.
- **D-12:** The workflow should clearly distinguish generated-but-not-applied results from the currently applied slice set.

### Burst Handling
- **D-13:** Even in Phase 62, generated output should already support burst-aware behavior rather than evenly forcing slices across time.
- **D-14:** Dense periods should be allowed to produce narrower or more focused bins when the selected strategy warrants it.

### Claude's Discretion
- Exact form layout for the generation panel
- Ranking/ordering presentation for generated candidates
- Copy for review state, apply state, and low-confidence notices
- Visual styling for draft vs applied slices

</decisions>

<specifics>
## Specific Ideas

- The user should feel like they are asking the system for slices, not hand-configuring a low-level bin count tool.
- Constraint inputs should read like investigation intent: what crime, where, what time window, what granularity.
- The review stage should reduce confusion by making the pending result obvious before apply.
- Apply should feel consequential and safe: it promotes generated bins into the active workflow state.

</specifics>

<canonical_refs>
## Canonical References

### Store Contracts
- `src/store/useBinningStore.ts` - Phase 61 generation engine, strategy selection, bin CRUD, history
- `src/store/useTimeslicingModeStore.ts` - existing timeslicing mode and preset state that may need workflow-state expansion
- `src/store/useSliceDomainStore.ts` - active slice-domain state that later phases will synchronize across views

### UI Components
- `src/components/binning/BinningControls.tsx` - current binning control surface from Phase 61
- `src/app/timeslicing/components/SuggestionToolbar.tsx` - existing suggestion/review interaction patterns
- `src/components/timeline/DualTimeline.tsx` - timeline surface where generated bins must be reviewable
- `src/app/timeslicing/page.tsx` - main integration surface for the v3.0 workflow

### Phase Context
- `.planning/phases/61-dynamic-binning-system/61-01-SUMMARY.md` - completed flexible binning engine and CRUD support
- `.planning/ROADMAP.md` - replanned v3.0 phase definitions
- `.planning/REQUIREMENTS.md` - `GEN-01` through `GEN-06`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 61 binning core** already supports strategy-driven generation, validation, and bin CRUD
- **BinningControls** likely provides a starting point for strategy and interval controls but needs to evolve from engine-centric controls to user-intent inputs
- **Suggestion toolbar patterns** already exist for review-style workflows and can inform draft/apply UI
- **DualTimeline** already has the visual surface needed to display generated slices before apply

### Integration Points
- Add a dedicated generation panel or upgrade existing controls to capture crime type, neighbourhood, time window, and granularity
- Add draft/generated result state separate from applied slice state
- Wire apply into the slice-domain source of truth so later phases can synchronize from it
- Keep generated results explainable enough for the user to trust what the system produced

</code_context>

<deferred>
## Deferred Ideas

- Rich manual boundary editing and handle-first UX - Phase 63
- Cross-view map/cube rendering of applied slices - Phase 64
- STKDE-informed generation feedback loops - Phase 65+
- Save/load full investigative workflows - future enhancement

</deferred>

---

*Phase: 62-user-driven-timeslicing-manual-mode*
*Context replanned: 2026-03-26*
