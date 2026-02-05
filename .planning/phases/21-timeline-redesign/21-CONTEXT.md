# Phase 21: Timeline Redesign - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the timeline component to improve usability and visual integration. This includes visual styling, interaction models (zoom/pan), and data representation (histogram vs event markers).

</domain>

<decisions>
## Implementation Decisions

### Visual Style
- **Detailed:** Ticks, labels, and visible tracks for clear temporal context.
- **Integrated:** Anchored to the bottom/side of the UI, not a floating overlay.

### Interaction Model
- **Zoomable Timeline:** D3 brush-style interaction for fine-grained temporal selection and navigation.

### Information Density
- **Switchable Visualization:** User can toggle between a Histogram overlay (event counts) and Event Markers (individual dots).
- **Selection Fix:** Ensure interactions (clicking histogram/markers) highlight the correct range/set of data points, addressing the current single-point selection bug.

### Responsive Behavior
- **Desktop Only:** The timeline interface is designed for desktop screens.
- **Mobile Block:** On mobile devices, display an overlay message instructing the user to switch to a larger screen.

### Claude's Discretion
- Exact D3 implementation details.
- Styling of the mobile blocking overlay.
- Default view mode (Histogram vs Event Markers).

</decisions>

<specifics>
## Specific Ideas

- "We should be able to switch between histogram an event markers. cause right now clicking an histogram only highlights a single point and thats probably incorrect"

</specifics>

<deferred>
## Deferred Ideas

- Advanced playback controls (speed, loop) - unless essential for "zoomable timeline".
- Mobile support - explicitly out of scope.

</deferred>

---

*Phase: 21-timeline-redesign*
*Context gathered: 2026-02-05*
