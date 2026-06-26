# Milestone v3.4 Requirements: Burstiness-First Adaptive Timeline

**Generated:** 2026-06-26
**Status:** In progress

## Burstiness Signal Contract

- [ ] **BFT-01**: Make the adaptive warp configurable so it can use burstiness or density from one shared parameterized signal contract.
- [ ] **BFT-02**: Use burstiness as the default adaptive driver while keeping density available as an explicit fallback/compare path.
- [ ] **BFT-03**: Preserve the existing density-derived implementation so the new burstiness path does not discard prior work.

## Histogram Detail Behavior

- [ ] **BFT-04**: Keep the detail timeline histogram-based in both linear and adaptive modes.
- [ ] **BFT-05**: Express adaptive changes as bin spacing/aggregation changes rather than a points-mode switch.
- [ ] **BFT-06**: Keep the overview a stable linear/context frame while adaptive emphasis stays in the detail view.

## Burst Onset Readability

- [ ] **BFT-07**: Emphasize burst onset and ramp-up cues so analysts can answer “when did it start?” from the detail timeline.
- [ ] **BFT-08**: Make it clear when activity is building, peaking, or fading inside bursty intervals.
- [ ] **BFT-09**: Keep the synchronized map/cube/timeline context readable while the detail view is warped.

## Controls and Validation

- [ ] **BFT-10**: Expose a toggle or parameter for switching burstiness vs density weighting in the dashboard-demo timeline.
- [ ] **BFT-11**: Verify the density fallback still behaves as a supported mode after burstiness becomes the default.
- [ ] **BFT-12**: Keep the adaptive timeline compatible with the existing dashboard-demo workflow and current slice inspection flow.

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BFT-01 | 83 | Planned |
| BFT-02 | 83 | Planned |
| BFT-03 | 83 | Planned |
| BFT-04 | 84 | Planned |
| BFT-05 | 84 | Planned |
| BFT-06 | 84 | Planned |
| BFT-07 | 85 | Planned |
| BFT-08 | 85 | Planned |
| BFT-09 | 85 | Planned |
| BFT-10 | 85 | Planned |
| BFT-11 | 85 | Planned |
| BFT-12 | 85 | Planned |

**Coverage:**
- Active requirements: 12
- Mapped to phases: 12
- Unmapped: 0 ✓
