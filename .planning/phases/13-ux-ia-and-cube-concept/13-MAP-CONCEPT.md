# Phase 13 Map Concept

## Purpose

The map should be the **geographic detail view**. Its job is to show where activity happens without turning into the cube’s structural summary.

## What We Actually Want

The map should help users answer:

1. Where are the hot areas?
2. Which districts or neighborhoods are active?
3. How does the selected time window change the spatial pattern?
4. Where do bursts concentrate geographically?
5. What spatial context supports the cube’s aggregated structure?

## Concrete Map Output

The map should primarily show:

1. Crime or event locations in the selected window.
2. Hotspot clusters and spatial concentration.
3. District or neighborhood boundaries when relevant.
4. Highlighted selections linked from the timeline or cube.
5. Optional summary overlays, not full structural clustering.

## What the Map Should Do

1. Show geographic distribution clearly.
2. Respond quickly to brushed time ranges.
3. Link to the cube and timeline selection state.
4. Help the user see spatial clustering and local context.

## What the Map Should Avoid

1. Becoming a second cube.
2. Showing too many structural summaries at once.
3. Replacing the timeline’s role in temporal analysis.
4. Rendering full dataset detail when the selected window is enough.

## Map Modes

### Detail Mode
- show selected-window points and local clusters
- useful for inspecting a burst geographically

### Hotspot Mode
- show aggregated hotspot strength and density
- useful for quick spatial pattern reading

### Context Mode
- show district or neighborhood boundaries
- useful for interpretation, not raw density

## Data Requirements

| Need | Data |
|---|---|
| Position | lat, lon, x, z if needed |
| Context | district, neighborhood, boundary metadata |
| Selection | selected time range, linked highlight ids |
| Summary | hotspot density, cluster summary, counts |

## Performance Rules

1. Only load the selected window or summary layer.
2. Do not duplicate the full dataset in map state.
3. Use aggregated overlays for hotspots and boundaries.
4. Keep linked selection updates lightweight.

## Relationship To Other Views

- **Timeline** decides the active window.
- **Map** shows where the active window lives geographically.
- **Cube** explains the aggregated structure behind the same selection.
