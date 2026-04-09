# Domain Pitfalls

**Domain:** Hotspot policing / crime analytics
**Researched:** 2026-04-09

## Critical Pitfalls

### 1) Treating heat as truth
**What goes wrong:** Analysts or commanders treat the hottest area as the correct action without checking why it is hot.
**Why it happens:** Maps are visually persuasive and easy to over-interpret.
**Consequences:** Misallocation, over-policing, and weak operational trust.
**Prevention:** Always pair maps with counts, trends, and rationale.

### 2) No baseline for intervention evaluation
**What goes wrong:** A patrol is credited or blamed without a proper comparison window.
**Why it happens:** Teams look at raw before/after counts.
**Consequences:** False claims of success or failure.
**Prevention:** Show baseline, trend, and matched comparison where possible.

### 3) Hotspots are unstable across time windows
**What goes wrong:** A place looks urgent in one week and disappears in the next.
**Why it happens:** Small numbers, seasonality, and recent spikes.
**Consequences:** Chasing noise.
**Prevention:** Show persistence and sensitivity to window size.

### 4) Displacement is ignored
**What goes wrong:** Crime may shift nearby after intervention, but the dashboard only reports the original zone.
**Why it happens:** The product tracks hotspots, not surrounding areas.
**Consequences:** A false sense of improvement.
**Prevention:** Include nearby-area monitoring and spillover checks.

### 5) The workflow stops at detection
**What goes wrong:** A hotspot list is produced but not turned into action or review.
**Why it happens:** Analysis tools often stop at visualization.
**Consequences:** Little operational value.
**Prevention:** Include briefing, assignment, and follow-up tracking.

## Moderate Pitfalls

### 6) Bad geography choices
**What goes wrong:** Grid size, beat boundaries, or buffers change the result too much.
**Prevention:** Let users compare units and record the selected geography.

### 7) Input quality issues
**What goes wrong:** Geocoding errors, duplicates, and missing times pollute results.
**Prevention:** Show data-quality flags and validation counts.

### 8) Overly aggressive automation
**What goes wrong:** The system recommends patrol actions without analyst review.
**Prevention:** Keep recommendations reviewable and overrideable.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Discovery | Heatmap over-trust | Add rank, counts, and explanations |
| Evaluation | No counterfactual | Show baseline and comparison periods |
| Briefing | Action gap | Add exportable notes and assignments |

## Sources

- NIJ hot spots policing topic: https://nij.ojp.gov/topics/articles/hot-spots-policing
- Campbell review: https://onlinelibrary.wiley.com/doi/10.4073/csr.2010.1
