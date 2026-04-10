# Requirements: Adaptive Space-Time Cube Prototype

**Defined:** 2026-04-09
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns through a hybrid 2D density projection + 3D Space-Time Cube that preserves metric duration while making burst structure readable.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Overview and Pattern Summary

- [ ] **T1**: User can perceive broad spatiotemporal patterns, including global trends, high-activity intervals, and spatial clusters.
- [ ] **T5**: User can generalize from detailed observations to identify recurring behaviors or periodic patterns.

### Demo Stats and STKDE Wiring (Phase 4)

- [ ] **DEMO-07**: User can see compact stats and hotspot analysis inside `/dashboard-demo` instead of only as separate reference routes.
- [ ] **DEMO-08**: User can change selection or time context and see demo stats/STKDE respond in the same shared analysis state.
- [ ] **DEMO-09**: User can keep demo-specific analysis state isolated from the stable `/stats` and `/stkde` routes.
- [ ] **DEMO-10**: User can use the stats/STKDE surfaces without the demo becoming a second architecture or a second dashboard app.
- [ ] **DEMO-11**: User can keep the demo analysis surfaces ready for the workflow isolation phase that follows.

### Demo Stats Variant and STKDE Interaction (Phase 5)

- [ ] **STAT-01**: User can see district-based stats summaries inside `/dashboard-demo`.
- [ ] **STAT-02**: User can inspect the spatial distribution / hotspot view as part of the demo stats experience.
- [ ] **STAT-03**: User can select a district in stats and have STKDE filter accordingly.
- [ ] **STAT-04**: User can keep stats and STKDE in separate tabs inside the demo rail.
- [ ] **STAT-05**: User can read hotspot/place labels in plain-language district terms.
- [ ] **STAT-06**: User can keep STKDE hotspot selection from altering stats summary state.

### Demo Timeline Polish (Phase 6)

- [ ] **TPL-01**: User can read the demo timeline as a clean primary temporal surface at a glance.
- [ ] **TPL-02**: User can keep slices and overlays visible without them overwhelming the main timeline.
- [ ] **TPL-03**: User can use playback, scrubbing, and temporal controls without clutter.
- [ ] **TPL-04**: User can distinguish edit, review, and analysis cues in the timeline.
- [ ] **TPL-05**: User can use the polished timeline as a foundation for later contextual layers.

### Dashboard-Demo Preset Thresholds (Phase 7)

- [ ] **PTH-01**: User can adjust threshold values separately for each context-aware generation preset inside `/dashboard-demo`.
- [ ] **PTH-02**: User can switch presets and see each preset restore its own threshold values.
- [ ] **PTH-03**: User can compare context-aware presets without threshold changes bleeding across presets.
- [ ] **PTH-04**: User can keep threshold controls demo-local and separate from `/timeslicing`.
- [ ] **PTH-05**: User can reuse existing preset families and interval concepts without introducing a new algorithm family.

### Contextual Data Enrichment (Phase 8)

- [ ] **CTX-01**: User can see contextual layers such as socioeconomic signals, holidays, events, or traffic context alongside the demo analysis.
- [ ] **CTX-02**: User can interpret the added context as explanatory rather than noisy.
- [ ] **CTX-03**: User can keep contextual layers demo-local and separate from the stable routes.
- [ ] **CTX-04**: User can enable or disable context without breaking the core crime analysis flow.
- [ ] **CTX-05**: User can use contextual enrichment to better explain patterns before workflow isolation.

### Workflow Isolation and Dashboard Handoff (Phase 9)

- [ ] **FLOW-01**: User can open generate slices as a dedicated full-screen step that is separate from the dashboard.
- [ ] **FLOW-02**: User can review draft bins and warnings in a dedicated full-screen review step.
- [ ] **FLOW-03**: User can preview applied slices on the timeline in a dedicated full-screen apply-preview step that stays editable in place.
- [ ] **FLOW-04**: User can keep warnings visible while applying and editing slices in the apply-preview step.
- [ ] **FLOW-05**: Clicking Apply advances directly into the dashboard without an intermediate confirmation screen.
- [ ] **FLOW-06**: The final dashboard opens map-first in a shared viewport that can swap between the 2D map and 3D cube, and it carries only the applied state forward.

### Dashboard Demo Route Pivot (Phase 2 override)

