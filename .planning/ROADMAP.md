# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

This roadmap rebuilds the current Next.js modular-monolith around the paper's conceptual tasks plus an isolated slice workflow: overview, dashboard demo UX hardening, demo timeline rewrite, demo stats/STKDE wiring, demo stats/STKDE interaction, demo timeline polish, demo-local preset thresholds, contextual data enrichment, burstiness-driven slice generation, non-uniform time slicing, warping metric scaling, workflow skeleton, workflow handoff, UX/IA design, relational cube design, trace, compare, detect, summarize, and burst analysis. The visualization strategy remains a hybrid 2D density projection + 3D Space-Time Cube environment. The demo slice pipeline now adds a granularity-driven non-uniform time slicing redesign plus a warping metric phase before workflow isolation so brushed selections can partition into hourly, daily, weekly, or monthly draft slices that expand and compress bursty intervals while preserving full coverage.

## Phases

- [x] **Phase 1: Overview + pattern summaries** — reveal broad clusters and recurring patterns in the 2D density view. (completed 2026-04-09)
- [ ] **Phase 2: Dashboard demo UX hardening** — finalize UI flow and interaction semantics on `/dashboard-demo`, including a workflow skeleton that behaves like a multistep form without technical workflow coupling.
- [ ] **Phase 3: Demo timeline rewrite** — rebuild the timeline/dual timeline for the demo so slices and overlays feel polished, lightweight, and workflow-ready.
- [ ] **Phase 4: Demo stats + STKDE wiring** — bring the stats and hotspot analysis surfaces into `/dashboard-demo` as interaction/state wiring built on the separate stats and STKDE routes.
- [ ] **Phase 5: Demo stats + STKDE interaction** — frame stats as the entry surface and STKDE as the linked hotspot analysis surface inside `/dashboard-demo`.
- [ ] **Phase 6: Demo timeline polish** — tighten the timeline/dual timeline UX so the demo's temporal controls feel readable, calm, and analysis-first.
- [ ] **Phase 7: Dashboard-demo preset thresholds** — add demo-local, user-parameterized threshold controls for each existing context-aware generation preset in `/dashboard-demo`.
- [ ] **Phase 8: Contextual data enrichment** — add demo-local contextual layers beyond districts, such as socioeconomic signals, events, holidays, or traffic context.
- [ ] **Phase 9: Burstiness-driven slice generation** — turn burst windows into draft slices so the demo can point users toward bursty periods without treating burst mode as a standalone map state.
- [ ] **Phase 10: Non-uniform time slicing** — partition the brushed selection into hourly or daily bins, score each bin, and expand bursty intervals while preserving full coverage.
- [x] **Phase 11: Warping metric for adaptive time bin scaling** — score same-granularity bins so width warping can expand or compress them without reordering or collapsing the selection. (completed 2026-04-21)
- [ ] **Phase 12: Codebase rewrite to improve code quality and proper separation of logic from UI where possible** — refactor god files, extract logic from components, fix type duplication, create missing utilities.
- [x] **Phase 13: UX/IA redesign + cube concept** — define the demo layout, relational cube behavior, and story-driven analysis flow. (completed 2026-04-23)
- [ ] **Phase 14: Detect events + decode bursts** — use non-uniform temporal scaling to expose anomalies, burst order, burst pacing, and true duration.
- [ ] **Phase 15: Support overlays + hardening** — add trust, hotspot, guidance, and performance support without breaking the core analysis loop.

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

### Phase 6: Demo timeline polish
**Goal**: Make the demo timeline and dual timeline feel calm, legible, and analysis-first while keeping slice-authored warping demo-local and visually quiet.
**Depends on**: Phase 5
**Requirements**: TPL-01, TPL-02, TPL-03, TPL-04, TPL-05
**Plans:** 2
Plans:
- `.planning/phases/06-demo-timeline-polish/06-01-PLAN.md` — polish the demo timeline hierarchy, interactions, and overlay presentation.
- `.planning/phases/06-demo-timeline-polish/06-02-PLAN.md` — simplify the demo-local warp follow-up so slice-authored warping stays readable without connector-heavy clutter.
**Success Criteria** (what must be TRUE):
  1. User can read the timeline at a glance without clutter fighting the main analysis.
  2. User can keep slices and overlays visible without them overwhelming the view.
   3. User can understand the difference between navigation, editing, and review controls.
   4. User can understand demo-local warping through the slice-authored warp map without the old connector-heavy presentation.
   5. Stable `/dashboard` and `/timeslicing` remain isolated from demo warp code.
   6. The demo timeline is ready to host additional contextual data.

