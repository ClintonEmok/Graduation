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
- **Progressive loading with virtualization**
  - Load reasonable sample initially (current 50k is good for visualization)
  - Add pagination or infinite scroll for full data access
  - Pre-compute aggregations at query time (bins, density) so frontend just renders
  - Cache metadata (date range, crime types) to avoid re-querying

### Rendering Approach
- **Level-of-detail (LOD) based on zoom level**
  - Zoomed out: Show density heat map only (already implemented)
  - Medium zoom: Show sampled points (e.g., every 100th point)
  - Zoomed in: Show all points in view
  - Use React.memo aggressively to prevent re-rendering unchanged components

### Acceptable Tradeoffs
- **Initial load**: < 3 seconds acceptable with 10-100k sample
- **Full data**: Accessible via "Load more" or zoom-to-detail
- **Freshness**: Cached aggregations OK, revalidate on filter change
- **Memory**: Keep under 500MB for initial load, load more on demand

### Claude's Discretion
- Exact sampling rate for medium zoom
- Specific virtualization library choice (react-window, react-virtuoso, or custom)
- Cache invalidation strategy
- Error handling for partial data loads

</decisions>

<specifics>
## Specific Ideas

- Use LOD based on timeline zoom level (already has density visualization from Phase 26)
- Pre-compute bins in DuckDB query rather than client-side (leverage server compute)
- Aggressive React.memo on timeline and map components

</specifics>

<deferred>
## Deferred Ideas

- Full 8.4M record export/download feature — future phase
- Real-time streaming updates — not needed for historical crime data

</deferred>

---

*Phase: 34-performance-optimization*
*Context gathered: 2026-02-22*
