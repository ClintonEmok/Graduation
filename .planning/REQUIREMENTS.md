# Requirements: Adaptive Space-Time Cube Prototype — v3.0

**Defined:** 2026-05-10
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns by making the timeline and 3D cube respond to burstiness — dense intervals expand, sparse intervals compress, and both surfaces stay synchronized.

## v3.0 Requirements

### Burstiness Engine (Phase 1)

- [ ] **BURST-01**: Server computes temporal B per time bin using CV of inter-event intervals
- [ ] **BURST-02**: Server optionally computes spatial B per bin (1 - meanKDE/peakKDE) as cross-reference
- [ ] **BURST-03**: Combined B = 0.5 × temporalB + 0.5 × spatialB is returned per bin
- [ ] **BURST-04**: Client allocates N target slices across bins proportional to combined B, with minimum 1 slice per bin

### UI Redesign (Phase 2)

- [ ] **UI-01**: WorkflowSkeleton removed from dashboard-demo shell
- [ ] **UI-02**: Viewport toggle switches between 2D map and 3D spatial view (instead of map/cube)
- [ ] **UI-03**: Right rail has exactly 5 tabs: Scan, Detect, Slices, Inspect, Configure
- [ ] **UI-04**: Applying slices auto-transitions to 3D view + Inspect tab

### STKDE-3D Port (Phase 3)

- [ ] **3D-01**: Demo3dSpatialView renders in 3D slot with R3F Canvas, camera, MapTileSource
- [ ] **3D-02**: Detect tab consolidates stepper generation controls + slice panel burst draft UI
- [ ] **3D-03**: Inspect tab provides scrubber, playback controls, slice labels, opacity

### Coordination Flow (Phase 4)

- [ ] **COORD-01**: computeSliceKde extracted to `src/lib/kde/` — shared between API route and 3D view
- [ ] **COORD-02**: workflowPhase removed from coordination store
- [ ] **COORD-03**: Apply action triggers viewport switch to 3D and rail switch to Inspect

## v2 Requirements (Previously Completed)

See `.planning/archive/REQUIREMENTS.md` for the full v1.x and v2.x requirement sets.
Key v2 milestones that remain in effect:

| Area | Requirements | Status |
|------|-------------|--------|
| Demo Stats + STKDE Wiring | DEMO-07 through DEMO-11 | Complete |
| Demo Timeline Polish | TPL-01 through TPL-05 | Complete |
| Dashboard-Demo Preset Thresholds | PTH-01 through PTH-05 | Complete |
| Workflow Isolation / Dashboard Handoff | FLOW-01 through FLOW-06 | Complete |
| Demo Timeline Rewrite | DTL-01 through DTL-05 | Complete |
| Clustering | CLUS-01 through CLUS-04 | Complete |
| Category Encoding | CAT-01 through CAT-03 | Complete |

## Out of Scope

| Feature | Reason |
|---------|--------|
| Burst taxonomy labels | Temporal B is the raw score; semantic labels are follow-up |
| Full-range generation | Current API sampling is sufficient for interactive use |
| Edit history / undo | Existing store snapshots provide basic undo |
| Mobile responsiveness | Desktop-focused research tool |
| User accounts | Not needed for internal prototype |
| Real-time streaming | Static dataset sufficient for thesis |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BURST-01 | Phase 1 | Pending |
| BURST-02 | Phase 1 | Pending |
| BURST-03 | Phase 1 | Pending |
| BURST-04 | Phase 1 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| 3D-01 | Phase 3 | Pending |
| 3D-02 | Phase 3 | Pending |
| 3D-03 | Phase 3 | Pending |
| COORD-01 | Phase 4 | Pending |
| COORD-02 | Phase 4 | Pending |
| COORD-03 | Phase 4 | Pending |

**Coverage:**
- v3.0 requirements: 14 total (4 + 4 + 3 + 3)
- Mapped to phases: 14
- Unmapped: 0 ✓

---

*Requirements defined: 2026-05-10*
