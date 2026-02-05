# Phase 18: Trajectories Visualization - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a trajectories visualization system that connects related events in the 3D Space-Time Cube. This reveals temporal sequences and "hot addresses" by drawing paths between crime incidents occurring on the same city block. The feature is gated by a feature flag.

</domain>

<decisions>
## Implementation Decisions

### Relationship Logic & Grouping
- **Connection Key (Block-Based):** Points are grouped into trajectories based on their "Block" attribute. This highlights the recurring history of specific geographic locations.
- **Continuous Paths:** Sequences within a block are always connected, regardless of the temporal duration between events.
- **Contextual Filtering:** If any point in a block's trajectory passes the active user filters (e.g., crime type), the *entire* historical path for that block is shown to provide full narrative context.
- **Internal ID Sequence:** Events with identical timestamps are sequenced based on their internal database ID or row order.

### Visual Geometry & Flow
- **Straight Polylines:** Connections use straight world-space line segments (polylines) for visual precision.
- **Temporal Gradient:** Directionality is indicated by a color gradient—starting dim/transparent at the earliest event and reaching full brightness at the latest event in the sequence.
- **Adaptive Awareness:** Trajectory lines are "attached" to the visually rendered points, meaning they correctly distort along the Y-axis when Adaptive Time mode is active.
- **Vertical Pillars:** Events occurring at the exact same geographic location (same block coordinates) create vertical "pillars," emphasizing recurrence at a single site.

### Density & Occlusion Management
- **Selection-Centric Visibility:** Only the **Selected Trajectory** is rendered at full opacity. All other trajectories are heavily ghosted/transparent to avoid a "hairball" effect.
- **Temporal Decay (Trail):** A trail effect is applied where segments only appear if they are within a specific time window relative to the current time slider position.
- **Dynamic Thickness:** Line thickness is inversely proportional to the time gap between events—faster recurring events (bursts) appear thicker and more visually intense.
- **Standard Depth Testing:** Trajectories use standard 3D depth testing (they can be obscured by ground or other geometry) to maintain spatial hierarchy.

### Interactive Exploration
- **Hover & Tooltip:** Hovering a segment highlights the entire path and shows a **Summary Tooltip** containing total duration and geographic "travel" distance (if any).
- **Click to Focus:** Clicking a trajectory isolates the path, selects all associated points in the global store, and triggers a camera animation to frame the entire sequence.
- **2D Map Footprint:** When a 3D trajectory is selected, a corresponding 2D "footprint" (line/trail) is drawn on the Map view to provide geographic context.

### Claude's Discretion
- **Gradient Colors:** Exact start/end color values for the temporal progression.
- **Thickness Range:** Minimum and maximum pixel/world-unit values for the dynamic thickness scaling.
- **Fading Algorithm:** Precise implementation of the temporal decay math.

</decisions>

<specifics>
## Specific Ideas

- The trajectories should feel like "strings" or "filaments" connecting the points, giving the cube a structural, web-like quality when enabled.
- The vertical pillars at hot blocks should be visually striking, signaling a "drill-down" history for that specific address.

</specifics>

<deferred>
## Deferred Ideas

- **Entity-Based Trajectories:** Connecting events by offender or victim ID (Out of scope due to data anonymity).
- **Trajectory Simplification:** Using algorithms like Douglas-Peucker for very long paths (Not needed for current block-based grouping).
- **Flow Animation:** "Marching ants" or moving particle animations along the paths (Visual polish for a later phase).

</deferred>

---

*Phase: 18-trajectories*
*Context gathered: 2026-02-05*
