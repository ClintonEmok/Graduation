# Phase 59: Add Stats Page for Neighborhoods - Research

**Phase:** 59
**Created:** 2026-03-22
**Status:** Research Complete

---

## Research Objective

Answer: "What do I need to know to PLAN this phase well?"

---

## 1. What This Phase Delivers

A dedicated `/stats` route for the Neon Tiger crime visualization app that shows neighborhood crime statistics, patterns, and behaviors. This is a standalone analytics dashboard adjacent to the existing `/dashboard`.

---

## 2. Existing Infrastructure

### Data Access Patterns

**Crime Data API:**
- `/api/crimes/range` - Primary data endpoint accepting `startEpoch`, `endEpoch`, `crimeTypes`, `districts`, `limit` parameters
- Returns `CrimeRecord[]` with `timestamp`, `lat`, `lon`, `x`, `z`, `type`, `district`, `year`, `iucr` fields
- Uses `useCrimeData` hook for client-side fetching with built-in buffering

**Existing Context Diagnostics:**
- `buildTemporalSummary()` - Aggregates timestamp data into temporal patterns
- `buildSpatialSummary()` - Aggregates lat/lon/type data into spatial hotspots
- `buildNeighbourhoodSummary()` - Fetches OSM POI and Chicago business data for a bounding box
- `resolveDynamicProfile()` - Classifies temporal/spatial patterns into profile names

**Crime Types (33 defined):**
- THEFT, BATTERY, CRIMINAL DAMAGE, NARCOTICS, ASSAULT, BURGLARY, ROBBERY, etc.

**Districts (25 in Chicago):**
- Districts 1-25 with codes like '001', '002', etc.

### Route Patterns

**Existing Route Structure:**
- `/dashboard` - Full main visualization (MapVisualization, CubeVisualization, TimelinePanel)
- `/timeline-test` - Timeline interaction testing
- `/timeline-test-3d` - 3D timeline testing
- `/timeslicing` - Timeslicing with suggestions
- `/timeslicing-algos` - Algorithm comparison view
- `/stkde` - STKDE hotspot exploration

**Route Shell Pattern (from TimeslicingAlgosRouteShell.tsx):**
- Client component with `"use client"` directive
- Uses Next.js hooks: `usePathname`, `useRouter`, `useSearchParams`
- Custom hooks for data fetching: `useCrimeData`, `useMeasure`
- Store subscriptions via Zustand selectors
- Component composition with panels and controls

### UI Component Patterns

**Layout:**
- Uses Radix UI primitives
- DashboardLayout for multi-panel arrangement
- TopBar for navigation
- Dark theme with `bg-black text-white`

**Visualizations:**
- MapLibre for 2D maps
- Visx/D3 for charts and timelines
- React Three Fiber for 3D (not needed for stats page)

**State Management:**
- Zustand stores with selector pattern
- `useFilterStore` for filter state
- `useTimelineDataStore` for domain data
- Route-local stores for isolated state

---

## 3. What Stats Page Should Show

### Core Metrics

1. **Neighborhood Overview**
   - List of all 25 Chicago districts
   - Total crime count per district
   - Crime rate trend (comparison to city average)

2. **Crime Type Distribution**
   - Breakdown by crime type per neighborhood
   - Top crime types with counts and percentages
   - Comparison across districts

3. **Temporal Patterns**
   - Crime frequency by time of day
   - Crime frequency by day of week
   - Seasonal trends (monthly/quarterly)

4. **Spatial Hotspots**
   - Map visualization showing crime concentration
   - Interactive heatmap overlay
   - Click-to-drill-down on hotspot areas

5. **Neighborhood Context**
   - POI density (food, parks, transit, etc.)
   - Correlation between POI types and crime patterns

---

## 4. Technical Approach

### Architecture

**Route Structure:**
```
src/app/stats/
├── page.tsx                    # Route entry
├── lib/
│   ├── StatsRouteShell.tsx     # Main shell component
│   ├── stats-query-state.ts    # URL state management
│   ├── stats-view-model.ts     # Data transformation
│   └── components/
│       ├── NeighborhoodSelector.tsx
│       ├── CrimeTypeBreakdown.tsx
│       ├── TemporalPatternChart.tsx
│       ├── SpatialHotspotMap.tsx
│       └── NeighborhoodContext.tsx
└── hooks/
    └── useNeighborhoodStats.ts # Data fetching hook
```

**API Endpoints Needed:**
- Reuse existing `/api/crimes/range` for raw data
- Add optional aggregation parameters or create helper functions
- Consider new `/api/crimes/stats` endpoint for pre-aggregated statistics

**Data Flow:**
1. User selects neighborhood(s) via district selector
2. `useNeighborhoodStats` fetches data for selected districts
3. View model transforms raw data into chart-ready format
4. Components render visualizations

### Key Decisions

1. **Stats Page vs Dashboard Extension**
   - Stats page is standalone (no shared state with main dashboard)
   - Has its own time range selector (independent of dashboard)
   - Isolated from slice/suggestion workflows

2. **Aggregation Strategy**
   - Pre-aggregate on server for performance
   - Client-side filtering for drill-down
   - Use existing DuckDB queries for aggregation

3. **Visualization Libraries**
   - Use Visx for bar charts, line charts (already in use)
   - Use MapLibre for spatial visualization
   - Avoid React Three Fiber (overkill for 2D stats)

---

## 5. Dependencies and Risks

### Dependencies

- **Phase 53/54:** Route patterns and shell conventions
- **Phase 57/58:** Context diagnostics modules (can be reused for temporal/spatial summaries)
- **Phase 58:** Neighbourhood OSM/POI integration

### Risks

1. **Performance Risk:** Fetching full district data could be slow
   - Mitigation: Add API-level aggregation, use sampling for large datasets

2. **Data Quality Risk:** Incomplete district coverage in data
   - Mitigation: Show "No data" states gracefully

3. **UI Complexity Risk:** Too many charts could overwhelm users
   - Mitigation: Use progressive disclosure, collapsible sections

---

## 6. Recommended Plan Structure

### Plan 1: Stats Route Foundation + Data Layer
- Create `/stats` route shell
- Add `useNeighborhoodStats` hook
- Create stats aggregation API helpers
- Implement neighborhood selector component

### Plan 2: Crime Distribution Visualizations
- Crime type breakdown charts
- Temporal pattern charts (time of day, day of week)
- Spatial hotspot map integration

### Plan 3: Neighborhood Context + Polish
- Neighbourhood POI integration
- Drill-down interactions
- Performance optimization
- Mobile responsive layout

---

## Validation Architecture

The stats page should pass these verification gates:

1. **Functional Tests:**
   - `npm test -- --run src/app/stats/**`
   - Neighborhood selector updates charts
   - Time range changes reload data
   - Map interactions work

2. **Performance Tests:**
   - Initial load < 3 seconds
   - Filter changes < 500ms
   - No memory leaks on repeated interactions

3. **Accessibility:**
   - Keyboard navigation for all controls
   - Screen reader support for charts
   - Color contrast compliance

---

*Research completed: 2026-03-22*
