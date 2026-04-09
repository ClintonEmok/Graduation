# Phase 24: Interaction Synthesis & 3D Debugging - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Harmonize interactions across Map, Timeline, and 3D Cube. Fix 3D click targeting issues and ensure selection state propagates correctly between views.

</domain>

<decisions>
## Implementation Decisions

### Selection Synchronization
- **Point Selection:** Selecting a point in any view (Map/Cube) highlights it in all views AND scrolls/zooms the Timeline to focus on that point's time.
- **Range Selection:** Selecting a time range (Timeline Brush) **highlights** matching points in Map/Cube (dimming others) rather than filtering them out. This preserves "Focus + Context".

### 3D Click Debugging
- **Strategy:** "All of the above" approach to fixing click issues.
  - Implement visual raycast debugging (laser line).
  - Increase click tolerance/threshold.
  - Audit and fix UI overlays blocking events (pointer-events: none).

### Timeline-Driven Highlighting
- **Performance:** Debounced updates (real-time but throttled) during brush dragging.
- **Visual Style:** Non-selected points will be "Ghosted" (transparent grey) to maintain spatial context.

### State Source of Truth
- **Architecture:** Specialized stores with `CoordinationStore` as the conductor.
  - `SliceStore`: Owns time ranges/slices.
  - `FilterStore`: Owns global data filters.
  - `CoordinationStore`: Owns transient point selection and broadcasts changes.
- **Rationale:** Prevents monolithic state and excessive re-renders while keeping logic decoupled.

### Claude's Discretion
- Specific debounce timing (e.g., 16ms vs 100ms).
- Exact visual properties of "Ghosting" shader.

</decisions>

<specifics>
## Specific Ideas

- "highlight point in both AND scroll/zoom Timeline"
- "dim others" (Focus + Context)
- "no idea why clicks asre failing" -> robust investigation required

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-interaction-synthesis-debugging*
*Context gathered: 2026-02-05*
