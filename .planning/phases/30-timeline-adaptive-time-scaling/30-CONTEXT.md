# Phase 30: Timeline Adaptive Time Scaling - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add adaptive (non-uniform) time scaling visualization to timeline-test. Users can toggle between linear and adaptive time display on the timeline axis itself, seeing how density-based time warping expands dense regions and compresses sparse ones. This is purely a visualization enhancement — slice creation/manipulation works in both modes.

</domain>

<decisions>
## Implementation Decisions

### Toggle UI
- Toggle lives in SliceToolbar alongside existing snap controls
- Simple button or segmented control: "Linear | Adaptive"

### Warp Factor Control
- Slider in toolbar (0-2 range, default 1)
- 0 = linear (no warping)
- 1 = standard adaptive (matches 3D cube)
- 2 = exaggerated warping for visibility

### Visual Indicator
- Color badge in toolbar:
  - Linear mode: Gray badge "Linear"
  - Adaptive mode: Amber badge "Adaptive" with subtle glow
- Axis gets subtle gradient tint when in adaptive mode

### Axis Behavior
- Tick spacing adapts based on warping (dense = expanded, sparse = compressed)
- Show original time as primary labels
- Warping visible through tick distribution, not dual labels

### Zoom Interaction
- Same zoom/brush behavior in both modes
- Zoom operates on warped scale, not linear
- Preserves adaptive visualization during exploration

### State Management
- Use shared useTimeStore from main app (timeScaleMode, setTimeScaleMode)
- Use useAdaptiveStore warpFactor
- This syncs with main app — toggle in timeline-test affects global state

</decisions>

<specifics>
## Specific Ideas

- "I want users to SEE how time is being mapped, not just in the 3D cube but on the timeline axis itself"
- Toggle should feel like the existing mode toggles (snap, creation mode)
- Warp factor slider: same range as main app (0-2)
- Badge styling: match amber theme used for "active" states in toolbar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-timeline-adaptive-time-scaling*
*Context gathered: 2026-02-20*
