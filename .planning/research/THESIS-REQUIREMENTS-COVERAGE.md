# Thesis Requirements Coverage: Adaptive Space-Time Cube

**Purpose:** cross-check the thesis visualization requirements against the current prototype direction.

## Summary

The current design is a strong match for the thesis theme: crime monitoring, hotspot analysis, and bursty spatiotemporal exploration. The combination of a 2D density map, a 3D space-time cube, and a dual timeline supports overview, cluster inspection, and coordinated brushing. The non-uniform time scaling idea is also well aligned with the thesis goal of exposing burst structure.

The main thesis risk is not the overall direction. The main risk is incompleteness in the analytical contract: the system must make warped time explainable, preserve metric duration, support comparison, and expose micro-temporal structure without misleading users.

## Requirement Cross-Check

### T1 - Obtain an Overview
Status: Covered

- The 2D density projection supports broad cluster perception.
- The timeline provides a global temporal filter.
- The cube adds a spatial-temporal overview when users need more detail.

### T2 - Trace Trajectories
Status: Partially covered

- The 3D cube is the right form for showing trajectories or evolving selections.
- This is only fully satisfied if the interaction preserves object constancy and synchronized navigation.

### T3 - Compare Temporal Behaviors
Status: Missing as a first-class feature

- Comparison needs explicit support for side-by-side slices, aligned intervals, or compare mode.
- Without this, users can inspect patterns but cannot reliably compare them.

### T4 - Detect Events or Anomalies
Status: Covered, but needs stronger explanation

- Hotspot detection and burst views fit anomaly discovery.
- The UI should distinguish statistically supported events from visually dense but weak patterns.

### T5 - Summarize Patterns and Trends
Status: Covered

- The overview layer and hotspot summaries support generalization.
- Exportable summaries or briefing views would make this stronger.

### T6 - Discriminate Intra-Burst Sequence
Status: Missing

- This requires non-uniform timeslicing that still preserves within-burst order.
- The interface must make rapid event order readable, not just visually expanded.

### T7 - Identify Temporal Dynamics
Status: Missing

- The system should reveal whether a burst is a gradual escalation or a sharp spike.
- This means the warp must communicate burst morphology, not only density.

### T8 - Recover Metric Duration
Status: Partially covered

- This is the most important safeguard for adaptive scaling.
- Users need explicit duration labels, warp context cues, and a way to recover true elapsed time.

## Required Design Principles

1. Keep the 2D map, 3D cube, and timeline synchronized.
2. Make brushing and linking first-class interactions.
3. Show why time is being expanded or compressed.
4. Preserve raw duration alongside warped visual space.
5. Use confidence, significance, or provenance cues for hotspot interpretation.
6. Support comparison, not just exploration.
7. Provide detail-on-demand for incidents and hotspots.
8. Keep heavy adaptive computation off the main thread.

## Missing Features to Prioritize

- Explainable adaptive timeslicing
- Metric-duration and warp context cues
- Raw vs normalized count comparison
- Hotspot confidence / significance overlay
- Compare slices or periods side by side
- Incident drill-down from hotspots
- Data provenance and binning rules
- Intervention tracking / before-after review
- Accessibility and 2D fallback for 3D views

## Thesis Verdict

The approach is valid and defensible for the thesis.

It already supports the core story of visual analytics for crime monitoring, but it becomes thesis-complete only if the prototype adds explicit support for comparison, intra-burst sequence reading, temporal dynamics, and true-duration recovery.

In short: the concept is strong, but the adaptive slicing layer must be transparent rather than purely aesthetic.

---
*Prepared from the current research and roadmap context.*
