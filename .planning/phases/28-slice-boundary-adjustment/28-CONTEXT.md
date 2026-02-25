# Phase 28: Slice Boundary Adjustment - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow precise adjustment of existing timeline slice boundaries using draggable start/end handles, with real-time boundary updates, minimum duration constraints, and optional snap behavior.

This phase focuses on boundary adjustment behavior only. New capabilities outside adjustment (for example whole-slice move workflows or multi-slice management features) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Handle visibility and targeting
- Show handles on hover and for the selected slice.
- Use a balanced target: approximately 8px visual handle with approximately 12px effective hit area.
- Only start/end handles are draggable in this phase.
- Handle styling is adaptive: subtle when idle, high-contrast when hover/active.

### Drag feedback during adjustment
- During drag, update boundary position, slice fill extent, and duration readout in real time.
- Show live feedback in a floating tooltip near the active handle.
- Slightly dim non-active slices while dragging to preserve context and focus.
- Use smoothed live visual updates (not quantized snap-only jumps).

### Constraint behavior at limits
- Enforce hard stops at timeline bounds during drag.
- Enforce minimum duration during drag with hard stop behavior.
- When a limit is hit, show subtle visual feedback on the active interaction state.
- Do not auto-move the opposite boundary when constraints are hit.

### Snap behavior and control
- Snap is ON by default.
- Snap strategy is adaptive by zoom level, with optional fixed preset selector.
- Users can temporarily disable snap while dragging via a modifier key.
- Apply snap behavior to both start and end handles.

### Claude's Discretion
- Exact visual tokens for handle/constraint feedback (colors, stroke styles, and animation timing).
- Exact modifier key choice for temporary snap bypass, aligned to existing app conventions.
- Exact wording/format of duration and boundary tooltip text.

</decisions>

<specifics>
## Specific Ideas

- Decision style for this phase: defaults accepted across all discussion areas, favoring precision-first interaction with low visual noise.
- Interaction emphasis: real-time, local feedback near the handle rather than panel-heavy status UI.

</specifics>

<deferred>
## Deferred Ideas

- Whole-slice center drag/move interaction is deferred beyond this phase boundary.
- Multi-slice management behaviors remain in later scoped phases (Phase 29+).

</deferred>

---

*Phase: 28-slice-boundary-adjustment*
*Context gathered: 2026-02-19*
