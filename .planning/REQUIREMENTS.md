# Requirements: Adaptive Space-Time Cube v3.0

**Defined:** 2026-03-25
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## v1 Requirements (v3.0)

### Binning (Phase 61 — Complete)

- [x] **BIN-01**: User can select from 13 binning strategies (daytime-heavy, nighttime-heavy, crime-type-specific, burstiness, uniform-distribution, uniform-time, weekday-weekend, quarter-hourly, hourly, daily, weekly, custom, auto-adaptive)
- [x] **BIN-02**: User can merge adjacent bins
- [x] **BIN-03**: User can split bins
- [x] **BIN-04**: User can delete bins
- [x] **BIN-05**: User can resize bins
- [x] **BIN-06**: User can save/load binning configurations
- [x] **BIN-07**: User can undo/reset binning changes
- [x] **BIN-08**: Constraints validated (minEvents, maxEvents, maxBins, contiguous)

### Manual Timeslicing (Phase 62)

- [ ] **MANU-01**: User can manually create time slices via drag on timeline
- [ ] **MANU-02**: User can adjust slice boundaries with precision controls
- [ ] **MANU-03**: User can preview slice effects before applying
- [ ] **MANU-04**: User can delete individual slices
- [ ] **MANU-05**: User can reorder slices
- [ ] **MANU-06**: Manual mode clearly distinguished from auto modes

### Map Visualization (Phase 63)

- [ ] **MAP-01**: Time slices visible on 2D map view
- [ ] **MAP-02**: Slice boundaries clearly rendered
- [ ] **MAP-03**: Cross-view sync: selecting slice on map highlights in timeline/cube
- [ ] **MAP-04**: Map supports current zoom/pan levels without performance degradation
- [ ] **MAP-05**: Spatial filters integrate with slice selection

### Dashboard (Phase 64)

- [ ] **DASH-01**: Unified control panel for all timeslicing operations
- [ ] **DASH-02**: Current binning strategy and status visible
- [ ] **DASH-03**: Active slices displayed with quick actions
- [ ] **DASH-04**: Workflow status (manual/auto) clearly indicated
- [ ] **DASH-05**: Quick access to switch between modes

### STKDE Integration (Phase 65)

- [ ] **STKD-01**: Kernel density estimation overlay available
- [ ] **STKD-02**: Hotspot detection panel shows high-density areas
- [ ] **STKD-03**: Chicago heatmap integration functional
- [ ] **STKD-04**: STKDE results visible in 3D cube view
- [ ] **STKD-05**: Toggle between standard and STKDE visualization

### Integration Testing (Phase 66)

- [ ] **TEST-01**: End-to-end workflow tests pass
- [ ] **TEST-02**: Cross-route navigation works correctly
- [ ] **TEST-03**: State persists across route changes
- [ ] **TEST-04**: Performance benchmarks meet targets
- [ ] **TEST-05**: Edge cases handled gracefully

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile responsiveness | Desktop-focused research tool |
| User accounts | Session-based ID tracking sufficient |
| Real-time streaming | Static dataset sufficient for thesis |
| Multiple datasets | Architecture extensible, Chicago only for thesis |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIN-01 to BIN-08 | Phase 61 | Complete |
| MANU-01 to MANU-06 | Phase 62 | Pending |
| MAP-01 to MAP-05 | Phase 63 | Pending |
| DASH-01 to DASH-05 | Phase 64 | Pending |
| STKD-01 to STKD-05 | Phase 65 | Pending |
| TEST-01 to TEST-05 | Phase 66 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after v3.0 milestone initialization*
