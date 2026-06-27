# Contextual Burstiness: A Mental Model Shift

## The Problem with Goh-Barabási for Crime

The project has been built on the Goh-Barabási burstiness coefficient:

```
B = (σ - μ) / (σ + μ)    ∈ [-1, 1]
```

This measures **irregularity of inter-event times** within a bin. It works well for:
- Email correspondence (long silences, then bursts of replies)
- Earthquake aftershock sequences
- Financial trade arrivals

It works poorly for crime because crime is **quasi-periodic** — inter-event gaps within a bin are relatively uniform (same cadence). So `σ ≈ μ` and `B ≈ 0` in most bins, even when the bin's *total count* is anomalously high compared to what's expected for that time of day.

## The Discovery

Crime data isn't bursty in the Goh-Barabási sense. It's **contextually anomalous**.

A Saturday night downtown with 50 incidents is normal.
A Tuesday 3am with 15 incidents is a genuine outlier.
The Goh-Barabási coefficient inside each bin cannot tell the difference.

The temporal behavior of crime is dominated by:
- **Daily cycles** (evening > morning)
- **Weekly cycles** (weekend > weekday)
- **Seasonal effects** (summer vs winter)
- **Special events** (holidays, festivals)

Goh-Barabási is blind to all of these because it only looks at gaps, not at the expected rate.

## The Reframing

Replace the question "is this bin's inter-event timing irregular?" with:

**"Does this bin deviate from what's expected for its temporal context?"**

This is not burstiness — it's **contextual anomaly scoring**. The signal is density residuals after accounting for expected periodic patterns.

## Candidate Approaches

| Approach | Formula | What it captures |
|---|---|---|
| **Density ratio** | `count(bin) / baseline(bin)` where baseline = rolling average of same hour+day-of-week | Deviation from expected periodic rate |
| **Rate change** | `\|count(bin) - count(bin-1)\|` | Abrupt changes between adjacent bins |
| **Density percentile** | rank of `count(bin)` within all bins of same hour+day-of-week slot | How extreme this bin is for its slot |
| **Z-score** | `(count(bin) - μ_slot) / σ_slot` | Standardized deviation from slot mean |
| **Log-density ratio** | `log(count(bin) / baseline(bin))` | Symmetric ratio (under- and over-density) |

All of these replace the within-bin inter-event analysis with a **cross-bin comparison** — comparing each bin to its temporal peers rather than analyzing its internal structure.

## Implications

**For the warp map** (`adaptiveTime.worker.ts`): The temporal weight signal would shift from Goh-Barabási-based burstiness to a contextual anomaly score. The `burstinessMap` becomes an `anomalyMap` — per-bin deviation from expected rate. The `burstInfluence` slider still works; it just blends density with anomaly instead of density with burstiness.

**For burst detection** (`burst-detection.ts`, API): The "temporal burst" component no longer computes Goh-Barabási on inter-event gaps. Instead it compares per-bin density against a time-of-week expected baseline and returns the deviation as the temporal burst score.

**For the taxonomy** (`burst-taxonomy.ts`): The classification rules stay similar (prolonged-peak, isolated-spike, valley, neutral) but the input `value` is now a contextual anomaly score rather than a Goh-Barabási coefficient.

**For the user**: The axis label changes from "burstiness" to "anomaly" or "deviation from expected." The mental model shifts from "erratic timing" to "unusual density for this time slot."

## What This Doesn't Change