### Phase 7: Dashboard-demo preset thresholds
**Goal**: Users can tune per-preset threshold controls in `/dashboard-demo` without affecting the stable `/timeslicing` route.
**Depends on**: Phase 6
**Requirements**: PTH-01, PTH-02, PTH-03, PTH-04, PTH-05
**Plans:** 1
Plans:
- `.planning/phases/07-dashboard-demo-preset-thresholds/07-01-PLAN.md` — add demo-local preset threshold controls and lock the stable-route boundary.
**Success Criteria** (what must be TRUE):
   1. User can adjust threshold values separately for each context-aware generation preset.
   2. Switching presets restores the selected preset's own threshold values.
   3. Threshold edits stay demo-local and do not change `/timeslicing`.
   4. The demo reuses existing preset concepts rather than introducing a new algorithm family.

### Phase 8: Contextual data enrichment
**Goal**: Add demo-local contextual layers beyond districts so crime patterns can be interpreted with socioeconomic, event, holiday, or traffic context.
**Depends on**: Phase 7
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, CTX-05
**Plans:** 1
Plans:
- `.planning/phases/08-contextual-data-enrichment/08-01-PLAN.md` — define and wire contextual layers into the demo analysis flow.
**Success Criteria** (what must be TRUE):
   1. User can see context beyond district boundaries when it helps explain a pattern.
   2. User can interpret the added context without losing the core crime analysis flow.
   3. User can keep contextual layers demo-local and separate from the stable routes.
   4. The contextual enrichment is ready for the workflow isolation phase that follows.

### Phase 9: Burstiness-driven slice generation
**Goal**: Turn burst windows into draft slices so the demo can point users toward bursty periods without treating burst mode as a standalone map state.
**Depends on**: Phase 8
**Requirements**: TBD
**Plans:** 4
Plans:
- `.planning/phases/09-burstiness-driven-slice-generation/09-01-PLAN.md` — turn existing burst windows into draft slices and preserve burst metadata when they are applied.
- `.planning/phases/09-burstiness-driven-slice-generation/09-02-PLAN.md` — expose burst draft generation in the workflow shell and lock the burst preview contract.
- `.planning/phases/09-burstiness-driven-slice-generation/09-03-PLAN.md` — expose editable pending burst drafts in the dashboard-demo workflow before apply.
- `.planning/phases/09-burstiness-driven-slice-generation/09-04-PLAN.md` — wire the demo apply path so burst drafts actually replace the active slice set.

### Phase 10: Non-uniform time slicing
**Goal**: Turn the brushed selection into hourly, daily, weekly, or monthly draft slices that expand bursty intervals while still covering the full selected range exactly once.
**Depends on**: Phase 9
**Requirements**: VIEW-05, VIEW-06, T4, T6, T7, T8
**Plans:** 3
Plans:
- `.planning/phases/10-selection-first-burst-slice-generation/10-01-PLAN.md` — test the granularity-aware partitioning and burst-scoring helper.
- `.planning/phases/10-selection-first-burst-slice-generation/10-02-PLAN.md` — wire the helper into the demo store and workflow, keep editable draft slices, and show neutral-partition guidance.
- `.planning/phases/10-selection-first-burst-slice-generation/10-03-PLAN.md` — verify the non-uniform time slicing workflow end to end before workflow isolation resumes.
**Success Criteria** (what must be TRUE):
   1. User can choose hourly, daily, weekly, or monthly granularity for the brushed selection.
   2. Every timestamp in the brushed range belongs to exactly one generated slice.
   3. Burstiness controls expansion or warp weight rather than dropping sparse bins.
   4. The demo shows neutral-partition guidance instead of silent failure when nothing stands out.
   5. The demo burst workflow is ready for the workflow isolation phase that follows.

### Phase 11: Warping metric for adaptive time bin scaling
**Goal**: Define a reusable score engine for same-granularity bins so later warping can expand or compress widths without reordering or collapsing the selection.
**Depends on**: Phase 10
**Requirements**: TBD
**Plans:** 3/3 plans complete
Plans:
- `.planning/phases/11-warping-metric-for-adaptive-time-bin-scaling/11-01-PLAN.md` — done: build a pure comparable-bin warp-scoring helper with test-driven order and minimum-width guarantees.
- `.planning/phases/11-warping-metric-for-adaptive-time-bin-scaling/11-02-PLAN.md` — done: wire the shared helper into the authored warp preview and the non-uniform showcase route.
- `.planning/phases/11-warping-metric-for-adaptive-time-bin-scaling/11-03-PLAN.md` — visually verify the shared warp-scoring contract in the browser.
**Success Criteria** (what must be TRUE):
   1. User can score bins relative to peer bins of the same granularity.
   2. User can derive expand/compress factors from the score without changing order.
   3. User can keep minimum width above zero so bins never collapse away.
   4. The scoring layer is ready for later automatic and manual warping controls.

