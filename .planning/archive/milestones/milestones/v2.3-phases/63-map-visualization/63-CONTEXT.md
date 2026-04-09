# Phase 63: Manual Refinement and Adaptive Burst Emphasis - Context

**Gathered:** 2026-03-26
**Status:** Replanned for unified dashboard-v2 execution

<domain>
## Phase Boundary

Phase 63 is the first phase where v3.0 should feel unified to the user. Phase 62 established the generate -> review -> apply workflow and the shared slice-state foundation, but it landed in `/timeslicing` as a stepping stone.

Phase 63 should move the user-facing experience into `dashboard-v2`, where users can inspect applied slices, start refining them manually, and investigate spatial context from the same surface. This phase is not yet the full synchronization/hardening phase, but it must make the product feel like one route instead of several disconnected experiments.

</domain>

<decisions>
## Implementation Decisions

### Route Direction
- **D-01:** `dashboard-v2` is the main Phase 63 route and the intended home for the rest of v3.0.
- **D-02:** `/timeslicing` can remain as transitional foundation work, but Phase 63 should not deepen reliance on it as the primary experience.

### Workflow Shape
- **D-03:** Manual refinement happens after generation/apply, not instead of it.
- **D-04:** The user should be able to see applied slices and continue investigating without route switching.
- **D-05:** Refinement UX can start with modest capabilities, as long as it clearly extends the Phase 62 workflow.

### Investigation Surface
- **D-06:** The map in dashboard-v2 should gain enough context to support investigation: OSM base, POIs, and district boundaries.
- **D-07:** Layer visibility must be user-controllable from within dashboard-v2.
- **D-08:** Timeline and map should be readable together even if Phase 64 completes deeper synchronization later.

### Burst Emphasis
- **D-09:** Burst-heavy periods should be easier to notice and inspect in the refinement flow.
- **D-10:** Adaptive emphasis may start visually in Phase 63, while deeper synchronized behavior can expand in Phase 64.

### Claude's Discretion
- Exact layout split between map, timeline, and control panels in dashboard-v2
- Specific manual refinement affordances introduced in this phase
- How much Phase 62 UI is reused directly vs re-composed for dashboard-v2
- Styling and emphasis for burst-heavy intervals

</decisions>

<specifics>
## Specific Ideas

- Users should feel they are continuing the same workflow they began in generation, not entering a separate map tool.
- dashboard-v2 should make it obvious what slices are active and what the user can refine next.
- Geographic context layers should help interpret crime patterns, not overwhelm the workflow.
- This phase should bias toward a credible integrated experience over perfect completeness.

</specifics>

<canonical_refs>
## Canonical References

### Route and Workflow
- `src/app/dashboard-v2/page.tsx` - primary Phase 63 integration surface
- `src/app/timeslicing/page.tsx` - Phase 62 foundation route to draw from, not extend as the long-term home
- `src/components/binning/BinningControls.tsx` - generation controls from Phase 62
- `src/app/timeslicing/components/SuggestionToolbar.tsx` - review/apply workflow patterns
- `src/components/timeline/DualTimeline.tsx` - slice review and refinement timeline surface

### Map Surfaces
- `src/components/map/MapBase.tsx`
- `src/components/map/MapVisualization.tsx`
- `src/components/map/MapPoiLayer.tsx`
- `src/components/map/MapDistrictLayer.tsx`
- `src/components/map/MapLayerManager.tsx`

### Phase Context
- `.planning/phases/62-user-driven-timeslicing-manual-mode/62-01-SUMMARY.md` - completed generation/review/apply foundation
- `.planning/ROADMAP.md` - v3.0 unified-route phase framing
- `.planning/REQUIREMENTS.md` - `MAN-01` through `MAN-05`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 62 already established the split between pending generated bins and applied slices.
- DualTimeline already supports distinct visual treatment for generated and applied slice states.
- Existing map components provide a base for adding richer investigation context.

### Integration Points
- dashboard-v2 should become the place where applied slice state is consumed most visibly.
- Manual refinement can initially be layered onto existing timeline behavior instead of inventing a totally separate editing model.
- Map layer management should be colocated with the refinement/investigation workflow.

</code_context>

<deferred>
## Deferred Ideas

- Full deep synchronization and workflow-state unification across every panel - Phase 64
- STKDE integration into the same route - Phase 65
- Final migration cleanup and evaluation hardening - Phase 66

</deferred>

---

*Phase: 63-map-visualization*
*Context replanned: 2026-03-26*
