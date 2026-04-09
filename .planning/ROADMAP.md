# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

This roadmap rebuilds the current Next.js modular-monolith around the paper's conceptual tasks plus an isolated slice workflow: overview, dashboard demo UX hardening, demo timeline rewrite, demo stats/STKDE wiring, demo stats/STKDE interaction, workflow skeleton, workflow handoff, trace, compare, detect, summarize, and burst analysis. The visualization strategy remains a hybrid 2D density projection + 3D Space-Time Cube environment. A dedicated UX-first phase now comes before the demo timeline rewrite so visual flow decisions are stabilized before later interaction wiring.

## Phases

- [x] **Phase 1: Overview + pattern summaries** — reveal broad clusters and recurring patterns in the 2D density view. (completed 2026-04-09)
- [ ] **Phase 2: Dashboard demo UX hardening** — finalize UI flow and interaction semantics on `/dashboard-demo`, including a workflow skeleton that behaves like a multistep form without technical workflow coupling.
- [ ] **Phase 3: Demo timeline rewrite** — rebuild the timeline/dual timeline for the demo so slices and overlays feel polished, lightweight, and workflow-ready.
- [ ] **Phase 4: Demo stats + STKDE wiring** — bring the stats and hotspot analysis surfaces into `/dashboard-demo` as interaction/state wiring built on the separate stats and STKDE routes.
- [ ] **Phase 5: Demo stats + STKDE interaction** — frame stats as the entry surface and STKDE as the linked hotspot analysis surface inside `/dashboard-demo`.
- [ ] **Phase 6: Workflow isolation + dashboard handoff (technical)** — implement generate/review/apply wiring and state handoff contracts after the demo analysis surfaces are stabilized.
- [ ] **Phase 7: Trace trajectories + compare behaviors** — keep the 2D and 3D views synchronized while users follow and compare selections.
- [ ] **Phase 8: Detect events + decode bursts** — use non-uniform temporal scaling to expose anomalies, burst order, burst pacing, and true duration.
- [ ] **Phase 9: Support overlays + hardening** — add trust, hotspot, guidance, and performance support without breaking the core analysis loop.

## Phase Details

### Phase 1: Overview + pattern summaries
**Goal**: Users can perceive broad spatiotemporal structure and summarize recurring patterns from the overview surface.
**Depends on**: Nothing
**Requirements**: T1, T5, VIEW-01, VIEW-04
**Plans**: 3
Plans:
- `.planning/phases/01-overview-pattern-summaries/01-PLAN.md` — Done: reframe the dashboard shell and status rail around overview-first semantics.
- `.planning/phases/01-overview-pattern-summaries/02-PLAN.md` — Done: make the 2D density surface readable for clusters and recurring patterns.
- `.planning/phases/01-overview-pattern-summaries/03-PLAN.md` — Done: make the timeline slider the primary temporal control.
**Success Criteria** (what must be TRUE):
  1. User can perceive global trends, high-activity intervals, and spatial clusters.
  2. User can generalize from detailed observations to recurring behaviors or periodic patterns.
  3. User can inspect a 2D density projection with opacity modulation that reveals clusters without hiding the overview.
  4. User can narrow or expand the active temporal window with a timeline slider.

