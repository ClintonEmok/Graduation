---
phase: 78-temporal-evolution
status: ready-for-planning
---

# Phase 78: Temporal Evolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 78-temporal-evolution
**Areas discussed:** playback sequencing, aging trails, interpolation mode, control surface, scope boundary

---

## Playback Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Loop the ordered slice set | Playback advances through the ordered demo slice list and wraps at the end. | ✓ |
| Stop at the last slice | Playback halts on the final slice until the user restarts it. | |
| Free-running frame clock | Use a separate clock independent of slice order. | |

**Decision:** Loop the ordered slice set.
**Notes:** This keeps playback continuous and matches the existing demo pattern without introducing a second temporal axis.

---

## Aging Trails

| Option | Description | Selected |
|--------|-------------|----------|
| Slice-distance decay | Older slices fade by distance from the active slice and remain as subdued persistence. | ✓ |
| Frame accumulation | Keep a running visual history buffer across frames. | |
| Post-processing trails | Use a full-screen trail effect. | |

**Decision:** Use slice-distance decay.
**Notes:** The widget stays readable, the active slice remains dominant, and the effect stays local to the 3D stack.

---

## Interpolation Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Opt-in estimated mode | Smooth blending is off by default and labeled as estimated/interpolated when enabled. | ✓ |
| Always-on smoothing | Every slice transition is blended automatically. | |
| Hidden blending | Smooth the visuals without surfacing the mode to the user. | |

**Decision:** Opt-in estimated mode.
**Notes:** The analytical jump-cut stays the default, and the demo must not blur the line between observed slices and estimated in-betweens.

---

## Control Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Keep controls in the 3D widget pair | Playback, decay, and interpolation stay in the demo 3D widget path and the inspect-side controls that already govern it. | ✓ |
| Move controls into a new global toolbar | Centralize the temporal controls above the whole dashboard. | |
| Split controls across map/timeline/3D | Surface separate controls in every view. | |

**Decision:** Keep controls in the 3D widget path.
**Notes:** This avoids reintroducing map/timeline animation and keeps the phase boundary tight.

---

## Scope Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| 3D widget only | Temporal evolution affects only `Demo3dSpatialView`, `Stkde3DScene`, `StkdeSliceStack`, and `SliceScrubber`. | ✓ |
| Broader dashboard sync | Map and timeline also animate in step with the 3D widget. | |

**Decision:** 3D widget only.
**Notes:** The map and timeline stay synchronized readers, not animation owners.

---

## Gray Areas

1. **Exact decay curve and trail length**
   - Settled: trails should fade by temporal distance.
   - Unclear: whether the decay should be linear, exponential, or preset-driven.

2. **Interpolation trigger**
   - Settled: interpolation is opt-in and labeled.
   - Unclear: whether it should engage only during playback or also during manual scrubbing.

3. **Control placement details**
   - Settled: controls stay inside the demo 3D widget path.
   - Unclear: whether trail decay gets its own slider or is bundled into a compact temporal mode control.
