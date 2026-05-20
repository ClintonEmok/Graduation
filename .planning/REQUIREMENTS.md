# Requirements: Adaptive Space-Time Cube Prototype — v3.1

**Defined:** 2026-05-19
**Core Value:** Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized exploration tool.

## v3.1 Requirements

### FLOW-07

Detect is the obvious entry point for burst scanning and slice generation.

### FLOW-08

Slices is the obvious review/apply surface for pending and manual slices.

### FLOW-09

Inspect shows active slice state and comparison controls immediately.

### FLOW-10

Map, cube, and timeline stay synchronized with the active slice while chrome stays minimal.

## Active Requirements

- FLOW-08
- FLOW-09
- FLOW-10

## Completed Requirements

- FLOW-07

## v3.0 Requirements (Completed)

The v3.0 milestone is complete. See `.planning/archive/REQUIREMENTS.md` and `.planning/v3.0-MILESTONE-AUDIT.md` for the completed burstiness-driven adaptive slicing scope.

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
| FLOW-07 | 72 | Complete |
| FLOW-08 | 72 | Planned |
| FLOW-09 | 73 | Planned |
| FLOW-10 | 74 | Planned |

**Coverage:**
- Active requirements: 4
- Mapped to phases: 4
- Unmapped: 0 ✓

---

*Requirements defined: 2026-05-19*
