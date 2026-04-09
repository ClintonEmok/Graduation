# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

This roadmap rebuilds the current Next.js modular-monolith around the paper's conceptual tasks: overview, trace, compare, detect, summarize, and burst analysis. The visualization strategy is a hybrid 2D density projection + 3D Space-Time Cube environment, synchronized through brushing, linking, and non-uniform temporal scaling so users can read both broad patterns and metric duration without losing context.

## Phases

- [ ] **Phase 1: Overview + pattern summaries** — reveal broad clusters and recurring patterns in the 2D density view.
- [ ] **Phase 2: Trace trajectories + compare behaviors** — keep the 2D and 3D views synchronized while users follow and compare selections.
- [ ] **Phase 3: Detect events + decode bursts** — use non-uniform temporal scaling to expose anomalies, burst order, burst pacing, and true duration.
- [ ] **Phase 4: Support overlays + hardening** — add trust, hotspot, guidance, and performance support without breaking the core analysis loop.

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

### Phase 2: Trace trajectories + compare behaviors
**Goal**: The 2D and 3D views stay synchronized while users follow selected records and compare them over time.
**Depends on**: Phase 1
**Requirements**: T2, T3, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. User can follow the temporal evolution of selected incidents/records and aggregated clusters over time.
  2. User can compare timing, duration, or spatial extent across multiple selections.
  3. User can inspect a coordinated 3D Space-Time Cube with time mapped to the vertical axis.
  4. User can synchronize navigation, selection, and brushing/linking between the 2D and 3D views.

### Phase 3: Detect events + decode bursts
**Goal**: Non-uniform temporal scaling makes anomalies and burst structure readable while preserving metric duration.
**Depends on**: Phase 2
**Requirements**: T4, T6, T7, T8, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
  1. User can identify intersections, pauses, or abrupt changes in activity that deviate from the norm.
  2. User can distinguish the temporal order of rapid, concurrent events inside a burst.
  3. User can classify the internal pacing of a burst as gradual escalation or instantaneous spike.
  4. User can recover the true duration of a distorted interval.
  5. User can use non-uniform temporal scaling to expand dense intervals while keeping metric duration visible.
  6. User can distinguish categorical structure with hue and low-confidence events with transparency.

### Phase 4: Support overlays + hardening
**Goal**: Trust, hotspot, guidance, and performance support stay explicit without undermining the core analytical workflow.
**Depends on**: Phase 3
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
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 1. Overview + pattern summaries | 4 | Complete | 2026-04-09 |
| 2. Trace trajectories + compare behaviors | 4 | Not started | - |
| 3. Detect events + decode bursts | 6 | Not started | - |
| 4. Support overlays + hardening | 10 | Not started | - |
