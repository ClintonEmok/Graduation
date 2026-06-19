# Phase 2: Dashboard Demo UI/UX Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 2-dashboard-demo-uiux-hardening
**Areas discussed:** Shell hierarchy, viewport swap affordance, timeline rail role, STKDE rail presentation, visual tone, workflow skeleton shape

---

## Shell Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Applied state only | Keep the shell minimal and only show the applied-state message persistently | ✓ |
| All three signals | Show applied timestamp, generation status, and draft bin count together | |
| No route label | Avoid persistent route labeling altogether | ✓ |

**User's choice:** Keep the shell minimal: only applied state stays visible, with no route label and no viewport copy.
**Notes:** User asked for a polished but low-density product UI for general users.

---

## Viewport Swap Affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Icon only | Compact icon toggle with no text labels | ✓ |
| Subtle fade | Quick fade/crossfade when swapping views | ✓ |
| Minimal active cue | Keep active-state feedback subtle | ✓ |
| Utility toggle | Read as a lightweight viewport tool | ✓ |

**User's choice:** Icon-only utility toggle with a subtle fade and minimal active cue.
**Notes:** The swap should stay calm and unobtrusive.

---

## Timeline Rail Role

| Option | Description | Selected |
|--------|-------------|----------|
| Primary control surface | Make the timeline the main usable control area in the demo | ✓ |
| Applied state only | Show only applied-state cues on the rail | ✓ |
| Collapsible by user | Allow the timeline to collapse when desired | ✓ |
| Balanced rail | Keep the timeline visible but subordinate to the viewport | ✓ |

**User's choice:** The timeline is the primary control surface, but it stays balanced and collapsible, with applied-state-only cues.
**Notes:** No draft-vs-applied comparison density in this phase.

---

## STKDE Rail Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Hotspot list first | Lead with the hotspot list | ✓ |
| Polished sidebar | Balanced, product-ready sidebar styling | ✓ |
| Short guidance | Show brief guidance when empty | ✓ |
| Focus only | Keep selection effects mostly local to the rail | ✓ |

**User's choice:** Hotspot list first, polished sidebar styling, short guidance when empty, and mostly local focus.
**Notes:** Keep cross-linking light in this phase.

---

## Workflow Skeleton Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Nested under demo | Keep the workflow as a scaffold inside `/dashboard-demo` | ✓ |
| Multistep form | Present generate/review/apply as a form-like stepper | ✓ |
| Placeholder panels | Use placeholder sections instead of real workflow wiring | ✓ |
| Subordinate flow | Make the workflow visually secondary to the demo shell | ✓ |

**User's choice:** Treat the workflow like a multistep form under the dashboard demo, with placeholder step panels and no separate route.
**Notes:** This is a planning-level skeleton only; the actual workflow mechanics stay deferred.

---

## Workflow Stage Meaning

| Option | Description | Selected |
|--------|-------------|----------|
| Explore | Start by showing the overall data field and context | ✓ |
| Overview | Use a more generic first step name | |

**User's choice:** The first stage should be `Explore`.
**Notes:** This matches the idea that users first orient themselves before making slices.

---

## Workflow Skeleton Tradeoffs

| Option | Description | Tradeoff | Selected |
|--------|-------------|----------|----------|
| Compact stepper | Show one active stage with previous/next awareness | Best for low density and form-like progression | ✓ |
| Tabs | Let users jump directly between stages | Faster jumping, but reads like equal modes rather than a sequence | |
| Three cards | Keep all stages visible at once | Clear overview, but too much surface area for the demo shell | |

**Working direction:** Use a compact stepper with placeholder stage panels, so the workflow feels sequential without becoming a second dashboard.
**Tradeoff notes:** Tabs would flatten the progression model, while persistent cards would over-emphasize the scaffold and compete with the demo viewport.

---

## Workflow Continuity

| Option | Description | Selected |
|--------|-------------|----------|
| Continuous builder | Keep slice creation, adjustment, split/merge, and review as one flowing experience | ✓ |
| Hard break | Split make-slices and review into separate, sharply divided stages | |

**Working direction:** Make the slice-building and review portion continuous.
**Tradeoff notes:** A continuous builder reduces friction and better matches how users refine slices in practice, while a hard break would make the workflow feel more fragmented.

---

## Workflow Drawer Placement

| Option | Description | Tradeoff | Selected |
|--------|-------------|----------|----------|
| Left anchor | Place the drawer on the left side of the demo | Avoids collision with the fixed right STKDE rail | ✓ |
| Right anchor | Place the drawer on the right side | Competes with the STKDE rail and risks visual crowding | |
| Center overlay | Float the drawer in the center | Strong focus, but can feel intrusive | |

| Option | Description | Tradeoff | Selected |
|--------|-------------|----------|----------|
| Toggle open | Collapsed until needed | Keeps the demo cleaner and respects the workflow as secondary | ✓ |
| Always open | Permanently visible | Easier to discover, but heavier on the layout | |
| Contextual open | Open only when relevant state exists | Smart, but harder to reason about in a skeleton | |

| Option | Description | Tradeoff | Selected |
|--------|-------------|----------|----------|
| Active + nearby | Show the active stage and muted surrounding context | Best balance of orientation and density | ✓ |
| All stages | Show every step fully | Clear, but more visually expensive | |
| Active only | Show only the current stage | Minimal, but can lose sequence awareness | |

**Working direction:** A left-anchored toggle drawer with active-plus-nearby step context.
**Tradeoff notes:** The left side keeps the workflow away from the STKDE rail, while toggle-open behavior keeps the surface subordinate to the demo shell.

---

## Visual Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Polished product UI | Product-ready surface for general users | ✓ |
| Low density | Plenty of breathing room | ✓ |
| Dark neutral base | Neutral dark palette with controlled accents | ✓ |
| Hard-edged panels | Stronger surfaces over soft cards | ✓ |

**User's choice:** Polished product UI for general users, low density, dark neutral base, hard-edged panels.
**Notes:** Keep the demo clean and restrained rather than experimental.

---

## Deferred Ideas

- Technical workflow wiring for generate/review/apply
- Workflow skeleton implementation details before planning is finalized
- Draft-vs-applied timeline comparison cues
- Strong cross-linking from hotspot selection into the rest of the demo
- Any route labels or extra shell copy
