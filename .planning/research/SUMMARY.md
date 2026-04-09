# Research Summary: Hotspot Policing + Visual Analytics

**Domain:** Place-based policing / hotspot policing analytics
**Researched:** 2026-04-09
**Overall confidence:** MEDIUM

## Executive Summary

Hotspot policing is one of the clearest evidence-backed crime prevention strategies: crime is highly concentrated in small places, and targeted patrol or problem-solving at those places tends to outperform diffuse citywide responses. The operational workflow is not just “find a hot spot”; it is a loop of detect, validate, prioritize, deploy, brief, monitor, and re-evaluate.

Visual analytics helps most when it shortens that loop. Analysts need to move from incident clusters to place-based interpretation, compare places and times, show uncertainty, and communicate to commanders and officers what to do next. The product should therefore emphasize ranking, explanation, time windows, patrol readiness, and before/after monitoring rather than generic BI dashboards.

The major risk is false certainty. Hotspots can be artifacts of reporting volume, recency, or parameter choices; visual encodings can overstate precision; and “red areas” are easy to misread as the whole strategy rather than one input to operational decisions. Strong provenance, parameter transparency, and effect-size-oriented feedback are essential.

## Key Findings

### Core tasks

1. Find and rank candidate hotspots from recent incidents, calls, and repeats.
2. Validate whether a hotspot is stable, emerging, seasonal, or noise.
3. Compare places by crime type, time of day, repeat victimization, and trend.
4. Turn analysis into deployment guidance: where, when, how long, and with what intensity.
5. Monitor whether the intervention changed incidents or simply displaced them.

### Evidence-based policing considerations

- Hot spots policing is a place-based strategy, not a neighborhood-wide one.
- Short, focused deployments usually matter more than broad patrol expansion.
- Hotspots should be evaluated with counterfactual thinking: before/after alone is not enough.
- Analysts should separate detection from decision: a “hot” area still needs operational context.
- Changes in reporting, seasonality, and geography can create misleading apparent effects.

### Useful metrics and views

- Incident density, repeat counts, and rate per area/time.
- Trend change, recency-weighted counts, and persistence over rolling windows.
- Patrol coverage vs hotspot overlap.
- Pre/post intervention deltas, confidence bands, and displacement indicators.
- Ranked hotspot maps, time-of-day heatmaps, timeline strips, and place comparison tables.

### Product implication

Build a workflow that starts with hotspot discovery and ends with intervention tracking. The UI should help analysts explain why a place is on the list, what changed, and what action is recommended next.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core tasks | HIGH | Stable across hotspot policing literature and practice. |
| EBP considerations | MEDIUM | Well established, but exact thresholds and tactics vary by agency. |
| Metrics/views | HIGH | Common across crime analysis and command dashboards. |
| Product features | MEDIUM | Recommendations depend on whether the product supports analysis only or deployment workflow too. |

## Sources

- NIJ hot spots policing topic: https://nij.ojp.gov/topics/articles/hot-spots-policing
- CrimeSolutions hot spots policing record: https://crimesolutions.ojp.gov/
- Campbell Collaboration review: https://onlinelibrary.wiley.com/doi/10.4073/csr.2010.1
- DOJ COPS Office home: https://cops.usdoj.gov/

---
*Research completed: 2026-04-09*
