# Requirements: Adaptive Space-Time Cube Prototype

**Defined:** 2026-04-09
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns through a hybrid 2D density projection + 3D Space-Time Cube that preserves metric duration while making burst structure readable.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Overview and Pattern Summary

- [ ] **T1**: User can perceive broad spatiotemporal patterns, including global trends, high-activity intervals, and spatial clusters.
- [ ] **T5**: User can generalize from detailed observations to identify recurring behaviors or periodic patterns.

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
| T2 | Phase 2 | Planned |
| T3 | Phase 2 | Planned |
| VIEW-02 | Phase 2 | Planned |
| VIEW-03 | Phase 2 | Planned |
| T4 | Phase 3 | Planned |
| T6 | Phase 3 | Planned |
| T7 | Phase 3 | Planned |
| T8 | Phase 3 | Planned |
| VIEW-05 | Phase 3 | Planned |
| VIEW-06 | Phase 3 | Planned |
| TRUST-01 | Phase 4 | Planned |
| TRUST-02 | Phase 4 | Planned |
| TRUST-03 | Phase 4 | Planned |
| TRUST-04 | Phase 4 | Planned |
| HOTS-01 | Phase 4 | Planned |
| HOTS-02 | Phase 4 | Planned |
| SUGG-01 | Phase 4 | Planned |
| SUGG-02 | Phase 4 | Planned |
| PERF-01 | Phase 4 | Planned |
| PERF-02 | Phase 4 | Planned |

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after paper-task remap*
