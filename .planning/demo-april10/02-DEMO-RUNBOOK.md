# April 10 Demo Runbook

**Purpose:** Provide the live demo flow for the April 10 freeze.

**Last updated:** 2026-04-03

---

## Demo Goal

Show the workflow from raw data to user-made timeslices. The viewer should understand how dense events in time and space become easier to inspect once the timeline and 2D map are used first.

---

## Live Flow

### 1. Start with the workflow, not the 3D view

- Open `dashboard-v2`.
- Point out the dashboard header and workflow status.
- Explain that the main job is to turn raw data into timeslices the user can review and apply.

### 2. Use the timeline as the control surface

- Show the overview/detail timeline.
- Brush a region of interest.
- Resize bins or adjust the temporal focus.
- Emphasize that the timeline drives the rest of the views.

### 3. Use the 2D map to make burstiness legible

- Show the map after the timeline selection.
- Point out dense spatial clusters and event concentration.
- Use the map as the clearest explanation of where burstiness is happening.

### 4. Review draft timeslices

- Show draft/generated bins.
- Explain why draft and applied slices are separate.
- If any display sampling is needed, apply it after the slice structure is already defined.
- Apply the selected bin(s) only after review.

### 5. Show the applied result

- Confirm that applied slices update the shared views.
- Mention the burstiness or event-rate readout if needed.
- Keep the story focused on the workflow outcome.

### 6. Optional depth step

- Open 3D only after the workflow is already understood.
- Use it as a secondary proof of depth, not the main opening narrative.
- Use STKDE as a final inspection step that can both surface hotspots and validate whether the workflow improved insight.

---

## What To Say

- “This is the raw data to timeslice workflow.”
- “The timeline and map are the easiest way to see the dense periods.”
- “Draft bins are reviewed before they become applied slices.”
- “3D is here for depth, but the main story is already visible in 2D.”

---

## What To Avoid

- Do not begin with the cube.
- Do not show every sampling preset.
- Do not dwell on STKDE unless it supports the workflow story.
- Do not spend time on deep editing paths unless asked.

---

## Demo Rule

If a feature does not help the viewer understand raw data -> timeslices -> applied insight, keep it out of the live path.
