# Phase 02: Temporal Controls - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manipulate time flow (play, pause, scrub) in the linear view. This includes the UI for controlling time and the visual feedback of the "current time" within the 3D environment.

</domain>

<decisions>
## Implementation Decisions

### Playback Logic
- **Visual Metaphor:** Moving Plane. The data remains static (providing context), and a horizontal plane moves vertically through the cube to indicate the current time.
- **Loop Behavior:** OpenCode's Discretion (likely loop or stop).
- **Event Visuals:** OpenCode's Discretion (highlighting or filtering events near the plane).

### Slider Design
- **Visual Style:** Simple and clean. No background density histogram/sparkline for this phase.
- **Interaction Pattern:** OpenCode's Discretion (likely a combined control for filtering range vs. current time scrubber).

### Step Precision
- **Movement:** Fixed increment (e.g., +1 hour, +1 day) rather than jumping to the next event.
- **Configuration:** User can select the step size via a dropdown (e.g., "Step by: Hour / Day").

### Controls Position
- **Layout:** Fixed full-width bottom bar.

### OpenCode's Discretion
- Specific icons for playback controls.
- Exact animation speed/duration scaling.
- Color and styling of the time plane.

</decisions>

<specifics>
## Specific Ideas

- "Moving Plane" implies a horizontal geometry cutting through the Z-axis (Time).
- Bottom bar layout is a standard, familiar pattern for timeline tools.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-temporal-controls*
*Context gathered: 2026-01-31*
