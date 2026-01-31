# Phase 03: Adaptive Scaling Logic - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can toggle between linear and adaptive time (density-based deformation). This phase implements the core algorithm that calculates the deformed Z-axis positions and the animation logic to transition between states.

</domain>

<decisions>
## Implementation Decisions

### Algorithm Trigger
- **Timing:** Continuous calculation. Updates happen dynamically as data or filters change.
- **Performance:** Debounce updates (wait until interaction stops) to prevent lag during rapid changes.

### Transition Style
- **Motion:** OpenCode's Discretion (likely Ease-In-Out).
- **Duration:** Medium (~1s) to allow users to follow the movement.

### Z-Axis Constraint
- **Height Behavior:** Variable Height. The cube grows taller to accommodate high-density areas (low-density areas maintain their scale).
- **Camera:** Stay Put. The camera does not auto-zoom; users adjust their view manually.

### Deformation Curve
- **Type:** OpenCode's Discretion (likely Continuous for smoothness).

</decisions>

<specifics>
## Specific Ideas

- "Variable Height" implies the total Z-range of the data will change. The TimePlane and other Z-dependent visuals must adapt to this new range.

</specifics>

<deferred>
## Deferred Ideas

- UI Layout changes (user retracted request).

</deferred>

---

*Phase: 03-adaptive-scaling-logic*
*Context gathered: 2026-01-31*
