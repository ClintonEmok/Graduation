# Phase 2: Workflow Isolation + Dashboard Handoff - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 isolates slice generation, review, and apply into dedicated full-screen screens. Generate and review are not part of the dashboard. Apply is a timeline-only full-screen preview where users can edit bins in place, keep warnings visible, and then auto-advance directly to the final dashboard. The final dashboard opens map-first in one shared main viewport that swaps between the 2D map and 3D cube, with a fixed always-visible right STKDE rail and applied state carried forward only.

</domain>

<decisions>
## Implementation Decisions

### Workflow isolation
- **D-01:** Generate, review, and apply are separate full-screen steps.
- **D-02:** Each step gets its own chrome; the dashboard stays hidden until after Apply.

### Apply preview
- **D-03:** Apply-preview is timeline-only, not dashboard-lite.
- **D-04:** Users can split, merge, and delete bins directly in apply-preview.
- **D-05:** Review warnings stay visible in apply-preview.

### Shared viewport
- **D-06:** The final dashboard uses one shared main viewport that swaps between the 2D map and 3D cube.
- **D-07:** The 3D state is presented as an empty framed slot when reserved.
- **D-08:** The shared viewport opens map-first after the handoff.

### Dashboard handoff and rail
- **D-09:** Clicking Apply auto-advances directly to the dashboard.
- **D-10:** There is no extra confirmation or summary screen between apply-preview and the dashboard.
- **D-11:** The final dashboard carries only the applied state forward.
- **D-12:** STKDE is a fixed, always-visible right rail on the final dashboard only, and it stays separate from other analysis content.

### Heatmap enablement
- **D-13:** The generic 2D density heatmap is enabled from the final dashboard map-layer controls.
- **D-14:** The STKDE heatmap is enabled from the STKDE rail after running STKDE, and the active hotspot selection keeps that overlay focused.
- **D-15:** These heatmap controls do not appear in generate/review/apply screens.

### the agent's Discretion
- Workflow chrome uses a compact full-screen wizard shell with a top stepper and linear next/back navigation; the review screen leads with warnings.
- The map/cube swap control lives in the viewport chrome as an icon toggle; swaps are manual only and preserve the current selection plus active time window.
- The final dashboard timeline is a collapsible bottom rail that stays editable and shows the applied-state timeline rather than draft/applied comparison cues.
- The STKDE rail starts as hotspots on a map; selecting a hotspot updates both the active time window and spatial focus, keeps the hotspot selection persistent across swaps, and uses the rail selection itself as the primary focus action.
- Exact spacing, typography, motion timing, and label copy remain agent discretion beyond those decisions.

</decisions>

<specifics>
## Specific Ideas

- "each step should be isolated"
- "generate slices shouldn't should be part of the actual dashboard"
- "the actual dashboard only needs to have the map, a target for 3D, and the timeline"
- "STKDE has to be kinda like a side panel"
- "When they click apply, it shows what it would look like on the timeline. They can split, they can do all this stuff"
- "after that we actually show the dashboard"
- "flow is way more useful, and we can better test for the conceptual tasks"
- "hotspots on a map"

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — overall product framing, isolated workflow direction, and dashboard simplification goal
- `.planning/REQUIREMENTS.md` — v1 requirement set once the new phase is inserted
- `.planning/ROADMAP.md` — phase ordering and success criteria once renumbered
- `.planning/STATE.md` — current focus and session continuity

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — app route and component layout
- `.planning/codebase/STACK.md` — current framework and dependency stack
- `.planning/codebase/CONCERNS.md` — known dashboard and state-sync fragility
- `.planning/codebase/INTEGRATIONS.md` — data routes, STKDE, and no-auth constraints
- `.planning/codebase/CONVENTIONS.md` — store, component, and layout patterns

### Workflow Surfaces
- `src/app/timeslicing/page.tsx` — generation/review/apply flow, timeline preview, slice editing
- `src/app/timeslicing/components/SuggestionPanel.tsx` — suggestions, comparisons, accept/review UI
- `src/app/dashboard-v2/page.tsx` — existing workflow rail and right-side analysis panel pattern
- `src/app/dashboard/page.tsx` — current dashboard shell to be simplified
- `src/components/timeline/DualTimeline.tsx` — timeline windowing and brush/preview interactions
- `src/components/map/MapVisualization.tsx` — primary shared viewport, map overlays, and selection model
- `src/components/viz/CubeVisualization.tsx` — 3D viewport behavior to be toggled with the map
- `src/components/viz/ContextualSlicePanel.tsx` — side-panel pattern for inspection and analysis
- `src/store/useCoordinationStore.ts` — shared workflow/sync state
- `src/store/useBinningStore.ts` — bin editing and review state
- `src/store/useTimeslicingModeStore.ts` — generation/apply workflow state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SuggestionPanel` and `ComparisonView`: already model generate/review/compare/accept flows.
- `BinningControls`: already provide split/merge/delete editing affordances.
- `DualTimeline`: already handles preview/windowing and shared range updates.
- `MapVisualization` and `CubeVisualization`: already provide the two main viewport modes.
- `DashboardStkdePanel` and `ContextualSlicePanel`: fixed right-rail inspection patterns.
- `useCoordinationStore`, `useBinningStore`, `useTimeslicingModeStore`: existing state spine for workflow and handoff.

### Established Patterns
- Full-screen route pages already isolate major tools like timeslicing.
- The dashboard shell is already modular and feature-composed.
- The coordination store is the shared truth for selection and range state.
- Right-rail analysis panels are already a codebase pattern, not a new invention.

### Integration Points
- `src/app/timeslicing/page.tsx` becomes the isolated generate/review/apply workflow.
- `src/app/dashboard/page.tsx` becomes the simplified post-apply dashboard.
- `src/components/map/MapVisualization.tsx` and `src/components/viz/CubeVisualization.tsx` share the main viewport toggle.
- `src/components/timeline/DualTimeline.tsx` remains the always-visible time rail.
- The STKDE panel attaches as a fixed right rail in the final dashboard.
- `src/store/useCoordinationStore.ts` carries selected/applied state across the handoff.

</code_context>

<deferred>
## Deferred Ideas

- Trace trajectories and compare behaviors stay in the later phase after this workflow isolation phase.
- Detect events, decode bursts, and the non-uniform scaling work stay later.
- Trust/provenance/loading hardening and other support overlays stay in the support phase.
- `SHAR-01` remains deferred to v2.

</deferred>

---

*Phase: 2 - Workflow Isolation + Dashboard Handoff*
*Context gathered: 2026-04-09*
