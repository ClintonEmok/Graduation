# Phase 13 Cube Concept

## Purpose

The 3D cube should act as a **relational analysis surface** for bursty spatiotemporal data, not as a decorative scatterplot.

Its job is to help users see how time, space, slices, and hotspots relate to one another.

## What We Actually Want

The cube should be an **aggregated structural view** that helps users answer questions like:

1. Which bursts belong together?
2. How do adjacent slices differ?
3. Which hotspots or districts move together over time?
4. How does adaptive scaling change the shape of the pattern?
5. What structure emerges after clustering the selected range?

The cube should not be a raw record browser. It should summarize the selected window into meaningful groups.

## Core Principle

- Timeline answers **when**.
- Map answers **where**.
- Cube answers **how things relate** across time and space.

## Primary Cube Jobs

### 1. Relational Structure
Show connections between bursts, slices, districts, and hotspots.

### 2. Burst Form
Show how dense periods expand, compress, and connect across the temporal axis.

### 3. Comparison
Let the user compare uniform and adaptive time scaling without changing the underlying data.

### 4. Slice Inspection
Render slice boundaries and their relationships to the active time window.

### 5. Context Bridge
Link the cube to the timeline and map so selection in one view highlights the others.

## Concrete Cube Output

The cube should primarily show:

1. **Clusters** derived from the selected range.
2. **Burst groups** that summarize dense temporal segments.
3. **Slice summaries** rather than individual events.
4. **Category composition** such as crime type mix inside each cluster.
5. **Linked selections** that connect cube regions to timeline windows and map areas.

This makes the cube a synthesis layer.

## Cube Modes

### Density Mode
- Emphasize spatial and temporal concentration.
- Useful for answering where the dataset is thick or sparse.

### Relational Mode
- Emphasize relationships between slices, bursts, hotspots, and co-active regions.
- Useful for interpretation, not just density inspection.
- Best for cluster grouping and structure discovery.

### Comparison Mode
- Compare uniform vs adaptive scaling.
- Could be a toggle or a side-by-side projection if the layout supports it.

## Relational Cues

The cube can communicate relationships with:

1. Linked highlight paths between selected timeline windows and cube regions.
2. Shared labels on bursts or slices.
3. Grouping of co-active districts or hotspots.
4. Visual emphasis on transitions between adjacent bursts.
5. Slice thickness or height as a proxy for burst strength.

## Cube vs Map

- **Map** = geographic detail and spatial distribution.
- **Cube** = aggregated structure and temporal-spatial relationships.

The cube should feel different from the map because it reduces record-level detail and instead exposes cluster-level meaning.

## What the Cube Should Avoid

1. Acting as a raw data browser.
2. Replacing the timeline.
3. Showing every record at full fidelity when an aggregate would do.
4. Using 3D only for novelty.

## Data Requirements

| Need | Data |
|---|---|
| Position | x, z, time |
| Structure | slice geometry, burst boundaries |
| Relations | hotspot links, slice links, selection links |
| Density | precomputed bins, adaptive warp map |
| Labels | burst names, confidence, summaries |

## Layout Implication

The cube should sit beside the timeline and map, not above them.

Recommended relationship:

- **Timeline** drives selection.
- **Map** shows spatial distribution.
- **Cube** explains the structural relationship between them.

## Interaction Model

1. Click a burst in the timeline to isolate the related cube region.
2. Select a slice in the cube to highlight the matching map window.
3. Toggle between density and relational emphasis.
4. Compare uniform and adaptive scaling without changing dataset scope.

## Performance Rules

1. Use aggregated overlays, not raw point duplication.
2. Do not recompute the whole cube on every selection if only a window changed.
3. Keep relational metadata small and optional.
4. Prefer shared view-model data over separate per-component fetches.

## Open Questions

1. Should relational mode be the default for analysis users?
2. Which relation is most valuable: slice-to-slice, burst-to-burst, or district-to-district?
3. Should the cube show explicit connectors or rely on spatial grouping only?
4. Should comparison mode be a toggle or a split-view layout?
