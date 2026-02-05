# Phase 17: Cluster Highlighting - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement an automated cluster detection and visualization system in the 3D Space-Time Cube. The goal is to guide user attention to regions of high spatial-temporal density using axis-aligned bounding indicators and billboarded labels. The feature is gated by a feature flag.

</domain>

<decisions>
## Implementation Decisions

### Clustering Behavior & Tuning
- **Weighted 3D Proximity:** Use a weighted distance metric where spatial distance (X, Z) has a higher influence than temporal distance (Y). This ensures clusters represent "events happening in the same place around the same time" rather than just "events happening at the same time."
- **Manual Sensitivity Slider:** Provide a "Cluster Sensitivity" slider in the Layers UI. Users need control over the clustering threshold to explore different levels of detail (e.g., small local hotspots vs. large regional trends).
- **Adaptive-Aware Clustering:** Clustering is calculated based on the *rendered* positions in the 3D cube (using Adaptive Time if enabled). This ensures that visual clusters the user sees match the analytical highlights provided by the system.
- **Medium Threshold:** Minimum of 5 points required to form a cluster.

### Visual Representation
- **Bounding Boxes:** Use axis-aligned bounding boxes (AABB). They are visually cleaner than hulls and better convey the spatial-temporal "box" that the points occupy.
- **Wireframe + Volume:** Render clusters using a combination of thick wireframe outlines and a very subtle semi-transparent volume (10% opacity). This provides a clear boundary without obscuring the points inside.
- **Color by Dominant Type:** The highlight color of the box/label matches the categorical color of the most frequent crime type within that cluster.
- **Brightness Boost:** Points inside an active cluster (hovered or selected) receive a subtle emissive boost to "glow," distinguishing them from the background context.

### Labeling & Metadata
- **Type & Count:** Labels display the dominant crime type and the total event count (e.g., "Theft: 18").
- **Billboarded Labels:** Labels always face the camera for readability.
- **Top 5 Priority:** By default, show labels for the top 5 densest clusters only. Show others only on hover to prevent visual clutter.
- **Floating HUD Style:** Labels are enclosed in a badge-style background (semi-transparent dark gray) with a thin connecting line ("leader line") to the center of the cluster.

### Interaction & Navigation
- **Click to Focus:** Clicking a cluster or its label triggers an animated camera zoom that frames the cluster perfectly in the viewport.
- **Coordinated Highlighting:** Selecting a cluster in the Cube also draws a corresponding 2D bounding rectangle on the Map view for geographic context.
- **Hover Feedback:** Hovering over a cluster highlight increases its wireframe thickness and reveals its metadata label if it was hidden.
- **Single Selection:** One active cluster selection at a time to keep the camera focus logic simple and effective.

### Claude's Discretion
- **Clustering Algorithm:** Choice of algorithm (e.g., DBSCAN or K-Means). DBSCAN is recommended for its ability to find arbitrary shapes and handle noise.
- **Animation Timings:** Duration and easing for camera "focus" transitions.
- **Leader Line Style:** Precise thickness and opacity of the label leader lines.

</decisions>

<specifics>
## Specific Ideas

- The "Click to Focus" behavior should feel like Google Maps' "Search in this area" or "Fly to" behavior—smooth and purposeful.
- The visual language of the boxes and labels should feel consistent with the existing "Time Slices" HUD elements.

</specifics>

<deferred>
## Deferred Ideas

- **Cluster Trajectories:** Visualizing how clusters "drift" spatially over time (Significant complexity).
- **Manual Cluster Creation:** Allowing users to "lasso" points into a custom cluster (Phase 20+).
- **Hierarchical Clustering:** Clusters within clusters (Too much visual noise for this phase).

</deferred>

---

*Phase: 17-cluster-highlighting*
*Context gathered: 2026-02-05*
