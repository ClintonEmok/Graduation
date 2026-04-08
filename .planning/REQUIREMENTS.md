# Requirements: Adaptive Space-Time Cube Prototype

**Defined:** 2026-04-09
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Trust & Readiness

- [ ] **TRUST-01**: User can see whether the app is loading, ready, or degraded during startup.
- [ ] **TRUST-02**: User can tell whether displayed data is real, mock, or partial.
- [ ] **TRUST-03**: User sees distinct loading, empty, error, and degraded states instead of a blank or misleading panel.
- [ ] **TRUST-04**: User can apply date, crime type, and geography filters, and invalid filter inputs are rejected with clear feedback.

### Cross-View Sync

- [ ] **SYNC-01**: User can brush or select a time range in the timeline and see the cube and map reflect the same range.
- [ ] **SYNC-02**: User can select a point or range in the cube or map and see the same selection reflected in the timeline.
- [ ] **SYNC-03**: User can inspect the selected record’s details in a focused view.

### Temporal Controls

- [ ] **TIME-01**: User can change time resolution from coarse to fine and the detail window updates accordingly.
- [ ] **TIME-02**: User can play and step through time at the selected resolution.

### Adaptive Analysis

- [ ] **ADAP-01**: User can enable adaptive time warping to expand dense intervals and compress sparse intervals.
- [ ] **ADAP-02**: User can adjust warp strength, burst metric, and highlight percentile.
- [ ] **ADAP-03**: User can see bursty intervals highlighted consistently in both the cube and map.

### Performance & Resilience

- [ ] **PERF-01**: User can brush, play, and filter large datasets without the UI freezing.
- [ ] **PERF-02**: Heavy adaptive computations and data transforms run off the main thread.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Hotspots

- **HOTS-01**: User can enable a spatial hotspot / STKDE layer to inspect concentration surfaces.
- **HOTS-02**: User can understand the hotspot result using clear confidence or rationale metadata.

### Guidance

- **SUGG-01**: User can review suggested time slices or proposals before applying one.
- **SUGG-02**: User can see why a slice was suggested.

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
| TRUST-01 | Phase 1 | Planned |
| TRUST-02 | Phase 1 | Planned |
| TRUST-03 | Phase 1 | Planned |
| TRUST-04 | Phase 1 | Planned |
| SYNC-01 | Phase 2 | Planned |
| SYNC-02 | Phase 2 | Planned |
| SYNC-03 | Phase 2 | Planned |
| TIME-01 | Phase 2 | Planned |
| TIME-02 | Phase 2 | Planned |
| ADAP-01 | Phase 3 | Planned |
| ADAP-02 | Phase 3 | Planned |
| ADAP-03 | Phase 3 | Planned |
| PERF-01 | Phase 4 | Planned |
| PERF-02 | Phase 3 | Planned |

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after initialization*
