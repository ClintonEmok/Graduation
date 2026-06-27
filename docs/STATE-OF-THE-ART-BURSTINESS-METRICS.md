# State of the Art — Burstiness Metrics for Spatiotemporal Data

**Purpose:** Reference document for the contextual z burstiness metric (Phase 83) and its place in the published literature. Use this when writing the thesis chapter on burstiness metrics and when framing any future publication.

**Status:** Verified 2026-06-27 via Google Scholar searches.

## The canonical reference

**Karsai, M., Jo, H.-H., & Kaski, K. (2018).** *Bursty Human Dynamics.* SpringerBriefs in Complexity. Springer Cham.
**DOI:** https://doi.org/10.1007/978-3-319-68540-3
**Springer link:** https://link.springer.com/book/10.1007/978-3-319-68540-3
**Format:** Softcover ISBN 978-3-319-68538-0 (published 13 December 2017); eBook ISBN 978-3-319-68540-3 (published 05 December 2017).
**Length:** XVI, 121 pages.
**Citations:** 134+ on Springer; ~226+ on Google Scholar (the 2017/2018 monograph is widely cited).
**Authors' institutions:** Karsai @ INRIA / ENS Lyon; Jo @ Asia Pacific Center for Theoretical Physics; Kaski @ Aalto University.

This is the **first monograph dedicated to bursty activity patterns in human dynamics**, written by three pioneers of the field. It is the standard reference for anyone publishing on burstiness metrics. Chapter 2 ("Measures and Characterisations", pp. 7-29) is the section to cite when defining B, CV, memory coefficient, and related measures.

**Why this matters for the thesis:** the contextual z metric is positioned as a *per-window deviation score* — a use case the Karsai monograph treats as a downstream application of the inter-event-time measures. Citing Karsai 2018 §2.1-§2.3 establishes that the field has the inter-event-time family (B, CV) and that contextual z extends the family to the per-window deviation axis.

## The four lines of related work

### 1. Burstiness metric theory (Karsai et al.)

- **Karsai, Jo, Kaski (2018) — "Bursty Human Dynamics"** (SpringerBriefs in Complexity). DOI: 10.1007/978-3-319-68540-3. **134+ citations.**
- **Karsai & Jo (2025) — "Measuring and modeling bursty human phenomena"** in *Handbook of Computational Social Science* (Elgar). Cited 2+ times so far. An updated survey that picks up the 2018-2024 extensions.

Chapter 2 formalizes B, CV, the memory coefficient M, and the bursty-train autocorrelation structure. Phase 83's contextual z extends the family with a per-window deviation metric. The natural framing for any paper: "Karsai et al. defined the inter-event-time family; we extend the family to a per-window deviation member."

### 2. Crime-specific point process models (LGCP, Hawkes)

For *generative* models of crime intensity, the field has two main approaches:

- **Log-Gaussian Cox Processes (LGCP):**
  - **Shirota, S. & Gelfand, A. E. (2017) — "Space and circular time log-Gaussian Cox processes with application to crime event data"**, *Annals of Applied Statistics* 11(2). 98 citations. The foundational LGCP-for-crime paper.
  - **Rodrigues, A. & Diggle, P. J. (2012) — "Bayesian estimation and prediction for inhomogeneous spatiotemporal log-Gaussian Cox processes, with application to criminal surveillance"**, *JASA* 107(497). 34 citations. Earlier LGCP-for-crime work.
  - **González, J. A., Mateu, J., Céspedes, N. E. et al. (2025) — "A doubly stochastic point process approach for spatio-temporal dynamics of crime data"**, *Statistical Modelling*. 3 citations. Recent extension.

- **Self-exciting (Hawkes) point processes:**
  - **Escudero, I., Angulo, J. M., Mateu, J. et al. (2025) — "Crime risk assessment through Cox and self-exciting spatio-temporal point processes"**, *Stochastic Environmental Research and Risk Assessment*. 9 citations. Pairs LGCP with Hawkes for crime.
  - **Mohler, G. O. et al. (2011, 2014)** — original Hawkes-for-crime papers. Not retrieved here but widely cited; see Mohler 2020 below for the unified view.

- **Comparative work:**
  - **Mohler, G., Porter, M., Carter, J., LaFree, G. (2020) — "Learning to rank spatio-temporal event hotspots"**, *Crime Science* 9(1). 30 citations. Compares KDE, LGCP, and self-exciting models for crime hotspot detection. This is the closest "which method wins" paper.

### 3. Inter-event-time burstiness (Goh-Barabási lineage)