- [ ] **DEMO-01**: Existing `/dashboard` route remains at stable Phase 1 behavior while Phase 2 work proceeds.
- [ ] **DEMO-02**: Existing `/timeslicing` route remains at stable pre-Phase-2 behavior while Phase 2 work proceeds.
- [ ] **DEMO-03**: A new isolated `/dashboard-demo` route renders a map-first shared viewport.
- [ ] **DEMO-04**: `/dashboard-demo` supports manual 2D map ↔ 3D cube swapping in the same viewport.
- [ ] **DEMO-05**: `/dashboard-demo` renders an always-visible fixed right STKDE rail.
- [ ] **DEMO-06**: `/dashboard-demo` reuses existing primitives/stores (MapVisualization, CubeVisualization, TimelinePanel/DualTimeline, DashboardStkdePanel) without creating a second frontend architecture.

### Dashboard Demo UI/UX Flow Hardening (new Phase 2 focus)

- [ ] **UXF-01**: User can understand the `/dashboard-demo` flow at a glance via clear information hierarchy and consistent panel semantics.
- [ ] **UXF-02**: User can switch between map and cube in one shared viewport with explicit, unambiguous active-state feedback.
- [ ] **UXF-03**: User can keep contextual status awareness (applied state, generation status, draft metadata) without obscuring primary analysis controls.
- [ ] **UXF-04**: User can navigate the desktop-first layout (main viewport, timeline rail, fixed STKDE rail) without visual clutter or competing focal points.

### Workflow Skeleton Under Demo

- [ ] **WFUI-01**: User can see the workflow framed as a multistep form-style scaffold inside `/dashboard-demo`.
- [ ] **WFUI-02**: User can understand generate/review/apply as distinct steps from the skeleton alone, even before technical wiring exists.
- [ ] **WFUI-03**: User can recognize that the workflow skeleton is nested under the demo rather than exposed as a separate route.
- [ ] **WFUI-04**: User can open the workflow skeleton from a left-anchored toggle drawer without it competing with the fixed right STKDE rail.
- [ ] **WFUI-05**: User can start in an `Explore` step and move into a continuous slice-building and review flow before dashboard handoff.

### Demo Timeline Rewrite (Phase 3)

- [ ] **DTL-01**: User can understand the demo timeline/dual timeline as the primary temporal control surface at a glance.
- [ ] **DTL-02**: User can see slices and overlays as a clear companion layer rather than a cluttered pile of competing widgets.
- [ ] **DTL-03**: User can manipulate slices in a polished, demo-specific way without the base timeline becoming busy.
- [ ] **DTL-04**: User can keep the timeline readable while working with overlays and slice state.
- [ ] **DTL-05**: User can use the rewritten demo timeline as the foundation for the workflow that follows.

### Trace and Compare

- [ ] **T2**: User can follow the temporal evolution of selected incidents/records and aggregated clusters over time to understand movement paths and duration.
- [ ] **T3**: User can compare timing, duration, or spatial extent across multiple selections to identify synchronicity or divergence.

### Detect and Decode Bursts

- [ ] **T4**: User can identify intersections, pauses, or abrupt changes in activity that deviate from the norm.
- [ ] **T6**: User can distinguish the temporal order of rapid, concurrent events inside a burst.
- [ ] **T7**: User can classify the internal pacing of a burst as gradual escalation or instantaneous spike.
- [ ] **T8**: User can recover the true duration of a distorted interval.

### Visualization Support Requirements

- [ ] **VIEW-01**: User can inspect a 2D density projection with opacity modulation to reveal high-activity clusters without losing the overview.
- [ ] **VIEW-02**: User can inspect a coordinated 3D Space-Time Cube with time mapped to the vertical axis for trajectory tracing.
- [ ] **VIEW-03**: User can synchronize navigation, selection, and brushing/linking between the 2D and 3D views.
- [ ] **VIEW-04**: User can narrow or expand the active temporal window with a timeline slider.
- [ ] **VIEW-05**: User can use non-uniform temporal scaling to expand dense intervals while keeping metric duration visible.
- [ ] **VIEW-06**: User can distinguish categorical structure with hue and low-confidence events with transparency, while burst duration cues remain explicit.

### Trust and Analysis Support

- [ ] **TRUST-01**: User can see whether the app is loading, ready, or degraded during startup.
- [ ] **TRUST-02**: User can tell whether displayed data is real, mock, or partial.
- [ ] **TRUST-03**: User sees distinct loading, empty, error, and degraded states instead of a blank or misleading panel.
- [ ] **TRUST-04**: User can apply date, crime type, and geography filters, and invalid filter inputs are rejected with clear feedback.
- [ ] **HOTS-01**: User can enable a spatial hotspot / STKDE layer to inspect concentration surfaces.
- [ ] **HOTS-02**: User can understand the hotspot result using clear confidence or rationale metadata.
- [ ] **SUGG-01**: User can review suggested time slices or proposals before applying one.
- [ ] **SUGG-02**: User can see why a slice was suggested.
- [ ] **PERF-01**: User can brush, play, and filter large datasets without the UI freezing.
- [ ] **PERF-02**: Heavy adaptive computations and data transforms run off the main thread.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Sharing

