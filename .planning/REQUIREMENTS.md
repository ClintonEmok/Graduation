# Requirements: v2.0 Cube-First Space-Time Slicing Sandbox

**Milestone:** v2.0  
**Defined:** 2026-03-05  
**Core Value:** Users can create, test, and validate space-time slicing directly in a dedicated 3D sandbox route, with timeline/map integration deferred unless needed for cube outcomes.

## v2.0 Requirements

### Sandbox Route Foundation

- [ ] **ROUTE-01**: A dedicated route exists for 3D timeslicing sandbox workflows (separate from production analysis routes)
- [ ] **ROUTE-02**: Sandbox route can load with thesis-scale default dataset and initial cube state without full-app dependency coupling
- [ ] **ROUTE-03**: Sandbox route exposes active context (dataset, filters, spatial bounds, warp mode) in a compact debug panel
- [ ] **ROUTE-04**: Sandbox state resets/reloads safely for rapid experimentation in one session

### Cube Spatial Context Setup

- [ ] **CSPAT-01**: User can define one or more spatial constraint regions for the cube workflow (selection, polygon, or named zone)
- [ ] **CSPAT-02**: Spatial constraints can be enabled or disabled without losing definitions
- [ ] **CSPAT-03**: Constraint definitions are visible as first-class indicators inside cube interactions
- [ ] **CSPAT-04**: Constraint configuration persists during sandbox session interactions

### Cube-Constrained Warp Proposals

- [ ] **CWARP-01**: System can generate adaptive warp proposals that prioritize selected cube spatial constraints
- [ ] **CWARP-02**: Warp proposal details include rationale indicators (for example: density concentration, hotspot coverage)
- [ ] **CWARP-03**: User can apply a proposal and immediately see updated temporal deformation on cube axes

### Cube-Aware Interval Proposals

- [ ] **CINTV-01**: System proposes slice intervals that account for temporal bursts within selected cube spatial context
- [ ] **CINTV-02**: Proposed intervals include confidence or quality signals
- [ ] **CINTV-03**: User can edit proposal boundaries while preserving constraint-awareness feedback

### Cube-First Validation Loop

- [ ] **CVAL-01**: Selecting a proposed or accepted slice highlights relevant events consistently in cube views/panels
- [ ] **CVAL-02**: Changing slice state (accepted/rejected/edited) updates cube visual state within one interaction cycle
- [ ] **CVAL-03**: User can compare uniform vs adaptive cube representations with overlays kept aligned

### Review Workflow

- [ ] **REVIEW-01**: User can accept, modify, or reject each proposed warp/interval item
- [ ] **REVIEW-02**: Review state is visible as a list with status markers and quick navigation
- [ ] **REVIEW-03**: User can revert the latest review action without losing proposal provenance

### Cube Diagnostics and Analytics

- [ ] **DIAG-01**: User can view per-slice spatial diagnostics (coverage by area/cluster)
- [ ] **DIAG-02**: User can inspect how accepted slices differ from baseline uniform slicing metrics
- [ ] **DIAG-03**: Diagnostics can be filtered by active data context (for example crime category)

### Quality and Responsiveness

- [ ] **QUAL-01**: Proposal generation and first render complete quickly enough for interactive use (< 2s target under thesis dataset scale)
- [ ] **QUAL-02**: Slice edits and cube highlight updates feel real-time (< 100ms target for direct manipulation)
- [ ] **QUAL-03**: Workflow remains usable with at least 100 proposal/slice items without blocking UI interactions

## Out of Scope (v2.0)

| Feature | Reason |
|---------|--------|
| Full timeline-map-cube parity by default | v2.0 is cube-first; broad parity can be added later if needed |
| Multi-dataset switching UX | Defer until cube sandbox behavior stabilizes |
| Real-time streaming ingestion | Thesis workflow uses static prepared datasets |
| Multi-user collaboration | Single-user analysis workflow is sufficient |
| Cloud persistence/account system | Session-first local workflow remains adequate |
| Mobile optimization | Desktop research tool remains priority |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUTE-01 | Phase 43 | Pending |
| ROUTE-02 | Phase 43 | Pending |
| ROUTE-03 | Phase 43 | Pending |
| ROUTE-04 | Phase 43 | Pending |
| CSPAT-01 | Phase 44 | Pending |
| CSPAT-02 | Phase 44 | Pending |
| CSPAT-03 | Phase 44 | Pending |
| CSPAT-04 | Phase 44 | Pending |
| CWARP-01 | Phase 45 | Pending |
| CWARP-02 | Phase 45 | Pending |
| CWARP-03 | Phase 45 | Pending |
| CINTV-01 | Phase 46 | Pending |
| CINTV-02 | Phase 46 | Pending |
| CINTV-03 | Phase 46 | Pending |
| CVAL-01 | Phase 47 | Pending |
| CVAL-02 | Phase 47 | Pending |
| CVAL-03 | Phase 47 | Pending |
| REVIEW-01 | Phase 48 | Pending |
| REVIEW-02 | Phase 48 | Pending |
| REVIEW-03 | Phase 48 | Pending |
| DIAG-01 | Phase 49 | Pending |
| DIAG-02 | Phase 49 | Pending |
| DIAG-03 | Phase 49 | Pending |
| QUAL-01 | Phase 50 | Pending |
| QUAL-02 | Phase 50 | Pending |
| QUAL-03 | Phase 50 | Pending |

---

*Requirements for v2.0 Cube-First Space-Time Slicing Sandbox milestone*
