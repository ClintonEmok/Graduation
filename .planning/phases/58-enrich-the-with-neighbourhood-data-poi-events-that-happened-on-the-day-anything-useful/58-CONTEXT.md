# Phase 58: enrich the with neighbourhood data poi events that happened on the day anything useful - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrich timeslicing analysis with neighbourhood data (POI events) that occurred on the same day as the selected time period. This adds external context to help validate or discover timeslicing patterns.

</domain>

<decisions>
## Implementation Decisions

### Data sources
- Primary: OpenStreetMap points of interest (restaurants, bars, shops, parks, schools, etc.)
- Secondary: Chicago open data (land use, business, community places)
- Fetch all available data types that can provide useful neighbourhood context

### UI presentation
- Integrated into existing diagnostics infrastructure in `/timeslicing-algos` (reusing established pattern from Phase 57)
- Neighbourhood context appears alongside temporal/spatial diagnostics
- Compact summary by default, expandable for details

### Trigger timing
- Fetch on-demand during suggestion generation (keeps initial load fast, data available when reviewing proposals)
- Allow manual refresh capability

### Fallback handling
- Show notice in the neighbourhood section when data is unavailable
- Keep other features working - neighbourhood is enrichment, not required for core functionality

### Claude's Discretion
- Exact API endpoints and query parameters for OSM/Chicago data
- Specific neighbourhood metric calculations and aggregations
- Exact UI component implementation and styling
- Caching strategy for neighbourhood data

</decisions>

</specifics>

## Existing Code Insights

### Reusable Assets
- `src/hooks/useContextExtractor.ts`: Existing context extraction foundation to extend with neighbourhood data
- `src/hooks/useSuggestionGenerator.ts`: Suggestion generation path where neighbourhood context can be integrated
- `src/app/timeslicing-algos/`: Existing diagnostics infrastructure to extend
- Phase 57 diagnostics pattern as template for neighbourhood section

### Established Patterns
- Route-local diagnostics pattern from `/timeslicing-algos`
- Backward-compatible additive features (existing functionality preserved)
- Compact summary + expandable details pattern from Phase 57
- Explicit fallback states for partial failures

### Integration Points
- Extend existing context extraction in `useContextExtractor.ts`
- Add neighbourhood section to suggestion metadata
- Wire into `/timeslicing-algos` diagnostics panel

</code_context>

<deferred>
## Deferred Ideas

- Real-time event data (requires external API integration beyond OSM/chicago data)
- Historical comparison of neighbourhood patterns over time
- Neighbourhood-based ranking/filtering of suggestions

</deferred>

---

*Phase: 58-enrich-the-with-neighbourhood-data-poi-events-that-happened-on-the-day-anything-useful*
*Context gathered: 2026-03-20*