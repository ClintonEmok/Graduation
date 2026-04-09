# Feature Landscape

**Domain:** Hotspot policing / crime analytics
**Researched:** 2026-04-09

## Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hotspot map | Core way to see place-based concentration | Medium | Needs clear legends and ranking |
| Time filter / sliding window | Crime patterns shift over time | Medium | Daily/weekly/monthly views are common |
| Incident density / repeat count views | Basic evidence for priority setting | Low | Should support drill-down |
| Comparison by beat / district / zone | Operational planning happens by area | Medium | Align to police boundaries |
| Incident detail drill-down | Analysts must inspect what drives a hotspot | Medium | Show offense type, time, location, repeats |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Persistence ranking | Shows not just hot now, but hot repeatedly | High | Very useful for prioritization |
| Pre/post intervention tracking | Helps evaluate whether patrol changed outcomes | High | Needs baseline and control periods |
| Patrol overlap / coverage view | Links analysis to deployment feasibility | High | Useful for commanders |
| Explainable hotspot ranking | Builds trust in why a place is surfaced | High | Show factors, weights, and time window |
| Displacement / spillover check | Detects whether crime moved nearby | High | Important for evidence-based evaluation |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Generic BI charts only | They don’t support tactical decisions | Use place-based, time-aware views |
| “Red map = answer” UI | Encourages over-trust in a single layer | Show rationale and supporting views |
| Endless alerting | Analysts need prioritization, not noise | Batch reviews into shifts or briefings |
| Black-box scoring | Hard to defend operationally | Keep scoring explainable |
| Full case management | Changes the product into an ops system | Stay focused on analysis + briefing |

## Feature Dependencies

```
Incident data -> hotspot ranking -> compare/validate -> brief deployment
Hotspot map + timeline -> analyst review
Explainability + provenance -> command trust
Pre/post tracking + coverage -> intervention evaluation
```

## MVP Recommendation

1. Hotspot map with time filter
2. Ranked list + drill-down
3. Compare and annotate places for briefing

Defer:
- Displacement analysis: needs more data and careful interpretation
- Automated patrol optimization: easy to overpromise and hard to validate

## Sources

- NIJ hot spots policing topic: https://nij.ojp.gov/topics/articles/hot-spots-policing
- CrimeSolutions: https://crimesolutions.ojp.gov/
- Campbell review: https://onlinelibrary.wiley.com/doi/10.4073/csr.2010.1
