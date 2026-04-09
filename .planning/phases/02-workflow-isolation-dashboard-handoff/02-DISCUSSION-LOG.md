# Phase 2: Workflow Isolation + Dashboard Handoff - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 2-Workflow Isolation + Dashboard Handoff
**Areas discussed:** Apply preview surface, STKDE side panel, 3D target behavior, Transition to dashboard

---

## Apply preview surface

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline only | Show only the applied timeline while previewing the result. | ✓ |
| Timeline + map | Show timeline plus map during apply preview. | |
| Dashboard-lite | Show a lightweight final-dashboard preview. | |

**User's choice:** Timeline only
**Notes:** User wanted apply-preview to stay isolated from the dashboard and focus on the timeline while still allowing edits.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, editable in place | Allow split/merge/delete directly in apply-preview. | ✓ |
| Read-only preview | Preview only; edits stay in generate/review. | |
| Split and merge only | Limited editing in preview. | |

**User's choice:** Yes, editable in place
**Notes:** User explicitly wanted split/merge-style actions available before the dashboard handoff.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep warnings visible | Carry review warnings into apply-preview. | ✓ |
| Collapse warnings | Keep them tucked away. | |
| Return warnings to review | Hide warnings from apply-preview. | |

**User's choice:** Keep warnings visible
**Notes:** Warnings remain part of validation while the user previews the applied timeline.

| Option | Description | Selected |
|--------|-------------|----------|
| Own full-screen chrome | Make apply-preview its own isolated screen. | ✓ |
| Reuse final dashboard chrome | Share the dashboard shell. | |
| Neutral workflow shell | Shared workflow header only. | |

**User's choice:** Own full-screen chrome
**Notes:** The user wants the workflow steps isolated, not folded into the dashboard.

## STKDE side panel

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Persistent side panel in the final dashboard. | ✓ |
| Collapsed by default | Reserve the rail, but hide it initially. | |
| Hidden until needed | Only open when requested. | |

**User's choice:** Always visible
**Notes:** The rail should be part of the final dashboard, not a hidden overlay.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed right rail | Stable right-side analysis panel. | ✓ |
| Slide-over drawer | Overlay panel that slides in. | |
| Tab within shell | Tabbed analysis area. | |

**User's choice:** Fixed right rail
**Notes:** Matches the user's "side panel" direction.

| Option | Description | Selected |
|--------|-------------|----------|
| STKDE only | Keep the rail focused on hotspot / STKDE analysis. | ✓ |
| Shared analysis rail | Mix in slice details and warnings. | |
| Switchable sections | Mode/tabs inside one rail. | |

**User's choice:** STKDE only
**Notes:** User wanted the dashboard to be less busy, with analysis content isolated.

| Option | Description | Selected |
|--------|-------------|----------|
| On the final dashboard | Present only after handoff. | ✓ |
| Only after analysis unlock | Hide until later. | |
| Always across workflow | Persist through all steps. | |

**User's choice:** On the final dashboard
**Notes:** It is a post-apply dashboard concern, not part of generate/review.

## 3D target behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder target | Reserve the area without making the dashboard feel like the full cube screen. | ✓ |
| Live cube | Keep the cube fully interactive. | |
| Compact 3D cue | Smaller summary panel. | |

**User's choice:** 3D cube should be toggle able (swap with 2d)
**Notes:** User supplied a custom answer instead of choosing a canned option.

| Option | Description | Selected |
|--------|-------------|----------|
| Empty framed slot | Clean reserved frame that signals the 3D area is separate. | ✓ |
| Label + hint | Frame plus a short hint. | |
| Silent placeholder | Minimal signaling. | |

**User's choice:** Empty framed slot
**Notes:** The 3D area should read as intentionally reserved.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed main column | Core dashboard column. | ✓ |
| Secondary card | Smaller secondary panel. | |
| Tabbed panel | Hidden behind a tab. | |

**User's choice:** Fixed main column
**Notes:** The 3D area remains part of the core dashboard composition.

| Option | Description | Selected |
|--------|-------------|----------|
| Always on the dashboard | Visible even with no active selection. | ✓ |
| Only when data exists | Conditional on populated data. | |
| Only after selection | Reveal only after an inspection target exists. | |

**User's choice:** Always on the dashboard
**Notes:** The final dashboard should not hide the 3D slot.

### Follow-up

| Question | Answer |
|----------|--------|
| Main viewport model | One shared viewport |

**User's choice:** One shared viewport (swap 2D map and 3D cube)
**Notes:** The main panel toggles between the map and cube rather than showing both as separate permanent panels.

## Transition to dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-advance on Apply | Apply immediately enters the final dashboard. | ✓ |
| Explicit Continue step | Separate continue/finish action. | |
| Confirmation screen | Summary screen before the dashboard. | |

**User's choice:** Auto-advance on Apply
**Notes:** The dashboard comes immediately after applying the preview.

| Option | Description | Selected |
|--------|-------------|----------|
| Direct swap | No extra intermediate screen. | ✓ |
| Brief summary panel | Short summary before the dashboard. | |
| Animated handoff | Visible transition animation. | |

**User's choice:** Direct swap
**Notes:** The user wants the workflow step to drop straight into the dashboard.

| Option | Description | Selected |
|--------|-------------|----------|
| Map first | Open the dashboard with the map in the shared viewport. | ✓ |
| 3D first | Open on the cube. | |
| Last used view | Restore the previous viewport. | |

**User's choice:** Map first
**Notes:** The dashboard should open in the overview-friendly state.

| Option | Description | Selected |
|--------|-------------|----------|
| Applied state only | Carry forward the applied slices and window only. | ✓ |
| Reset to clean dashboard | Start fresh. | |
| Ask before carryover | Prompt on handoff. | |

**User's choice:** Applied state only
**Notes:** The final dashboard should inherit the applied workflow result, not reset it.

## the agent's Discretion

- Exact motion timing between the isolated workflow screens.
- Exact visual treatment of the empty 3D slot and the STKDE rail labels.

## Deferred Ideas

- Trace trajectories and compare behaviors remain in a later phase.
- Burst decoding, non-uniform scaling, and support hardening remain later.
- Snapshot/report export remains deferred to v2.

---

## Follow-up Refinement

- Workflow chrome: user deferred the exact treatment (`you decide`) for all four subquestions; the context was locked to a compact full-screen wizard shell with linear next/back navigation, warnings-first review, and minimal shared chrome.
- Viewport swap control: user chose manual-only swapping and an icon toggle; the context was locked to a viewport-chrome control that preserves selection and the active time window across swaps.
- Timeline placement: user chose a collapsible timeline and full editing; the context was locked to a collapsible bottom rail that stays editable and emphasizes the applied state.
- STKDE rail behavior: user started from "hotspots on a map" and deferred the remaining details; the context was locked to a hotspot-map rail that focuses time and space, persists selection, and makes hotspot selection the primary focus action.

## Heatmap enablement

- Generic density heatmap: enabled from the final dashboard map-layer controls.
- STKDE heatmap: enabled from the STKDE rail after running STKDE; hotspot selection keeps the overlay focused.
- Workflow screens: no heatmap controls on generate/review/apply.
