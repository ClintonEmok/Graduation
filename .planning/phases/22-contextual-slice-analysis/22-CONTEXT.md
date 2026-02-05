# Phase 22: Contextual Slice Analysis - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement detailed data inspection for selected time slices. Users can view aggregate statistics and inspect individual points via a contextual side panel.

</domain>

<decisions>
## Implementation Decisions

### Contextual Tab UI
- **Location:** Slide-in context window (side panel), integrated with existing layout.
- **Trigger:** Auto-opens when a slice is created or selected.
- **History:** Maintains a list of previously analyzed slices (history/comparison) rather than replacing immediately.

### Slice Statistics
- **Metrics:** Event counts by Type, District, Time span/density.
- **Visualization:** Claude's discretion (likely Bar charts).
- **Comparison:** Toggleable option to compare against global dataset averages.
- **Updates:** Re-calculates on interaction end (drag release), not real-time during drag.

### Point Interaction
- **Selection:** Bidirectional (Click point in 3D <-> Click item in Context Tab).
- **Visual Feedback:** Highlight point + Tooltip.
- **Collision:** Standard handling (mini-list or cycling for overlapping points).
- **Scope:** Point selection allows inspection but does **not** filter the main slice statistics (stats always reflect full slice).

### Empty/Null States
- **No Data:** Standard empty state message in panel.
- **Deselection:** Standard behavior (deselect point keeps slice active; explicit close needed for slice).
- **Loading:** Skeleton loader during calculation.

### Claude's Discretion
- Visual design of charts (Bar/Donut).
- Exact collision handling mechanism.
- Specific layout of the side panel.

</decisions>

<specifics>
## Specific Ideas

- "context window like a side panel"
- "ratio of event types etc"
- "click indivivual points for point specific"

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-contextual-slice-analysis*
*Context gathered: 2026-02-05*
