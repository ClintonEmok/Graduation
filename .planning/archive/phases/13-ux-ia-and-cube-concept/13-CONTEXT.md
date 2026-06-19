# Phase 13: UX / IA Redesign + Cube Concept - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the demo layout, relational cube behavior, and story-driven analysis flow so the product reads as a guided workflow for bursty spatiotemporal data rather than a generic visualization stack.

</domain>

<decisions>
## Implementation Decisions

### Demo layout
- **D-01:** The demo is timeline-first.
- **D-02:** Keep the current shared viewport pattern with a map/cube toggle rather than showing map and cube side by side.
- **D-03:** Keep the workflow in a left-anchored drawer/skeleton.
- **D-04:** Keep the analysis rail fixed on the right.
- **D-05:** Organize the desktop layout as top scope/mode controls, center-left timeline, center-right map+cube, and bottom/rail slices+explain.

### Cube behavior
- **D-06:** The cube defaults to relational cluster analysis, not raw density browsing.
- **D-07:** The cube should emphasize bursts and hotspots as grouped structures, with slices and relational summaries as first-class elements.
- **D-08:** Use linked highlights as the primary relational cue.
- **D-09:** Keep labels and annotations lightweight; reveal extra detail on hover or selection.
- **D-10:** Support density, relational, and comparison modes, but treat relational analysis as the core cube purpose.

### Workflow presentation
- **D-11:** Present the Orient / Find / Compare / Inspect / Explain / Apply flow as a guided stepper.
- **D-12:** Keep the workflow stages visible all the time.
- **D-13:** Make stage advancement manual, not automatic.
- **D-14:** Show a short recap at the end of each stage before moving on.

### Cross-view coupling
- **D-15:** The timeline is the source of truth for shared selection state.
- **D-16:** Linked views should update live during drag/brush interaction.
- **D-17:** Non-active views should stay visible and highlighted rather than hiding detail.
- **D-18:** Cross-view linkage should feel strong but quiet: obvious enough to read, not noisy.

### Data and performance rules
- **D-19:** Load metadata before heavy data.
- **D-20:** Use one canonical dataset across all linked views.
- **D-21:** Use summary arrays and precomputed bins for overview and clustering.
- **D-22:** Use viewport-only loading for detail inspection.
- **D-23:** Keep cube overlays aggregated and optional.
- **D-24:** Avoid duplicate fetches for the same selection or time window.
- **D-33:** Build the new architecture as a parallel set of new files instead of rewriting core files in place.
- **D-34:** Separate the system into canonical data, derived analysis, view models, and presentational UI.
- **D-35:** Keep old files as wrappers or compatibility layers until the new path proves parity.

### View roles
- **D-25:** Timeline answers when.
- **D-26:** Map answers where.
- **D-27:** Cube answers what relates to what.
- **D-28:** Slices answer which intervals are being proposed or edited.
- **D-29:** Explain answers why something is highlighted or suggested.

### Locked conceptual framing
- **D-30:** The cube is an aggregated relational view, not a raw record browser or novelty scatterplot.
- **D-31:** The map is the geographic detail view.
- **D-32:** The timeline is the primary control surface for temporal discovery.

### the agent's Discretion
- Exact spacing, typography, motion, and micro-interaction details.
- Exact iconography and copy polish within the locked IA.

</decisions>

<specifics>
## Specific Ideas

- User wants the cube to show relational structure, not a fourth categorical axis.
- User wants clusters to matter more than raw point clouds.
- User wants the demo to feel like a question-driven analysis workflow.
- User wants the timeline to remain the primary control surface, with map as where and cube as what relates to what.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research intent and product framing
- `Space_time_cube_V36.md` — original proposal, research questions, and adaptive temporal scaling intent.
- `.planning/PROJECT.md` — project vision, core tasks, constraints, and key decisions.
- `.planning/REQUIREMENTS.md` — requirement traceability, demo/layout requirements, cube/timeline support requirements.
- `.planning/ROADMAP.md` — fixed Phase 13 boundary, goal, and success criteria.

