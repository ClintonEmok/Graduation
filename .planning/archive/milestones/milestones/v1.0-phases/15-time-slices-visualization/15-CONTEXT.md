# Phase 15: Time Slices Visualization - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see and manipulate horizontal planes showing temporal cross-sections through the data. Slices serve as visual reference markers and data probes. 

</domain>

<decisions>
## Implementation Decisions

### Interaction Model
- **Creation:** Double-click anywhere in the 3D cube scene to add a slice at that Y-height.
- **Manipulation:** Slices have a handle on the time axis (visual marker) that can be dragged to adjust time.
- **Constraints:** Support multiple concurrent slices.

### Management UI
- **Location:** Dedicated section in the right sidebar panel (Viz controls).
- **List View:** Shows all active slices with their date/time.
- **Controls:** 
  - **Editable:** User can type/pick a specific date.
  - **Lock:** Toggle to prevent accidental movement.
  - **Visibility:** Eye icon to hide/show without deleting.
  - **Delete:** Button to remove slice.
- **Generator:** "Generate" button to create multiple slices at fixed intervals (e.g., "Every 1 year").

### Claude's Discretion
- **Visual Style:** Semi-transparent plane (approx 20% opacity) with subtle grid lines for reference.
- **Labeling:** Time label attached to the axis handle to keep the 3D view clean.
- **Intersection Logic:** Points within a small temporal threshold (e.g., ±3 days) of the slice should highlight or brighten to indicate they are "sliced".
- **Adaptive Behavior:** Intersection should use **temporal proximity** (data space), not just visual Z-height, ensuring accuracy in both Uniform and Adaptive modes.

</decisions>

<specifics>
## Specific Ideas

- **Future-proofing:** The "Generate" feature is explicitly requested to support future "slice based on burstiness" workflows.
- **Locking:** Explicit "Lock" state for slices is a requirement.

</specifics>

<deferred>
## Deferred Ideas

- **Heatmap on Slice:** Rendering 2D density heatmaps on the slice plane is Phase 16.
- **Slice-based Filtering:** Using slices as range boundaries for filtering (Phase 7 handles filtering via existing controls).

</deferred>

---

*Phase: 15-time-slices*
*Context gathered: 2026-02-05*
