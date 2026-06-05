---
phase: 78-temporal-evolution
status: ready-for-planning
---

# Phase 78: Temporal Evolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 78-temporal-evolution
**Areas discussed:** playback behavior, interpolation presentation, aging trails, control placement

---

## Playback Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Slider speed | Playback speed is adjustable with a slider. | ✓ |
| Fixed speed | Playback runs at one steady speed. | |
| Preset speeds | Playback switches between a few discrete speeds. | |

**Decision:** Slider speed.
**Notes:** The user wanted speed control without adding a dense control surface.

| Option | Description | Selected |
|--------|-------------|----------|
| Pause while scrubbing | Dragging the scrubber pauses playback. | ✓ |
| Keep playing | Playback continues underneath manual scrubbing. | |
| Manual override | Scrubbing takes control until playback is restarted. | |

**Decision:** Pause while scrubbing.
**Notes:** This keeps the focused slice stable while the user chooses a new position.

| Option | Description | Selected |
|--------|-------------|----------|
| Brief pause | Loop restarts use a short pause at the end. | ✓ |
| Instant loop | Jump immediately back to the first slice. | |
| Ping-pong | Reverse direction instead of wrapping. | |

**Decision:** Brief pause.
**Notes:** The loop should feel deliberate rather than mechanical.

| Option | Description | Selected |
|--------|-------------|----------|
| Active slice only | Show only the current slice as playback feedback. | ✓ |
| Playhead + progress | Show a progress indicator as well. | |
| Both | Show the active slice and a progress indicator together. | |

**Decision:** Active slice only.
**Notes:** Keep the widget compact and quiet.

---

## Interpolation Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Morph + crossfade | Blend neighboring slices with geometry/effect changes. | ✓ |
| Crossfade only | Blend visuals without changing the shape much. | |
| Subtle shift | Keep the geometry mostly discrete with only slight easing. | |

**Decision:** Morph + crossfade.
**Notes:** The user wanted a visibly continuous feel without losing the slice structure.

| Option | Description | Selected |
|--------|-------------|----------|
| Interpolated | Short, clear label for the mode. | ✓ |
| Estimated | Emphasizes that the state is not raw observed data. | |
| Estimated interpolation | Most explicit label. | |

**Decision:** Interpolated.
**Notes:** Simple label, still clearly distinct from the raw slice mode.

| Option | Description | Selected |
|--------|-------------|----------|
| Playback only | Interpolation is available only during playback. | ✓ |
| Manual toggle | Users can enable it even when paused. | |
| Both | Available during playback and manual stepping. | |

**Decision:** Playback only.
**Notes:** Keeps the mode tied to motion, not static inspection.

| Option | Description | Selected |
|--------|-------------|----------|
| Active slice anchors the blend | Active slice stays dominant while neighbors morph around it. | ✓ |
| Blend the active slice equally | Active slice participates equally in the interpolation. | |
| Highlight then blend | Emphasize the active slice first, then spread the blend outward. | |

**Decision:** Active slice anchors the blend.
**Notes:** Kept as an implementation decision in CONTEXT.md.

---

## Aging Trails

| Option | Description | Selected |
|--------|-------------|----------|
| Ghosted layers | Older slices stay as faint, readable layers. | ✓ |
| Persistent depth strata | Older slices read as strong volumetric depth behind the active slice. | |
| Soft shadows | Older slices recede as a subtle echo. | |

**Decision:** Ghosted layers.
**Notes:** Literature review favored bounded ghosting over shadow-like history; it keeps the active slice dominant.

| Option | Description | Selected |
|--------|-------------|----------|
| Controls in Inspect panel | Trail controls live with the other temporal controls. | ✓ |
| 3D widget only | Keep trail controls only in the 3D view. | |
| Hidden advanced setting | Tuck trail controls into a secondary menu. | |

**Decision:** Controls in Inspect panel.
**Notes:** Keeps the temporal controls together and discoverable without widening the shell.

| Option | Description | Selected |
|--------|-------------|----------|
| Compact and quiet | Minimal chrome that stays out of the way. | ✓ |
| Visible but restrained | Always visible, but not dominant. | |
| Prominent tool strip | A more explicit control bar. | |

**Decision:** Compact and quiet.
**Notes:** Matches the existing minimal chrome pattern in the demo shell.

---

## the agent's Discretion

- Exact trail decay curve
- Exact trail length / number of visible historical slices
- Exact slider range and whether the speed slider uses ticks or a smooth range

## Deferred Ideas

- Any map or timeline animation
- Multi-scale temporal aggregation
- Evaluation logging / playback analytics