### Phase 13 design docs
- `.planning/phases/13-ux-ia-and-cube-concept/13-PLANNING.md` — phase goal, source context, and what Phase 13 must decide.
- `.planning/phases/13-ux-ia-and-cube-concept/13-UX-IA-STORIES.md` — user stories, IA, layout direction, cube behavior, and data/performance rules.
- `.planning/phases/13-ux-ia-and-cube-concept/13-CUBE-CONCEPT.md` — cube positioning, cube modes, relational cues, and cube vs map distinction.
- `.planning/phases/13-ux-ia-and-cube-concept/13-IA-TREE.md` — screen tree, navigation hierarchy, and question routing.
- `.planning/phases/13-ux-ia-and-cube-concept/13-MAP-CONCEPT.md` — map role, outputs, modes, and performance rules.
- `.planning/phases/13-ux-ia-and-cube-concept/13-TIMELINE-CONCEPT.md` — timeline role, modes, outputs, and performance rules.
- `.planning/phases/13-ux-ia-and-cube-concept/13-QUESTION-WORKFLOW.md` — workflow stages, question matrix, and view responsibilities.
- `.planning/phases/13-ux-ia-and-cube-concept/13-MASTER-DESIGN-BRIEF.md` — summary of view roles, layout principle, and preserved decisions.
- `.planning/phases/13-ux-ia-and-cube-concept/13-INTERACTION-RESEARCH.md` — thesis-ready interaction model for overview, brush, and detail behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard-demo/DashboardDemoShell.tsx`: already provides the shared viewport, map/cube toggle, left workflow drawer slot, and fixed right rail.
- `src/components/dashboard-demo/DemoTimelinePanel.tsx`: already acts as the timeline control surface and wraps `DemoDualTimeline`.
- `src/components/timeline/DemoDualTimeline.tsx`: already contains the timeline-led analysis surface and linked selection wiring.
- `src/components/viz/CubeVisualization.tsx`: already has the cube viewport shell and several selection/analysis overlays.
- `src/components/dashboard-demo/WorkflowSkeleton.tsx`: already represents the workflow drawer concept.
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx`: already represents the fixed right analysis rail.

### New Architecture Direction
- `src/data/`: canonical dataset access and bootstrap.
- `src/analysis/`: derived computations for timeline, cube, and slices.
- `src/view-models/`: UI-ready shapes consumed by components.
- `src/components/`: presentational UI and shell composition.
- `src/store/`: UI state only, not heavy analytics.

### Established Patterns
- The demo already uses a single shared dataset store (`useTimelineDataStore`) across timeline, map, and cube.
- The demo shell already treats the map/cube viewport as a toggle, not a split screen.
- The timeline is already the primary temporal control surface, with selection and brush state feeding the rest of the demo.
- Linked state is already carried through Zustand stores, which fits the planned timeline-led coupling.

### Integration Points
- `src/app/dashboard-demo/page.tsx` -> `DashboardDemoShell` is the entry path for the demo IA.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` is where the layout decisions attach.
- `src/components/dashboard-demo/DemoTimelinePanel.tsx` is where the timeline and scaling controls live.
- `src/components/viz/CubeVisualization.tsx` is where relational cube behavior can be expressed.
- `src/components/dashboard-demo/DemoMapVisualization.tsx` is where map detail behavior stays grounded.
- `src/components/dashboard-demo/WorkflowSkeleton.tsx` and `DashboardDemoRailTabs.tsx` are the primary shell anchors for the workflow and analysis rail.
- New phase work should prefer additive files that plug into these entry points rather than broad rewrites of the existing components.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 13 scope.

</deferred>

---

*Phase: 13-ux-ia-and-cube-concept*
*Context gathered: 2026-04-23*