### Phase 2: Dashboard demo UX hardening
**Goal**: Use `/dashboard-demo` as a UX laboratory to validate and refine the end-to-end visual flow, including an `Explore`-first workflow skeleton with continuous slice-building and review, before technical workflow wiring begins.
**Depends on**: Phase 1
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, UXF-01, UXF-02, UXF-03, UXF-04, WFUI-01, WFUI-02, WFUI-03, WFUI-04, WFUI-05
**Plans:** 1
Plans:
- `.planning/phases/02-dashboard-demo-ui-ux/02-05-PLAN.md` — cohesive `/dashboard-demo` shell, route regression, and nested workflow scaffold.
**Success Criteria** (what must be TRUE):
  1. Existing `/dashboard` remains stable with Phase 1 behavior intact.
  2. Existing `/timeslicing` remains stable (no workflow-shell regressions carried forward).
  3. `/dashboard-demo` renders a coherent UI flow (map-first viewport, fixed right rail, timeline continuity).
  4. `/dashboard-demo` includes a workflow skeleton presented as an `Explore`-first multistep-form-style surface under the demo shell.
  5. `/dashboard-demo` lets slice-building and review feel continuous rather than split into disconnected mini-pages.
  6. `/dashboard-demo` interaction language is consistent and production-oriented (labels, affordances, visual hierarchy).
  7. `/dashboard-demo` swap and rail behavior is intuitive on desktop-first constraints.
  8. `/dashboard-demo` reuses core primitives/stores without introducing a second frontend architecture.

### Phase 3: Demo timeline rewrite
**Goal**: Rebuild the timeline/dual timeline for `/dashboard-demo` so the demo has a polished, lower-clutter temporal surface before workflow wiring begins.
**Depends on**: Phase 2
**Requirements**: DTL-01, DTL-02, DTL-03, DTL-04, DTL-05
**Plans:** 1
Plans:
- `.planning/phases/03-demo-timeline-rewrite/03-01-PLAN.md` — rewrite the demo timeline and separate slice overlays into a cleaner demo-specific structure.
**Success Criteria** (what must be TRUE):
  1. User can read the demo timeline without proof-of-concept clutter dominating the view.
  2. User can see slices as a clear overlay/companion layer rather than a busy visual pileup.
  3. User can manipulate slice state in a way that feels polished and demo-friendly.
  4. The rewritten demo timeline is ready to support the workflow phase that follows.

### Phase 4: Demo stats + STKDE wiring
**Goal**: Bring the stats and hotspot analysis surfaces into `/dashboard-demo` as interaction and state wiring built on the separate stats and STKDE routes.
**Depends on**: Phase 3
**Requirements**: DEMO-07, DEMO-08, DEMO-09, DEMO-10, DEMO-11
**Plans:** 1
Plans:
- `.planning/phases/04-demo-stats-stkde/04-01-PLAN.md` — wire the demo stats and STKDE surfaces into the dashboard demo state model.
**Success Criteria** (what must be TRUE):
  1. User can see stats and hotspot analysis as part of the demo dashboard instead of as detached reference routes.
  2. User can change selection/time context and see demo stats/STKDE respond in the same shared analysis state.
  3. Demo-specific interaction state stays isolated from the stable route behavior.
  4. The demo analysis surfaces are ready for the workflow isolation phase that follows.

### Phase 5: Demo stats + STKDE interaction
**Goal**: Frame stats as the entry surface and STKDE as the linked hotspot analysis surface inside `/dashboard-demo`.
**Depends on**: Phase 4
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06
**Plans:** 3
Plans:
- `.planning/phases/05-stats-stkde-interaction/05-01-PLAN.md` — make Stats the default entry point and reframe the panel around district-first analysis language.
- `.planning/phases/05-stats-stkde-interaction/05-02-PLAN.md` — carry selected demo districts into STKDE as a real one-way filter.
- `.planning/phases/05-stats-stkde-interaction/05-03-PLAN.md` — lock the stats-first and district-filtered contract with regression coverage.
**Success Criteria** (what must be TRUE):
  1. User can use stats as the entry surface for district-based analysis.
  2. User can inspect the spatial distribution / hotspot view as part of the demo stats experience.
  3. User can filter STKDE from the stats surface through district selection.
  4. User can keep stats and STKDE in separate tabs while preserving one-way linkage from stats to STKDE.

