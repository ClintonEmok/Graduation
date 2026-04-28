# Phase 13 Timeline Concept

## Purpose

The timeline should be the **primary analysis driver**. Its job is to help users find, compare, and understand bursty activity over time.

## What We Actually Want

The timeline should help users answer:

1. When is activity concentrated?
2. How do bursts start, peak, and fade?
3. How does adaptive scaling change the reading of time?
4. Which window should I inspect in the map or cube?
5. What changed after I brushed this range?

## Concrete Timeline Output

The timeline should primarily show:

1. Overview density across the full range.
2. Burst markers and high-activity intervals.
3. Adaptive scaling or compression of sparse periods.
4. Brushed selection and zoom state.
5. Comparison between uniform and adaptive views when needed.

## What the Timeline Should Do

1. Lead the analysis workflow.
2. Expose bursts, gaps, and temporal rhythm.
3. Drive selection for the map and cube.
4. Make adaptive time readable without hiding order.

## What the Timeline Should Avoid

1. Becoming a dense control panel.
2. Hiding the active window behind too many overlays.
3. Forcing the user to understand the cube before understanding time.
4. Recomputing expensive data on every small UI change.

## Timeline Modes

### Overview Mode
- show the full dataset as a compressed density strip
- useful for first-pass scanning

### Adaptive Mode
- expand bursty periods and compress sparse ones
- useful for interpretability

### Compare Mode
- show uniform vs adaptive behavior
- useful for checking whether the transform preserves meaning

## Data Requirements

| Need | Data |
|---|---|
| Overview | coarse bins, density map, burst counts |
| Adaptive | warp map, burst labels, density weights |
| Selection | brushed range, zoom range, linked ids |
| Detail | viewport points or fine bins |

## Performance Rules

1. Use precomputed bins for the overview.
2. Use viewport data for detail only.
3. Keep adaptive transforms derived from cached summaries.
4. Avoid duplicate fetches for the same time window.

## Relationship To Other Views

- **Timeline** decides when to inspect.
- **Map** shows where the selected time lands.
- **Cube** shows what structures the selected time belongs to.