- **SHAR-01**: User can export a static snapshot or report of the current analysis.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Authentication / accounts | Internal research prototype; adds scope without improving analysis |
| Real-time multi-user collaboration | Single-analyst workflow is the current focus |
| Mobile-native app support | 3D cube + dense brushing is desktop-first by nature |
| Full case-management / incident workflow | Turns the product into an operations system, not an analytics tool |
| Generic BI dashboard features | Dilutes the domain-specific exploration model |
| Social sharing / public publishing | Adds privacy and permissions complexity without core value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| T1 | Phase 1 | Planned |
| T5 | Phase 1 | Planned |
| VIEW-01 | Phase 1 | Planned |
| VIEW-04 | Phase 1 | Planned |
| DEMO-07 | Phase 4 | Planned |
| DEMO-08 | Phase 4 | Planned |
| DEMO-09 | Phase 4 | Planned |
| DEMO-10 | Phase 4 | Planned |
| DEMO-11 | Phase 4 | Planned |
| STAT-01 | Phase 5 | Planned |
| STAT-02 | Phase 5 | Planned |
| STAT-03 | Phase 5 | Planned |
| STAT-04 | Phase 5 | Planned |
| STAT-05 | Phase 5 | Planned |
| STAT-06 | Phase 5 | Planned |
| TPL-01 | Phase 6 | Planned |
| TPL-02 | Phase 6 | Planned |
| TPL-03 | Phase 6 | Planned |
| TPL-04 | Phase 6 | Planned |
| TPL-05 | Phase 6 | Planned |
| PTH-01 | Phase 7 | Planned |
| PTH-02 | Phase 7 | Planned |
| PTH-03 | Phase 7 | Planned |
| PTH-04 | Phase 7 | Planned |
| PTH-05 | Phase 7 | Planned |
| CTX-01 | Phase 8 | Planned |
| CTX-02 | Phase 8 | Planned |
| CTX-03 | Phase 8 | Planned |
| CTX-04 | Phase 8 | Planned |
| CTX-05 | Phase 8 | Planned |
| FLOW-01 | Phase 9 | Planned |
| FLOW-02 | Phase 9 | Planned |
| FLOW-03 | Phase 9 | Planned |
| FLOW-04 | Phase 9 | Planned |
| FLOW-05 | Phase 9 | Planned |
| FLOW-06 | Phase 9 | Planned |
| DEMO-01 | Phase 2 | Planned |
| DEMO-02 | Phase 2 | Planned |
| DEMO-03 | Phase 2 | Planned |
| DEMO-04 | Phase 2 | Planned |
| DEMO-05 | Phase 2 | Planned |
| DEMO-06 | Phase 2 | Planned |
| UXF-01 | Phase 2 | Planned |
| UXF-02 | Phase 2 | Planned |
| UXF-03 | Phase 2 | Planned |
| UXF-04 | Phase 2 | Planned |
| WFUI-01 | Phase 2 | Planned |
| WFUI-02 | Phase 2 | Planned |
| WFUI-03 | Phase 2 | Planned |
| WFUI-04 | Phase 2 | Planned |
| WFUI-05 | Phase 2 | Planned |
| DTL-01 | Phase 3 | Planned |
| DTL-02 | Phase 3 | Planned |
| DTL-03 | Phase 3 | Planned |
| DTL-04 | Phase 3 | Planned |
| DTL-05 | Phase 3 | Planned |
| T2 | Phase 10 | Planned |
| T3 | Phase 10 | Planned |
| VIEW-02 | Phase 10 | Planned |
| VIEW-03 | Phase 10 | Planned |
| T4 | Phase 11 | Planned |
| T6 | Phase 11 | Planned |
| T7 | Phase 11 | Planned |
| T8 | Phase 11 | Planned |
| VIEW-05 | Phase 11 | Planned |
| VIEW-06 | Phase 11 | Planned |
| TRUST-01 | Phase 12 | Planned |
| TRUST-02 | Phase 12 | Planned |
| TRUST-03 | Phase 12 | Planned |
| TRUST-04 | Phase 12 | Planned |
| HOTS-01 | Phase 12 | Planned |
| HOTS-02 | Phase 12 | Planned |
| SUGG-01 | Phase 12 | Planned |
| SUGG-02 | Phase 12 | Planned |
| PERF-01 | Phase 12 | Planned |
| PERF-02 | Phase 12 | Planned |

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-10 after inserting the demo-local preset-threshold phase before contextual enrichment*
