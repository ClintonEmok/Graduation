# Phase 1: Overview + pattern summaries - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the overview surface for the paper's task model: users can perceive broad spatiotemporal structure and recurring patterns from the 2D density view, with the timeline slider controlling the active window. This phase reuses the existing dashboard shell and keeps the 3D cube secondary.

</domain>

<decisions>
## Implementation Decisions

### Overview Surface
- **D-01:** Make the 2D density projection the primary phase-1 surface.
- **D-02:** Keep the 3D cube visible as supporting context, not the main focus.

### Temporal Windowing
- **D-03:** Use the existing timeline slider to narrow or expand the active window.
- **D-04:** Preserve current playback and step affordances, but do not introduce non-uniform temporal scaling in phase 1.

### Pattern Summaries
- **D-05:** Represent summaries as visual structure: clusters, repeated intervals, and broad activity trends.
- **D-06:** Avoid narrative summaries, guidance prompts, or burst-specific decoding in this phase.

### Deferred Support Features
- **D-07:** Trust/provenance/loading hardening remains support-only and does not become a phase-1 deliverable.
- **D-08:** Hotspot/STKDE and guidance/proposal features stay in later support phases.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — project vision, scope, and non-negotiables
- `.planning/REQUIREMENTS.md` — phase-mapped task set T1-T8 and support requirements
- `.planning/ROADMAP.md` — phase 1 boundary and success criteria
- `.planning/STATE.md` — current focus and decisions to carry forward

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — repo layout and feature zones
- `.planning/codebase/STACK.md` — current stack and dependency constraints
- `.planning/codebase/CONCERNS.md` — current risks and fragile seams
- `.planning/codebase/INTEGRATIONS.md` — data sources and route integration points
- `.planning/codebase/TESTING.md` — existing test patterns and gaps
- `.planning/codebase/CONVENTIONS.md` — naming, import, and store patterns

### Phase 1 Surfaces
- `src/app/dashboard/page.tsx` — dashboard composition and panel layout
- `src/components/map/MapVisualization.tsx` — 2D overview surface and overlays
- `src/components/timeline/TimelinePanel.tsx` — timeline slider and playback controls
- `src/components/viz/CubeVisualization.tsx` — 3D cube shell and existing analysis context
- `src/store/useCoordinationStore.ts` — shared selection and brush state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardLayout`: existing shell for the map/cube/timeline composition
- `MapVisualization`: 2D overview surface with density, cluster, and selection overlays
- `TimelinePanel`: active-window slider plus playback and resolution controls
- `useCoordinationStore`: shared selection, brush range, and sync state
- `useCrimeData` and `useTimelineDataStore`: current data ingress hooks for overview work

### Established Patterns
- Single coordination store drives cross-panel sync instead of ad hoc events
- Feature-based modular monolith keeps map, timeline, and cube concerns separate
- Heavy adaptive analysis already leans on worker boundaries and domain stores
- Existing map/timeline panels already expose the overview interactions this phase needs

### Integration Points
- `src/app/dashboard/page.tsx` wires the overview shell together
- `MapVisualization` and `TimelinePanel` are the main phase-1 interaction surfaces
- `useCoordinationStore` is the sync spine for selection and active-window state
- `CubeVisualization` stays synchronized but is not the phase-1 focus area

</code_context>

<specifics>
## Specific Ideas

- Frame phase 1 in the paper's vocabulary: T1 and T5 plus VIEW-01 and VIEW-04.
- Prioritize broad clusters, recurring patterns, and active-window navigation over detail decoding.
- Keep the cube present for context, but do not let it pull the phase away from the overview task.
- Use the existing density/cluster tooling rather than inventing new summary visuals.

</specifics>

<deferred>
## Deferred Ideas

- T2 and T3 belong to Phase 2.
- T4, T6, T7, and T8 belong to Phase 3.
- Trust/provenance/loading, hotspot/STKDE, guidance/proposal, and performance hardening belong to Phase 4.
- `SHAR-01` remains deferred to v2.

</deferred>

---

*Phase: 1 - Overview + pattern summaries*
*Context gathered: 2026-04-09*
