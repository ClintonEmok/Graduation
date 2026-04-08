# Requirements: Adaptive Space-Time Cube v3.0

**Defined:** 2026-03-25
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## v3.0 Requirements

### Binning (Phase 61 — Complete)

- [x] **BIN-01**: User can select from 13 binning strategies (daytime-heavy, nighttime-heavy, crime-type-specific, burstiness, uniform-distribution, uniform-time, weekday-weekend, quarter-hourly, hourly, daily, weekly, custom, auto-adaptive)
- [x] **BIN-02**: User can merge adjacent bins
- [x] **BIN-03**: User can split bins
- [x] **BIN-04**: User can delete bins
- [x] **BIN-05**: User can resize bins
- [x] **BIN-06**: User can save/load binning configurations
- [x] **BIN-07**: User can undo/reset binning changes
- [x] **BIN-08**: Constraints validated (minEvents, maxEvents, maxBins, contiguous)

### Constraint-Driven Generation and Review-to-Apply (Phase 62)

- [ ] **GEN-01**: User can generate bins from selected crime type filters
- [ ] **GEN-02**: User can generate bins using neighbourhood context
- [ ] **GEN-03**: User can generate bins within a user-defined time window
- [ ] **GEN-04**: User can choose granularity such as hourly or daily without relying on a fixed bin count
- [ ] **GEN-05**: Generated bins are the default first result shown to the user
- [ ] **GEN-06**: User can review generated bins and apply them into the unified `dashboard-v2` workflow in one clear step

### Manual Refinement and Adaptive Burst Emphasis (Phase 63)

- [ ] **MAN-01**: User can manually adjust generated slices after generation
- [ ] **MAN-02**: Manual editing supports precise boundary changes without breaking the main workflow
- [ ] **MAN-03**: Burst periods can be represented with narrower or more focused generated slices when appropriate
- [ ] **MAN-04**: Adaptive mode visually expands burst-heavy periods more aggressively for investigation
- [ ] **MAN-05**: Manual refinement is delivered inside `dashboard-v2` while remaining synchronized with the generated/apply workflow

### Cross-View Synchronization and Workflow Dashboard (Phase 64)

- [ ] **SYNC-01**: Applied slices appear clearly on the `dashboard-v2` timeline
- [ ] **SYNC-02**: Applied slices drive the `dashboard-v2` 2D map and heatmap views coherently
- [ ] **SYNC-03**: Applied slices are visible and synchronized in the `dashboard-v2` 3D cube
- [ ] **SYNC-04**: `dashboard-v2` clearly communicates current workflow state (generate, review, applied, refine)
- [ ] **SYNC-05**: Current strategy, granularity, and active slice set are easy to understand at a glance in `dashboard-v2`

### STKDE Integration (Phase 65)

- [ ] **STKD-01**: Kernel density estimation overlay available during slice-based investigation
- [ ] **STKD-02**: Hotspot detection panel shows high-density areas with useful investigation context
- [ ] **STKD-03**: Heatmap integration works inside the unified `dashboard-v2` workflow
- [ ] **STKD-04**: STKDE results are visible in the 3D cube view
- [ ] **STKD-05**: User can switch between standard slice views and STKDE-enhanced analysis

### Full Workflow Hardening and Validation (Phase 66)

- [ ] **FLOW-01**: End-to-end generate-review-apply workflow tests pass for `dashboard-v2`
- [ ] **FLOW-02**: Manual refinement after generation works correctly
- [ ] **FLOW-03**: State stays synchronized across the `dashboard-v2` timeline, map, heatmap, dashboard panels, and cube
- [ ] **FLOW-04**: Performance benchmarks meet interactive-use targets
- [ ] **FLOW-05**: Empty, low-confidence, and error states are handled clearly
- [ ] **FLOW-06**: The unified `dashboard-v2` prototype is stable enough for evaluation and further research use

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
| BIN-01 | Phase 61 | Complete |
| BIN-02 | Phase 61 | Complete |
| BIN-03 | Phase 61 | Complete |
| BIN-04 | Phase 61 | Complete |
| BIN-05 | Phase 61 | Complete |
| BIN-06 | Phase 61 | Complete |
| BIN-07 | Phase 61 | Complete |
| BIN-08 | Phase 61 | Complete |
| GEN-01 | Phase 62 | Pending |
| GEN-02 | Phase 62 | Pending |
| GEN-03 | Phase 62 | Pending |
| GEN-04 | Phase 62 | Pending |
| GEN-05 | Phase 62 | Pending |
| GEN-06 | Phase 62 | Pending |
| MAN-01 | Phase 63 | Pending |
| MAN-02 | Phase 63 | Pending |
| MAN-03 | Phase 63 | Pending |
| MAN-04 | Phase 63 | Pending |
| MAN-05 | Phase 63 | Pending |
| SYNC-01 | Phase 64 | Pending |
| SYNC-02 | Phase 64 | Pending |
| SYNC-03 | Phase 64 | Pending |
| SYNC-04 | Phase 64 | Pending |
| SYNC-05 | Phase 64 | Pending |
| STKD-01 | Phase 65 | Pending |
| STKD-02 | Phase 65 | Pending |
| STKD-03 | Phase 65 | Pending |
| STKD-04 | Phase 65 | Pending |
| STKD-05 | Phase 65 | Pending |
| FLOW-01 | Phase 66 | Pending |
| FLOW-02 | Phase 66 | Pending |
| FLOW-03 | Phase 66 | Pending |
| FLOW-04 | Phase 66 | Pending |
| FLOW-05 | Phase 66 | Pending |
| FLOW-06 | Phase 66 | Pending |

**Coverage:**
- v3.0 requirements: 35 total (8 + 6 + 5 + 5 + 5 + 6)
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-26 after aligning v3.0 requirements to dashboard-v2 as the single unified route*