### Phase 12: Codebase rewrite to improve code quality and proper separation of logic from UI where possible.
**Goal:** Refactor god files, extract business logic from components, fix type duplication, create missing utilities, and improve overall code quality following Finoit software architecture best practices.
**Depends on:** Phase 11
**Requirements**: TBD
**Plans:** 8 plans

Plans:
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-01-PLAN.md` — Type system consolidation
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-02-PLAN.md` — Missing utilities creation
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-03-PLAN.md` — useSuggestionStore split
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-04-PLAN.md` — DualTimeline refactor
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-05-PLAN.md` — DemoDualTimeline refactor
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-06-PLAN.md` — wire the suggestion generator to shared utilities and lock bounds semantics
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-07-PLAN.md` — split DualTimeline into a shared surface and thinner wrapper
- `.planning/phases/12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible/12-08-PLAN.md` — apply the shared surface to DemoDualTimeline

### Phase 13: UX/IA redesign + cube concept
**Goal**: Define the demo information architecture, restructure the layout, and shape the cube into a relational analysis surface for bursts, slices, and comparisons.
**Depends on**: Phase 12
**Requirements**: UX-01, UX-02, UX-03, CUBE-01, CUBE-02, CUBE-03
**Plans:** 5/5 complete

Plans:
- `.planning/phases/13-ux-ia-and-cube-concept/13-01-PLAN.md` — story-led shell, manual workflow stepper, and dedicated explain rail.
- `.planning/phases/13-ux-ia-and-cube-concept/13-02-PLAN.md` — timeline view-model, compare framing, and primary-driver controls.
- `.planning/phases/13-ux-ia-and-cube-concept/13-03-PLAN.md` — relational cube shell, grouped overlays, and hover/selection detail surfaces.
- `.planning/phases/13-ux-ia-and-cube-concept/13-04-PLAN.md` — shared selection story across timeline, map, and cube.
- `.planning/phases/13-ux-ia-and-cube-concept/13-05-PLAN.md` — regression coverage for the new IA, compare copy, and cube language.
**Success Criteria** (what must be TRUE):
   1. User can understand the demo layout as a workflow with overview, timeline, map, cube, slices, and explanation.
   2. User can use the timeline as the primary analysis driver while the cube acts as a relational interpretation surface.
   3. User can compare uniform and adaptive scaling without changing the underlying dataset.
   4. User can see linked selection behavior across timeline, map, and cube.
   5. User can inspect burst structure and slice relationships without treating the cube as a raw data browser.

### Phase 14: Detect events + decode bursts
**Goal**: Non-uniform temporal scaling makes anomalies and burst structure readable while preserving metric duration.
**Depends on**: Phase 13
**Requirements**: T4, T6, T7, T8, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
   1. User can identify intersections, pauses, or abrupt changes in activity that deviate from the norm.
   2. User can distinguish the temporal order of rapid, concurrent events inside a burst.
   3. User can classify the internal pacing of a burst as gradual escalation or instantaneous spike.
   4. User can recover the true duration of a distorted interval.
   5. User can use non-uniform temporal scaling to expand dense intervals while keeping metric duration visible.
   6. User can distinguish categorical structure with hue and low-confidence events with transparency.

### Phase 15: Support overlays + hardening
**Goal**: Trust, hotspot, guidance, and performance support stay explicit without undermining the core analytical workflow.
**Depends on**: Phase 14
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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 1. Overview + pattern summaries | 4 | Complete    | 2026-04-09 |
| 2. Dashboard demo UX hardening | 10 | Complete    | 2026-04-09 |
| 3. Demo timeline rewrite | 5 | Not started | - |
| 4. Demo stats + STKDE wiring | 5 | Not started | - |
| 5. Demo stats + STKDE interaction | 6 | Not started | - |
| 6. Demo timeline polish | 5 | In progress | - |
| 7. Dashboard-demo preset thresholds | 5 | Not started | - |
| 8. Contextual data enrichment | 5 | Not started | - |
| 9. Burstiness-driven slice generation | 0 | In progress  | - |
| 10. Non-uniform time slicing | 0 | In progress | - |
| 11. Warping metric for adaptive time bin scaling | 0 | Complete    | 2026-04-21 |
| 12. Codebase rewrite | 8 | Complete    | 2026-04-21 |
| 13. UX/IA redesign + cube concept | 6 | Complete    | 2026-04-23 |
| 14. Detect events + decode bursts | 6 | Not started | - |
| 15. Support overlays + hardening | 10 | Not started | - |
