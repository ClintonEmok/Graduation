# Phase 13 Master Design Brief

## Purpose

Phase 13 defines the UX, information architecture, and cube behavior for the demo.

The goal is to make the app feel like a guided analysis workflow for bursty spatiotemporal data, not a collection of disconnected visualizations.

## Design Intent

The system should answer three layers of questions:

1. **Timeline**: when is activity happening?
2. **Map**: where is it happening?
3. **Cube**: what relationships and structure emerge across space and time?

## Core Product Story

The user should be able to:

1. understand the dataset quickly,
2. find bursty periods,
3. inspect spatial context,
4. compare uniform vs adaptive time,
5. interpret relational structure in the cube,
6. author or review slices,
7. and apply changes back into the analysis flow.

## View Roles

### Timeline
- Primary analysis driver
- Shows density, bursts, adaptive scaling, and selection

### Map
- Geographic detail view
- Shows where activity occurs in the selected time window

### Cube
- Aggregated structural view
- Shows clusters, burst groups, slice summaries, and linked relationships

### Slices
- Authoring and review surface
- Shows draft intervals, overlap warnings, and apply actions

### Explain
- Rationale surface
- Shows why something is highlighted or suggested

## Cube Positioning

The cube should be an **aggregated relational view**.

It should:
- show clusters instead of raw records,
- show burst groups instead of unfiltered points,
- show slice summaries instead of dense event clouds,
- and connect to timeline/map selections.

It should not:
- replace the map,
- act as a raw record browser,
- or become a novelty 3D scatterplot.

## Map Positioning

The map should be the **spatial detail view**.

It should:
- show exact geographic context,
- respond to the selected time range,
- and reflect hotspots or district boundaries.

## Timeline Positioning

The timeline should be the **primary control surface**.

It should:
- lead the user through discovery,
- expand or compress bursty periods,
- and drive the other views.

## Question Routing

| Question | Best View | Secondary Views |
|---|---|---|
| What is happening? | Overview | Timeline, Explain |
| When is it happening? | Timeline | Cube, Explain |
| Where is it happening? | Map | Cube, Timeline |
| How do bursts behave? | Timeline | Cube, Explain |
| What relates to what? | Cube | Timeline, Map |
| What should I edit? | Slices | Cube, Explain |
| Why is this highlighted? | Explain | Timeline, Cube |

## Workflow Stages

1. **Orient** - understand scope and active filters.
2. **Find** - locate bursts, clusters, or points of interest.
3. **Compare** - compare periods, transforms, or slices.
4. **Inspect** - drill into a selected window or cluster.
5. **Explain** - understand the pattern or suggestion.
6. **Apply** - commit the result into the workflow.

## Performance Rules

1. Load metadata before heavy data.
2. Use one canonical dataset across views.
3. Use summary arrays for overview and clustering.
4. Use viewport-only loading for detail.
5. Keep cube overlays aggregated and optional.
6. Avoid duplicate fetches for the same selection.

## Layout Principle

Desktop layout should read as:

- top: dataset scope and mode controls
- center left: timeline
- center right: map + cube
- bottom or rail: slices + explain

## Decisions To Preserve

1. The cube is for relational structure.
2. The map is for geographic detail.
3. The timeline is for temporal discovery.
4. The user story should drive the layout, not the code structure.
