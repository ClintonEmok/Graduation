---
phase: 03-demo-timeline-rewrite
status: ready-for-planning
---

# Phase 3: Demo Timeline Rewrite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 03-demo-timeline-rewrite
**Areas discussed:** Timeline structure, slice companion layout, playback chrome, slice state presentation, companion behavior

## Timeline Rewrite Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Demo-specific rewrite | Rebuild the timeline for `/dashboard-demo` instead of polishing the old proof-of-concept in place | ✓ |
| Incremental polish | Keep the current structure and just trim styling / spacing | |

**Decision:** Make this a demo-specific rewrite.

**Why:** The current timeline is too busy and too entangled with proof-of-concept ideas. The demo needs a cleaner surface that feels intentional.

---

## Timeline Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `DemoDualTimeline` | Build a demo-only timeline component and keep the existing one untouched | ✓ |
| Focused rewrite of `DualTimeline` | Keep the current core component and trim it into a demo-specific version | |
| New wrapper composition | Leave `DualTimeline` mostly intact and add a separate shell around it | |
| Hybrid split | Refactor the base timeline and companion layer into clearer separate pieces | |

**User's choice:** Build a separate `DemoDualTimeline` and keep the existing `DualTimeline` untouched.
**Notes:** This preserves a direct comparison surface and avoids contaminating the existing implementation.

---

## Slice / Overlay Model

| Option | Description | Selected |
|--------|-------------|----------|
| Separate companion layer | Treat slices as their own component system layered over or alongside the timeline | ✓ |
| Embedded controls | Keep slice manipulation tightly embedded inside the base timeline | |

**Decision:** Use a separate companion layer for slices and manipulation.

**Why:** The base timeline should stay readable while slice editing remains available without visual pileup.

---

## Slice Companion Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Above timeline | Place the companion section above the timeline surface | |
| Side dock | Place it alongside the timeline in a side column | |
| Right-rail tabs | Share the STKDE rail and switch between STKDE and slices | ✓ |
| Inline strip | Integrate the companion directly inside the timeline chrome | |

**User's choice:** Right-rail tabs.
**Notes:** The companion should live in the same right rail as STKDE, using tabs so it stays visible without taking vertical space from the timeline.

---

## UX Priorities

- Lower density.
- Clearer hierarchy.
- Stronger demo polish.
- Fewer competing controls on the same surface.
- Keep the timeline as the anchor for the workflow, not a background utility.

## Tradeoffs

- Rewriting costs more than polishing, but it should produce a much cleaner end result.
- A separate slice companion layer adds structure, but it should reduce cognitive load.
- Some advanced controls may need to move out of the main timeline chrome to keep the demo focused.

---

## Playback Chrome

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal essentials only | Keep play/pause and stepping, hide most advanced controls | |
| Balanced control set | Keep playback plus time scale and speed, but simplify the layout | |
| Almost all controls | Preserve the current control breadth, only restyle and de-clutter | ✓ |

**User's choice:** Almost all controls stay visible.
**Notes:** The rewrite should simplify presentation, not strip away useful temporal controls.

---

## Slice State Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Compact summaries | Show concise slice names, counts, and warnings | |
| Dedicated companion section | Give slices their own structured area with editing and summary blocks | ✓ |
| Inline badges | Use small badges and labels directly in the timeline | |

**User's choice:** Dedicated companion section.
**Notes:** The slice state should read as its own companion surface rather than tiny inline markers.

---

## Companion Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Keep the companion section open at all times | |
| Collapsible section | Let the user hide the companion section for a cleaner timeline view | ✓ |
| Contextual only | Show the section only when slices exist or editing is active | |

**User's choice:** Collapsible section.
**Notes:** This keeps the companion layer useful without forcing it into the user's face.

---

## Store Logic Investigation

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse shared stores | Keep the demo timeline on the current store model | |
| Demo-specific boundary | Introduce a demo-only store boundary if the current model leaks too much state | ✓ |
| Full store rewrite | Rewrite the store model for the demo timeline from scratch | |

**User's choice:** Investigate whether the demo dual timeline needs its own store logic boundary.
**Notes:** Do not assume the shared stores are sufficient; compare the demo needs against the existing state model before committing.

## Deferred Ideas

- Full workflow wiring belongs to the next phase.
- Any route-level workflow isolation stays deferred.
- Overly dense historical controls can be trimmed or moved later if they do not support the demo story.
- Additional slice state complexity that does not support the demo story should stay out of this phase.
- The old `DualTimeline` should stay untouched for comparison while the demo version is built separately.