- **Spatial burstiness** remains valid — spatial concentration is a different problem.
- **Density** stays as-is (it's always been just counts).
- **Combined scoring** still blends temporal + spatial.
- **The user-facing workflow** (detect anomalies → scale → inspect) is the same — only the underlying formula changes.

## Sources & Supporting Literature

The following sources inform and support the contextual anomaly framing:

### Foundational burstiness measure (the one we critique)
- **Goh, K.-I., & Barabási, A.-L. (2008).** *Burstiness and memory in complex systems.* Europhysics Letters, 81(4), 48002. https://doi.org/10.1209/0295-5075/81/48002 — *Cited 532×. The standard B coefficient. Designed for heavy-tailed inter-event distributions (email, earthquakes), not periodic processes.*

### Direct evidence: periodic patterns modulate burstiness
- **Jo, H.-H., Karsai, M., Kertész, J., & Kaski, K. (2012).** *Circadian pattern and burstiness in mobile phone communication.* New Journal of Physics, 14(1), 013055. https://doi.org/10.1088/1367-2630/14/1/013055 — *Cited 158×. Shows that circadian rhythms create periodic inter-event patterns that interact with burstiness — the measure conflates periodic activity with genuine irregularity. Directly supports the need to detrend or control for expected temporal patterns before measuring burstiness.*

### Crime temporal patterns — routine activity theory
- **Cohen, L. E., & Felson, M. (1979).** *Social change and crime rate trends: A routine activity approach.* American Sociological Review, 44(4), 588–608. — *Foundational. Crime requires a motivated offender, suitable target, and absent guardian — all of which vary predictably by time of day and day of week.*
- **Ratcliffe, J. H. (2006).** *A temporal constraint theory to explain opportunity-based spatial offending patterns.* Journal of Research in Crime and Delinquency, 43(3), 201–222. https://doi.org/10.1177/0022427806286566 — *Cited 201×. Introduces temporal constraints on offender mobility — not all times are equally available for crime. The baseline expectation of crime varies systematically by time.*
- **van Sleeuwen, S. E. M., Ruiter, S., & Steenbeek, W. (2021).** *Right place, right time? Making crime pattern theory time-specific.* Crime Science, 10(1), 1–13. https://doi.org/10.1186/s40163-021-00139-8 — *Cited 31×. Argues that crime pattern theory must be time-specific — the same location has different risk levels at different times. Supports per-time-slot baselines.*
- **Newton, A., & Felson, M. (2015).** *Editorial: Crime patterns in time and space: the dynamics of crime opportunities in urban areas.* Crime Science, 4(1), 1–5. https://doi.org/10.1186/s40163-015-0025-6 — *Cited 61×. Position paper on spatiotemporal crime dynamics.*

### Crime spatiotemporal analysis & baselines
- **Nakaya, T., & Yano, K. (2010).** *Visualising crime clusters in a space-time cube: An exploratory data-analysis approach using space-time kernel density estimation and scan statistics.* Transactions in GIS, 14(3), 223–239. https://doi.org/10.1111/j.1467-9671.2010.01194.x — *Cited 318×. The space-time cube approach for crime — the methodological foundation our prototype builds on.*
- **Malleson, N., & Andresen, M. A. (2015).** *Spatio-temporal crime hotspots and the ambient population.* Crime Science, 4(1), 1–8. https://doi.org/10.1186/s40163-015-0023-8 — *Cited 133×. Shows that crime hotspot detection changes when you account for ambient population, which varies by time of day — the expected crime rate is not uniform.*
- **Caplan, J. M., & Kennedy, L. W. (2016).** *Risk Terrain Modeling: Crime Prediction and Risk Reduction.* University of California Press. — *Risk terrain modeling framework that compares observed crime against expected environmental risk — a baseline-comparison approach analogous to our contextual anomaly framing.*
- **Herrmann, C. R. (2015).** *The dynamics of robbery and violence hot spots.* Crime Science, 4(1), 1–14. https://doi.org/10.1186/s40163-015-0042-5 — *Cited 39×. Demonstrates that crime hotspots have temporal pulses — they are not static; their intensity varies by hour and day. Supports per-slot baseline thinking.*
- **Johnson, S. D., Summers, L., & Pease, K. (2008).** *Offender as forager? A direct test of the boost account of victimization.* Journal of Quantitative Criminology, 25(1), 61–84. https://doi.org/10.1007/s10940-008-9060-8 — *Cited 197×. Near-repeat victimization shows temporal clustering — but this is different from burstiness; it's a behavioral contagion effect with an expected decay curve, not irregular inter-event gaps.*

### Summary
The Goh-Barabási coefficient (2008) assumes a null model of Poisson-like regularity. Crime data exhibits **strong periodic structure** (Cohen & Felson 1979, Ratcliffe 2006) that violates this null. Jo et al. (2012) directly demonstrate that circadian rhythms produce spurious burstiness signals. The solution — comparing observed density against time-of-slot baselines — aligns with routine activity theory (van Sleeuwen et al. 2021) and ambient population methods (Malleson & Andresen 2015). The space-time cube visualization itself (Nakaya & Yano 2010) supports this framing by making temporal patterns visible at the slot level.

## Corroboration with Domain Expert

The military contact can help validate this reframing from an operational intelligence perspective. Suggested discussion points:

1. **Periodic patterns as baseline** — In military intelligence analysis, is "normal activity" always defined relative to expected patterns (time of day, day of week, known schedules), not absolute volume?
2. **Anomaly vs. burst** — Does the intelligence community distinguish between "bursty communication" (irregular gaps) and "anomalous activity" (deviation from expected pattern)? Which is more operationally relevant?
3. **Expected activity baselines** — How are baselines for "normal activity" constructed in practice? Rolling windows? Historical averages for the same time slot? A combination?
4. **Spatiotemporal context** — When analyzing patterns of events (crime, insurgent activity, logistics), is the contextual baseline always time-of-day and day-of-week aware, or is absolute rate ever sufficient?
5. **Practical framing** — Would the concept of "contextual anomaly score" (how unusual is this bin for its usual pattern) resonate more with analysts than "burstiness" (how irregular are the gaps)?

## Status

Mental model only. Not implemented. This note exists to capture the discovery — and its supporting evidence — before we decide whether and how to act on it.
