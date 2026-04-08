# Phase 59: Add Stats Page for Neighborhoods - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** User request + Research

---

<domain>

## Phase Boundary

This phase delivers a dedicated `/stats` route for the Neon Tiger crime visualization app that shows neighborhood crime statistics, patterns, and behaviors. 

**What this phase delivers:**
- A standalone stats dashboard at `/stats` (isolated from main dashboard)
- Neighborhood crime statistics with district-level breakdowns
- Crime type distribution analysis
- Temporal pattern visualizations (time of day, day of week)
- Spatial hotspot maps with drill-down capability
- Integration with existing neighbourhood/OSM data

**What this phase does NOT deliver:**
- Changes to main dashboard `/dashboard`
- Integration with slice/suggestion workflows
- Real-time streaming updates
- User authentication/personalization

</domain>

<decisions>

## Implementation Decisions

### Route Structure
- Create standalone `/stats` route following `/timeslicing-algos` shell pattern
- Route-local state via Zustand (no shared store with dashboard)
- Independent time range selector (does not sync with dashboard)

### Data Access
- Reuse `useCrimeData` hook with district filtering
- Reuse existing context-diagnostics modules for temporal/spatial summaries
- Reuse `buildNeighbourhoodSummary` for POI context
- Consider server-side aggregation via DuckDB for performance

### UI Components
- Use Visx for charts (consistent with existing timeline components)
- Use MapLibre for spatial hotspot visualization
- Use Radix UI primitives for selectors and accordions
- Follow existing dark theme pattern (`bg-black text-white`)

### Crime Analysis Metrics
- **Crime Type Distribution:** Top crimes per neighborhood with counts/percentages
- **Temporal Patterns:** Time-of-day distribution, day-of-week trends
- **Spatial Hotspots:** Grid-based aggregation with interactive map
- **Neighbourhood Context:** POI density correlated with crime patterns

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Route Patterns
- `src/app/timeslicing-algos/lib/TimeslicingAlgosRouteShell.tsx` — Route shell pattern
- `src/app/stkde/lib/StkdeRouteShell.tsx` — Another route shell example

### Data Hooks
- `src/hooks/useCrimeData.ts` — Crime data fetching hook
- `src/lib/context-diagnostics/index.ts` — Temporal/spatial summary builders

### Neighbourhood Data
- `src/lib/neighbourhood/index.ts` — POI and neighbourhood summary building
- `src/lib/context-diagnostics/spatial.ts` — Spatial hotspot aggregation

### Type Definitions
- `src/types/crime.ts` — CrimeRecord interface
- `src/lib/category-maps.ts` — Crime types and districts constants

### Existing Route
- `src/app/dashboard/page.tsx` — Dashboard layout reference

</canonical_refs>

<specifics>

## Specific Ideas

1. **Neighborhood Selector:**
   - Multi-select dropdown for districts 1-25
   - "All Districts" toggle for city-wide view
   - District chips with crime count badges

2. **Crime Type Breakdown:**
   - Horizontal bar chart showing top 10 crime types
   - Filterable by selected districts
   - Percentage labels on bars

3. **Temporal Patterns:**
   - Heatmap grid (hours x days) like GitHub contribution graph
   - Line chart for monthly/quarterly trends

4. **Spatial Map:**
   - MapLibre base map of Chicago
   - Heatmap layer showing crime density
   - Click on hotspot to see district details

5. **Stats Cards:**
   - Total crimes, avg per day, peak hour
   - Most common crime type
   - Safest/dangerous districts ranking

</specifics>

<deferred>

## Deferred Ideas

- User-customizable time range presets
- Export stats as PDF/CSV
- Comparison between two neighborhoods side-by-side
- Historical trend analysis (year-over-year)

</deferred>

---

*Phase: 59-add-stats-page*
*Context gathered: 2026-03-22*