- **Goh, K.-I. & Barabási, A.-L. (2008)** — original burstiness B = (σ_τ − μ_τ) / (σ_τ + μ_τ) definition. The Phase 83 Goh-Barabasi B is a direct port of this.
- Karsai 2018 §2 — formal treatment and critique of B (notably the boundedness issue that motivated Phase 83's comparison).

### 4. Spatiotemporal visualization (Bach et al., the space-time cube tradition)

- **Bach, B. et al. (2014, 2016)** — the space-time cube as an analytical lens. The Phase 83 prototype builds on this tradition via the existing `src/lib/adaptive/scaling.ts` and the dashboard-demo 3D visualization.
- Not retrieved in detail here; cited by the thesis via the dashboard-demo's design lineage.

## What contextual z is *not*

It is important to be clear about what contextual z does *not* claim:

1. **It is not a generative model.** Unlike LGCP and Hawkes, contextual z does not model the full event process. It scores individual windows.
2. **It is not a process-modelling contribution.** The Karsai 2018 monograph and Shirota & Gelfand 2017 are the process-modelling references. Contextual z is a *measurement* contribution.
3. **It is not a substitute for KDE-based hotspot detection.** KDE and contextual z answer different questions (spatial density vs. temporal deviation).
4. **It does not handle spatial burstiness.** Only the temporal axis is addressed. Spatial burstiness (a separate subfield) is out of scope.

## What contextual z *is* — the novel contribution

A per-window deviation metric for periodic spatiotemporal data, defined as:

```
z(window) = (observed_count − expected_count) / sqrt(expected_count)
```

where `expected_count` comes from a 168-cell (hour × dayOfWeek) conditional-rate baseline built from a long history. The metric:

- Is *periodic-aware*: Saturday night and Tuesday morning are scored against their own local expected counts, not the global mean.
- Is *interpretable as standardized units*: a Saturday night that is 2σ above its local expected is z ≈ +2.
- Has *bounded CV requirements*: under the global protocol, contextual z's std (9.18 at 1d) is 56.7× the median reference CV (0.16 at 1d), well above the pre-registered 2× threshold.
- Is *cheap to compute*: one baseline build + O(N) per-window score. No MCMC, no optimization.

This combination — periodic-awareness + per-window + cheap — does not appear in the existing literature. The closest is the "bursty trains" framework in Karsai 2018 ch. 3, which is *sequence-level* (not per-window) and *inter-event-time based* (not deviation-based).

## How the contextual z paper would be framed for publication

### Title (4-page VIS short paper option)
"Contextual Burstiness: A Per-Window Deviation Metric for Periodic Spatiotemporal Data"

### Related work positioning (§2)
1. Inter-event-time family — Karsai, Jo, Kaski 2018 ch. 2 (B, CV, memory coefficient)
2. Process models for crime — Shirota & Gelfand 2017; Rodrigues & Diggle 2012; Mohler et al. 2020
3. Spatiotemporal visualization — Bach et al.; the space-time cube tradition
4. **Gap:** no per-window deviation metric for periodic data with cheap computation

### Contribution (§1, §3)
- A per-window z-score against a 168-cell conditional-rate baseline
- Comparison to four reference metrics (B, density, CV, full-series B) on 8.5M Chicago crime events
- A pre-registered 2×/3× decision gate (median-CV primary, max-range primary, absolute-floor secondary)
- Single-week case study showing the visual difference (4-panel time series)
- Sensitivity analysis across global, cutoff, and expanding baseline protocols

### What needs to be done before submission (publication path)

1. **Cutoff / expanding sensitivity analysis** (~1-3h, see `docs/FUTURE-WORK-CONTEXTUAL-BURSTINESS-SENSITIVITY.md`)
2. **Second dataset validation** — NYC complaints data is the natural choice (~6M events, 2006-present, public on NYC Open Data, similar structure to Chicago)
3. **Computational cost profile** — measure Python vs. TypeScript per-window latency, document
4. **4-page paper writeup** — structure above, ~3 days
5. **User study** (optional, for full-paper submission) — n=10-20 with the prototype, ~2-3 months

## What was retracted from earlier drafts

A previous draft of this document (in conversation history, not in version control) cited a "Wang et al. 2023 on spatiotemporal burstiness for urban crime." This was a hallucinated citation. Scholar search returned no such paper. **The correct closest hits** in 2023 are Afyouni, Khan, Al Aghbari 2023 (E-ware, microblog events, not urban crime) and Yousaf et al. 2023 (textile industry, unrelated). The paper does not exist; do not cite it.

If a reviewer asks "how does this compare to recent work on burstiness in urban crime", the honest answer is: there is no published work on per-window deviation for periodic urban crime; the closest generative work is Shirota & Gelfand 2017 and the comparative study is Mohler et al. 2020. The contextual z contribution is positioned as a *measurement-time* alternative to the process-modelling tradition.

## File location

This document lives at: `docs/STATE-OF-THE-ART-BURSTINESS-METRICS.md`

For the burstiness chapter in the thesis, cite:

- Karsai, Jo, Kaski 2018 for the inter-event-time metric family
- Shirota & Gelfand 2017 for LGCP on crime
- Mohler et al. 2020 for the comparative-crime-hotspot-methods study
- Phase 83 (`docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md`) for the contextual z method
