# Phase 8: Contextual Data Enrichment - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add demo-local contextual layers beyond districts so crime patterns can be interpreted with socioeconomic, event, holiday, or traffic context. This phase now comes after the new demo-local preset-threshold phase.

</domain>

<decisions>
## Implementation Decisions

### Context scope
- **D-01:** The contextual layer stays demo-local and must not alter the stable routes.
- **D-02:** Context is explanatory, not decorative; it should help users understand why a pattern exists.
- **D-03:** Context should not break the core analysis flow or hide the existing crime surfaces.

### Phase ordering
- **D-04:** This phase depends on the demo-local preset-threshold phase inserted ahead of it.
- **D-05:** The demo analysis surfaces must remain the source of truth for the contextual layer.

### the agent's Discretion
- Exact context categories and whether one or many layers ship in this phase.
- How much of the context presentation is inline versus overlay-based.
- Whether any context chips or labels are needed beyond the minimum useful set.

</decisions>

<canonical_refs>
## Canonical References

### Roadmap and requirements
- `.planning/ROADMAP.md` — Phase 8 boundary, goal, and dependency order after the inserted threshold phase.
- `.planning/REQUIREMENTS.md` — `CTX-01` through `CTX-05` define the contextual enrichment requirements.
- `.planning/STATE.md` — Current phase/state metadata and resume pointer.

### Prior phase context
- `.planning/phases/07-dashboard-demo-preset-thresholds/07-CONTEXT.md` — demo-local preset threshold controls and stable-route boundaries.
- `.planning/phases/06-demo-timeline-polish/06-CONTEXT.md` — demo timeline polish and demo-local warp follow-up.
- `.planning/phases/05-stats-stkde-interaction/05-CONTEXT.md` — district-first analysis language and demo-local stats/STKDE interaction rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard-demo/DemoMapVisualization.tsx` — demo-local map wrapper where contextual overlays can land.
- `src/components/dashboard-demo/DemoStatsPanel.tsx` — demo-local stats entry surface.
- `src/components/dashboard-demo/DemoStatsMapOverlay.tsx` — overlay layer for contextual presentation.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — shell composition around the demo surfaces.

### Established Patterns
- Demo-local surfaces should stay isolated from the stable dashboard and stats routes.
- The project favors light overlays and compact labels over noisy context chrome.
- Source-inspection tests are used to lock route-level separation.

### Integration Points
- `src/components/dashboard-demo/DemoStatsPanel.tsx` — entry point for contextual explanations.
- `src/components/dashboard-demo/DemoMapVisualization.tsx` — map-side context rendering.
- `src/components/dashboard-demo/DemoStatsMapOverlay.tsx` — visual overlay and context chips.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — shell composition around the demo analysis surfaces.

</code_context>

<deferred>
## Deferred Ideas

- Broader context ingestion pipelines belong to later work.
- Any route-wide analytics summary for context should wait until the demo-local surfaces are stable.

</deferred>

---

*Phase: 08-contextual-data-enrichment*
*Context gathered: 2026-04-09*
