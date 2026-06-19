# Phase 5: Demo Stats + STKDE Interaction - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a demo-specific stats and STKDE interaction surface under `/dashboard-demo`. The phase reuses the stats and STKDE routes as reference implementations, but the demo variant stays compact, user-facing, and coordinated around a one-way flow: district selection in stats filters STKDE. STKDE hotspot selection does not push back into stats.

</domain>

<decisions>
## Implementation Decisions

### Data-to-UI framing
- **D-01:** The shared label for the stats surface is `district`.
- **D-02:** The spatial view should read like a plain-language district or neighborhood summary, not like a technical model readout.
- **D-03:** Hotspots should be described in user-facing place language first, with any technical density detail kept secondary.

### Interaction direction
- **D-04:** District selection in the stats surface filters STKDE.
- **D-05:** STKDE hotspot selection does not update the stats surface.
- **D-06:** Stats and STKDE remain separate tabs in the demo rail.

### Demo presentation
- **D-07:** The demo should include the spatial distribution / hotspot map piece, not just summary cards.
- **D-08:** The demo variant should stay compact and focused, reusing shared stats math and route helpers rather than recreating a new data pipeline.

### Stats surface density
- **D-09:** The stats surface should feel like a compact dashboard, not a sprawling analytics page.
- **D-10:** Summary cards lead the stats surface visually.
- **D-11:** Helper copy should stay minimal, with only a short line of guidance at most.
- **D-12:** District selection should read as a ranked list of districts, not a dense chip grid.

### Hotspot place language
- **D-13:** Hotspot results should read like district summaries first, with neighborhood context as supporting language.
- **D-14:** The hotspot label can mention both district and neighborhood when it makes the result clearer.
- **D-15:** The demo rail should not keep explicit intensity numbers in the hotspot list.
- **D-16:** The hotspot list should stay very light on technical detail and rely on place labels plus a short support/location line.

### Spatial map emphasis
- **D-17:** The spatial map belongs as a balanced section of the demo, not the dominant focus.
- **D-18:** The map should default to heatmap mode.
- **D-19:** The map should stay tightly focused on the selected district.
- **D-20:** The points mode should remain visible as an alternate view.

### Empty and recovery states
- **D-21:** When no districts are selected, the demo should prompt the user to pick districts.
- **D-22:** When STKDE has no hotspots, show a simple empty state instead of a heavier fallback experience.
- **D-23:** Recovery controls should stay lightweight.
- **D-24:** Empty states should be instructional, telling the user what to do next.

### the agent's Discretion
- Exact empty-state copy for the demo stats panels.
- Whether district labels are rendered as raw district numbers or friendlier display names in each panel.
- How much of the shared stats route layout is reused versus simplified.

</decisions>

<specifics>
## Specific Ideas

- The spatial hotspot presentation should be approachable enough to describe areas as dense city blocks or neighborhoods when combined with stats.
- The stats route is the reference surface; the demo should borrow its useful pieces without becoming a full clone.
- `SpatialHotspotMap` already shows how the heatmap is derived from crime points, so the demo can reuse that mental model while simplifying presentation.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stats route baseline
- `src/app/stats/page.tsx` — entry point for the shared stats route.
- `src/app/stats/lib/StatsRouteShell.tsx` — baseline route composition and panel layout.
- `src/app/stats/hooks/useNeighborhoodStats.ts` — shared crime aggregation and selection hook.
- `src/app/stats/lib/stats-view-model.ts` — shared stats formatting and chart helpers.
- `src/app/stats/lib/components/SpatialHotspotMap.tsx` — MapLibre spatial distribution layer and heatmap/points implementation.
- `src/app/stats/lib/components/NeighborhoodContext.tsx` — district context and POI framing.
- `src/app/stats/lib/components/StatsOverviewCards.tsx` — summary card pattern.
- `src/app/stats/lib/components/CrimeTypeBreakdown.tsx` — type distribution pattern.
- `src/app/stats/lib/components/TemporalPatternChart.tsx` — temporal distribution pattern.
- `src/app/stats/lib/components/DistrictBreakdown.tsx` — district ranking pattern.
- `src/app/stats/lib/components/NeighborhoodSelector.tsx` — district selection control.
- `src/app/stats/lib/components/TimeRangeSelector.tsx` — time filtering control.
- `src/store/useStatsStore.ts` — route-local stats filter state.

### Demo stats/STKDE reference pieces
- `src/components/dashboard-demo/DemoStatsPanel.tsx` — current demo-local stats composition.
- `src/components/dashboard-demo/DemoStkdePanel.tsx` — current demo-local hotspot/STKDE control surface.
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` — tabbed rail that keeps stats and STKDE separate.
- `src/components/dashboard-demo/lib/useDemoNeighborhoodStats.ts` — demo-local stats hook.
- `src/components/dashboard-demo/lib/useDemoStkde.ts` — demo-local STKDE hook.
- `src/store/useDashboardDemoAnalysisStore.ts` — demo-local analysis state shared by stats and STKDE.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useNeighborhoodStats` and `useDemoNeighborhoodStats` already provide the aggregation pattern.
- `SpatialHotspotMap` already shows the underlying point-to-heatmap approach.
- `StatsOverviewCards`, `CrimeTypeBreakdown`, `TemporalPatternChart`, and `DistrictBreakdown` already encode the visual language for summary and breakdown surfaces.
- `DemoStatsPanel` and `DemoStkdePanel` already show the current demo-specific composition and can be tightened rather than rebuilt.

### Established Patterns
- The stats route is route-local and filter-driven.
- The demo shell already uses tabs to keep stats and STKDE separated.
- The demo analysis store already isolates district/time selection and STKDE state from the stable route.
- The shared map is heatmap-first over crime points, with the demo able to present the same idea in a more compact way.

### Integration Points
- `/dashboard-demo` rail tabs are the demo entry point for stats and STKDE.
- The demo stats surface should stay coordinated with the demo analysis store.
- The demo STKDE surface should consume district selection from the stats surface but not push back into it.
- The spatial map should reinforce the selected district and the STKDE rail should remain a separate tab.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-stats-stkde-interaction*
*Context gathered: 2026-04-09*
