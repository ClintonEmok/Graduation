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

## Contextual Burstiness Comparison (Phase 83)

- [ ] **CBP-01**: Define the contextual burstiness metric as a deviation-from-baseline z-score using an hour×dayOfWeek expected-rate profile and a matching sigma profile derived from the same dataset.
- [ ] **CBP-02**: Re-implement Goh-Barabasi burstiness (B = (σ-μ)/(σ+μ) on inter-event times) over the same time windows so the contextual metric can be compared apples-to-apples against a standard reference.
- [ ] **CBP-07**: Implement density (events per second) over the same time windows as a second reference metric — the simplest "burst" signal, raw count normalized by window size.
- [ ] **CBP-08**: Implement the coefficient of variation of inter-event times (CV = σ_τ / μ_τ) over the same time windows as a third reference metric — the unbounded cousin of Goh-Barabasi B, isolating the effect of Goh's bounded denominator.
- [ ] **CBP-03**: Compare the per-window dynamic range (CV and range) of all 4 metrics (contextual z, Goh-Barabasi B, density, CV) across a 1h/6h/1d/1w window sweep on the 8.5M-record dataset, and show that the contextual metric has materially higher dynamic range than the best of the three reference metrics.
- [ ] **CBP-04**: Produce thesis-ready figures — an hour×dayOfWeek z-score heatmap, a 4-line per-window time series (z vs B, density, CV at 1d), and a 4×4 contrast table — all generated from a single reproducible Python script/notebook that reads from DuckDB.
- [ ] **CBP-05**: Make the comparison reproducible end-to-end with one run command and write a short decision gate that records whether (and where) the new metric should be wired into the dashboard-demo adaptive timeline. The gate uses a 4-way comparison: contextual must beat the *best* of the three reference metrics.
- [ ] **CBP-06**: Treat the prototype integration (TypeScript wiring, BFT-* requirements) as conditional on the decision-gate outcome from CBP-05; do not start BFT-01..BFT-12 work without that gate.

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BFT-01 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-02 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-03 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-04 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-05 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-06 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-07 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-08 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-09 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-10 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-11 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| BFT-12 | 84 | Deferred (pending Phase 83 CBP-05 decision) |
| CBP-01 | 83 | Planned |
| CBP-02 | 83 | Planned |
| CBP-07 | 83 | Planned |
| CBP-08 | 83 | Planned |
| CBP-03 | 83 | Planned |
| CBP-04 | 83 | Planned |
| CBP-05 | 83 | Planned |
| CBP-06 | 83 | Planned |

**Coverage:**
- Active requirements: 12 (BFT, deferred) + 8 (CBP, in progress) = 20
- Mapped to phases: 20
- Unmapped: 0 ✓