### Phase 6: Workflow isolation + dashboard handoff (technical)
**Goal**: Implement the isolated workflow shell and technical generate/review/apply wiring after the demo analysis surfaces are validated, so the workflow stays separate from dashboard analysis until Apply.
**Depends on**: Phase 5
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06
**Plans:** 4
Plans:
- `.planning/phases/06-workflow-isolation/06-01-PLAN.md` — isolate the workflow into a dedicated shell.
- `.planning/phases/06-workflow-isolation/06-02-PLAN.md` — break the workflow route into explicit generate, review, and apply sections.
- `.planning/phases/06-workflow-isolation/06-03-PLAN.md` — make the apply preview editable and route straight to the dashboard.
- `.planning/phases/06-workflow-isolation/06-04-PLAN.md` — verify workflow isolation and dashboard handoff end to end.
**Success Criteria** (what must be TRUE):
  1. User can open generate slices as a dedicated full-screen step separate from dashboard analysis.
  2. User can review and edit draft bins with warnings visible before apply.
  3. Apply transitions directly into dashboard analysis without dead-end confirmation screens.
  4. Dashboard receives only applied state and remains isolated from pre-apply workflow concerns.

### Phase 7: Trace trajectories + compare behaviors
**Goal**: The 2D and 3D views stay synchronized while users follow selected records and compare them over time.
**Depends on**: Phase 6
**Requirements**: T2, T3, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. User can follow the temporal evolution of selected incidents/records and aggregated clusters over time.
  2. User can compare timing, duration, or spatial extent across multiple selections.
  3. User can inspect a coordinated 3D Space-Time Cube with time mapped to the vertical axis.
  4. User can synchronize navigation, selection, and brushing/linking between the 2D and 3D views.

### Phase 8: Detect events + decode bursts
**Goal**: Non-uniform temporal scaling makes anomalies and burst structure readable while preserving metric duration.
**Depends on**: Phase 7
**Requirements**: T4, T6, T7, T8, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
  1. User can identify intersections, pauses, or abrupt changes in activity that deviate from the norm.
  2. User can distinguish the temporal order of rapid, concurrent events inside a burst.
  3. User can classify the internal pacing of a burst as gradual escalation or instantaneous spike.
  4. User can recover the true duration of a distorted interval.
  5. User can use non-uniform temporal scaling to expand dense intervals while keeping metric duration visible.
  6. User can distinguish categorical structure with hue and low-confidence events with transparency.

### Phase 9: Support overlays + hardening
**Goal**: Trust, hotspot, guidance, and performance support stay explicit without undermining the core analytical workflow.
**Depends on**: Phase 8
**Requirements**: TRUST-01, TRUST-02, TRUST-03, TRUST-04, HOTS-01, HOTS-02, SUGG-01, SUGG-02, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. User can see whether the app is loading, ready, or degraded during startup.
  2. User can tell whether displayed data is real, mock, or partial.
  3. User sees distinct loading, empty, error, and degraded states instead of a blank or misleading panel.
  4. User can apply date, crime type, and geography filters, and invalid filter inputs are rejected with clear feedback.
  5. User can enable a spatial hotspot / STKDE layer and interpret the result with clear confidence or rationale metadata.
  6. User can review suggested time slices or proposals before applying one and understand why they were suggested.
  7. User can brush, play, and filter large datasets without the UI freezing.
  8. Heavy adaptive computations and data transforms run off the main thread.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 1. Overview + pattern summaries | 4 | Complete    | 2026-04-09 |
| 2. Dashboard demo UX hardening | 10 | Complete    | 2026-04-09 |
| 3. Demo timeline rewrite | 5 | Not started | - |
| 4. Demo stats + STKDE wiring | 5 | Not started | - |
| 5. Demo stats + STKDE interaction | 6 | Not started | - |
| 6. Workflow isolation + dashboard handoff (technical) | 6 | Not started | - |
| 7. Trace trajectories + compare behaviors | 4 | Not started | - |
| 8. Detect events + decode bursts | 6 | Not started | - |
| 9. Support overlays + hardening | 10 | Not started | - |
