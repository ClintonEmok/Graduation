# Phase 34: Performance Optimization - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize data loading and rendering for 8.4M record dataset. Target: initial load < 3s, 30+ fps, filter changes < 500ms, memory < 2GB.

</domain>

<decisions>
## Implementation Decisions

### Primary Bottleneck Focus
- **Start with data loading + rendering** — these affect user experience most directly
- Current setup loads 50k via stream API; real bottlenecks are API response time and React re-renders

### Data Loading Strategy
- **Viewport-based infinite loading** (NOT React.memo - that doesn't help with large datasets)
  - Fetch data only when timeline viewport needs it
  - If user is looking at 2005-2010, don't load 2015-2020
  - Prune data when it leaves viewport to free memory
  - Add buffer zones (load data before/after visible range for smooth scrolling)
  - Pre-compute aggregations at query time (bins, density) so frontend just renders

### Density Calculation
- **Two levels of density** (resampling approach):
  1. **Global density** — pre-computed from full 8.4M dataset
     - Computed server-side (DuckDB) on load/filter change
     - Used for timeslicing (always accurate regardless of viewport)
     - Small payload: just bucket counts
  2. **Viewport density** — computed from loaded viewport points
     - Used for local detail when zoomed in
     - Recalculates as user pans/zooms within loaded data
- Timeslicing always uses global density (full dataset)
- Visualization uses whichever density is appropriate for zoom level
- **Level-of-detail (LOD) based on zoom level**
  - Zoomed out: Show density heat map only (already implemented from Phase 26)
  - Medium zoom: Show sampled points (e.g., every 100th point)
  - Zoomed in: Show all points in view
- Virtualization for list/grid components (react-window or similar)

### Acceptable Tradeoffs
- **Initial load**: < 3 seconds acceptable with 10-100k sample
- **Full data**: Loaded progressively as user navigates timeline
- **Freshness**: Cached aggregations OK, revalidate on filter change
- **Memory**: Keep under 500MB, prune aggressively as user navigates

### Claude's Discretion
- Exact buffer size before/after viewport
- Specific virtualization library choice
- Cache invalidation strategy
- Error handling for partial data loads

</decisions>

<specifics>
## Specific Ideas

- Viewport-based loading: fetch only visible time range + buffer
- Prune data when it leaves viewport (free memory)
- LOD based on timeline zoom level (already has density visualization from Phase 26)
- Pre-compute bins in DuckDB query rather than client-side

</specifics>

<deferred>
## Deferred Ideas

- Full 8.4M record export/download feature — future phase
- Real-time streaming updates — not needed for historical crime data

</deferred>

---

*Phase: 34-performance-optimization*
*Context gathered: 2026-02-22*
