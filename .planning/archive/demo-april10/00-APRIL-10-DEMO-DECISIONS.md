# April 10 Demo Decisions

**Purpose:** Track the implementation decisions for the April 10 demo freeze.

**Last updated:** 2026-04-03

---

## Demo Story

The demo will show the workflow from raw data to user-made timeslices, with dense events in time and space becoming visible through the timeline and 2D map first.

---

## Locked Decisions

Each decision records the chosen path plus the alternative that was considered and cut.

| ID | Decision | Status | Alternative path | Why it didn't make the cut |
|----|----------|--------|------------------|----------------------------|
| D1 | Use `dashboard-v2` as the demo shell | Locked | Split the demo across legacy routes | It fragments the narrative and makes the workflow harder to narrate live. |
| D2 | Center the demo on burstiness over time and space | Locked | Center it on all sampling modes | That turns the demo into a feature tour instead of a single clear story. |
| D3 | Keep the timeline as the main control surface | Locked | Make cube or STKDE the control surface | Timeline brush and resize are easier to explain and drive the rest of the views directly. |
| D4 | Make timeline + 2D map the primary demo views | Locked | Make 3D the lead view | The cube adds cognitive load and is harder to ground quickly in a live demo. |
| D5 | Treat 3D as secondary for the demo | Locked | Open with the cube | It competes with the workflow story before the viewer understands the slices. |
| D6 | Show burstiness with numeric support, not only color cues | Locked | Use color-only burst cues | Color alone is ambiguous; the numbers explain rate and duration more clearly. |
| D7 | Preserve explicit apply/review behavior for generated bins | Locked | Auto-apply generated bins | The demo needs draft vs applied separation to show user control. |
| D8 | Keep STKDE manual-triggered | Locked | Auto-rerun on every parameter change | That adds compute noise and weakens the sense of user intent. |
| D9 | Keep encodings justification in documentation, not UI | Locked | Put literature rationale in the interface | It clutters the demo surface and belongs in the methods/writeup. |
| D10 | Let STKDE support both hotspot finding and workflow validation | Locked | Use STKDE only for hotspots or only for validation | The demo benefits from both investigative depth and workflow confirmation. |
| D11 | Rebuild the `dashboard-v2` shell around the workflow story | Locked | Keep the toggle-heavy shell and hide panels ad hoc | The page still reads like a feature list and the orchestration stays chaotic. |
| D12 | Sample after slices are created | Locked | Sample before slice creation in the API | It skews slice boundaries and can erase burst structure before the workflow sees it. |

---

## Current Implementation Focus

- Raw data to timeslice workflow
- Timeline overview + detail
- User bin resizing and review/apply flow
- 2D map as the clearest burstiness showcase
- Burstiness and event-rate readout
- Space-time cube after the main story lands
- Cross-view sync between timeline, map, and cube
- STKDE hotspot inspection for the final investigative step
- STKDE as an optional validation layer for the workflow result
- Rebuild the shell into a workflow-first layout

---

## Open Questions

| Question | Status |
|----------|--------|
| Which presets should be demoed live? | Open |
| What is the shortest label set for burstiness vs event rate? | Open |
| Should the demo start from timeline or cube? | Open |

---

## Notes

- This file is the fresh April 10 decision log.
- Thesis-only items like sampling design and encoding justification stay separate from demo UI work.
