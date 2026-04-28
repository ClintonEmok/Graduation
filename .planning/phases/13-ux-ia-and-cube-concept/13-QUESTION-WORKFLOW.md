# Phase 13 Question / Workflow Matrix

## Purpose

This document lists the user questions the demo should answer and the workflow needed to answer each one.

The goal is to make the IA and cube behavior support real analysis tasks instead of just visual exploration.

## Workflow Stages

1. **Orient** - understand dataset scope and active filters.
2. **Find** - locate bursts, clusters, or periods of interest.
3. **Compare** - compare periods, scales, or slices.
4. **Inspect** - inspect a selected region in map/cube/timeline detail.
5. **Explain** - understand why the pattern matters.
6. **Apply** - commit the result into the workflow.

## Question Matrix

| User Question | Best View | Workflow Needed | Data Needed |
|---|---|---|---|
| What is happening? | Overview + timeline | Orient -> Find | record count, burst summary, coarse bins |
| When is activity concentrated? | Timeline | Find -> Inspect | timestamps, density map, warp map |
| Where are the hot areas? | Map | Find -> Inspect | lat/lon, district, hotspot summary |
| How do bursts start, peak, and fade? | Timeline + cube | Find -> Compare -> Explain | burst windows, boundary labels, density change |
| How does adaptive time change what I see? | Timeline + cube | Compare | uniform vs adaptive transforms, same dataset |
| Which slices matter most? | Slices rail + cube | Inspect -> Explain | slice geometry, scores, confidence |
| Are two periods really similar or just nearby? | Cube + timeline | Compare -> Explain | relational cues, linked selections, similarity context |
| Is the pattern spatial, temporal, or both? | Map + cube | Inspect -> Explain | spatial clusters, temporal bins, relational overlays |
| What changed after I brushed this range? | Timeline + map + cube | Find -> Inspect | selected range, filtered subset, linked highlights |
| What is connected to this burst? | Cube | Inspect -> Explain | hotspot links, slice links, selection links |
| Why was this burst highlighted? | Explain panel | Explain | burst rationale, score breakdown, thresholds |
| What should I do with this slice? | Slices panel | Explain -> Apply | slice bounds, labels, confidence, overlap rules |

## Per-Question Workflows

### 1. Orientation Questions

Examples:
- What is happening?
- What data am I looking at?

Workflow:
1. Load metadata first.
2. Show dataset scope.
3. Show a compressed overview timeline.
4. Reveal active filters and current range.

### 2. Finding Questions

Examples:
- When is activity concentrated?
- Where are the hot areas?

Workflow:
1. Start with overview bins or map clusters.
2. Brush or click the interesting window.
3. Update the map and cube to the selected range.
4. Show burst markers or hotspot summaries.

### 3. Comparison Questions

Examples:
- How does adaptive time change what I see?
- Are two periods really similar or just nearby?

Workflow:
1. Keep the same dataset loaded.
2. Swap only the transform or selected context.
3. Compare uniform vs adaptive views.
4. Use relational cues in the cube to verify structure.

### 4. Inspection Questions

Examples:
- Which slices matter most?
- What is connected to this burst?

Workflow:
1. Select a burst, slice, or time window.
2. Highlight linked regions across views.
3. Show slice geometry, overlap state, and supporting statistics.
4. Allow drill-down without reloading the full dataset.

### 5. Explanation Questions

Examples:
- Why was this burst highlighted?
- Is the pattern spatial, temporal, or both?

Workflow:
1. Show burst rationale and score breakdown.
2. Show density context and relational context.
3. Show whether the signal is spatial, temporal, or mixed.
4. Keep explanation tied to the selected view, not a separate dead-end panel.

### 6. Apply Questions

Examples:
- What should I do with this slice?
- What changes carry into the workflow?

Workflow:
1. Review the current candidate slice or burst.
2. Confirm labels, confidence, and overlap rules.
3. Apply the committed state.
4. Move back into analysis with the new selection.

## View Responsibilities

### Timeline
- answer when something happens
- show bursts, density, scale changes, and brush state

### Map
- answer where something happens
- show spatial clusters, districts, and hotspot boundaries

### Cube
- answer what relates to what
- show burst structure, slice relationships, and cross-view links

### Slices Panel
- answer which intervals are being proposed or edited
- show drafts, confidence, and overlap behavior

### Explain Panel
- answer why the system is highlighting something
- show rationale, score breakdown, and interpretation notes

## Performance Rules

1. Metadata must load before heavy data.
2. One dataset should feed all linked views.
3. Use precomputed bins and summary arrays for overview questions.
4. Use viewport-only loading for inspection questions.
5. Keep explanation data small and derived.
6. Avoid separate fetches for timeline, map, and cube if the same selection is enough.
