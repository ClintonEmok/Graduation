# Architecture Patterns

**Domain:** Hotspot policing visual analytics
**Researched:** 2026-04-09

## Recommended Architecture

Use a **workflow-centered dashboard** with four layers:

1. **Data ingestion** - incident feeds, calls, offense categories, boundaries, patrol zones
2. **Analysis layer** - hotspot detection, temporal rollups, ranking, pre/post comparison
3. **Decision support layer** - explanations, priorities, intervention notes, briefing outputs
4. **Visualization layer** - map, timeline, ranked list, comparison panels, drill-down

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Ingestion | Clean, validate, and normalize incident data | Analysis layer |
| Hotspot engine | Rank places by density, persistence, and recent change | Decision support, visualization |
| Intervention tracker | Store patrol periods, notes, and outcomes | Comparison views |
| Map view | Show hotspots and jurisdictions | List, timeline, drill-down |
| Timeline view | Show trend, seasonality, and pre/post windows | Map, rankings |
| Briefing panel | Turn analysis into human-readable guidance | Command staff, export |

### Data Flow

1. Incidents arrive and are normalized to spatial units and time windows.
2. Hotspot scoring ranks places by current and persistent risk.
3. Analysts inspect a map, timeline, and ranked list to validate the signal.
4. A briefing or deployment note records the action.
5. Outcome metrics feed the next review cycle.

## Patterns to Follow

### Pattern 1: Place-first, not incident-first
Hotspots should be represented as areas, beats, grids, or segments rather than only individual dots.

### Pattern 2: Explainable ranking
Every hotspot score should expose why it was ranked: recency, repeat count, offense mix, stability, or trend.

### Pattern 3: Review loop
Analysis should end in a feedback artifact: deploy, monitor, and re-check.

### Pattern 4: Separate signal from intervention
The product should clearly distinguish “hotspot detected” from “patrol assigned.”

## Anti-Patterns to Avoid

### 1) Red-map certainty
**What:** Treating a heatmap as a final answer.
**Instead:** Pair it with ranked evidence, notes, and comparison views.

### 2) No baseline
**What:** Showing pre/post changes without a comparison period.
**Instead:** Use before/after windows and, when possible, a matched comparison.

### 3) Black-box scoring
**What:** Surfacing a list with no rationale.
**Instead:** Show inputs, weights, and thresholds.

### 4) One-off analysis
**What:** Generating hotspots without a follow-up loop.
**Instead:** Track outcomes and revisit ranks regularly.

## Scalability Considerations

| Concern | Small agency | Large city | Multi-year archive |
|---------|--------------|-----------|-------------------|
| Hotspot calc | Simple batch job | Incremental recompute | Cached rollups and partitions |
| Map rendering | Standard vector tiles | Clustered layers | Aggregated views by zoom level |
| Review workflow | Manual analyst review | Shift-based briefing | Auditable intervention history |

## Sources

- NIJ: https://nij.ojp.gov/topics/articles/hot-spots-policing
- Campbell review: https://onlinelibrary.wiley.com/doi/10.4073/csr.2010.1
