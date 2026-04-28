# Phase 13 UX / IA / Performance Brief

## Source Intent

Based on `Space_time_cube_V36.md`, the project goal is to improve interpretation of bursty spatiotemporal data with adaptive temporal scaling while preserving temporal order and duration.

## Product Direction

The demo should be organized around three jobs:

1. Understand the dataset quickly.
2. Explore bursty time periods with adaptive scaling.
3. Use the 3D cube for relational analysis, not just raw placement.

## Core User Stories

### 1. Dataset Orientation
As a user, I want to understand the scope of the dataset so I know what I am analyzing.

**Needs:** record count, date range, spatial bounds, burst summary, active filters.
**Performance:** metadata first, raw rows second.

### 2. Temporal Overview
As a user, I want to see the full timeline compressed into a readable overview so I can find active periods fast.

**Needs:** coarse bins, density map, burst markers, scale toggle.
**Performance:** render from precomputed summaries only.

### 3. Adaptive Expansion
As a user, I want bursty periods expanded automatically so dense activity becomes readable.

**Needs:** burst scores, warp map, density bins, boundary labels.
**Performance:** derive warp from cached aggregates, not full scans.

### 4. Compare Scales
As a user, I want to compare uniform and adaptive time so I can judge whether the scaling is trustworthy.

**Needs:** same dataset under 2 transforms.
**Performance:** one dataset, two projections.

### 5. Detail Inspection
As a user, I want to inspect a selected time window in detail so I can interpret a burst.

**Needs:** viewport data, fine bins, selected range, point counts.
**Performance:** viewport fetch only, no full reload.

### 6. Spatial Context
As a user, I want to inspect the map for the selected window so I can see where activity clusters.

**Needs:** lat/lon, district, hotspot summary, linked selection state.
**Performance:** draw only the active subset.

### 7. Relational 3D Cube
As a user, I want the cube to reveal relationships between space, time, and slices so I can spot structure, not just density.

**Needs:** slice overlays, linked selections, hotspot ties, trajectory or adjacency cues, burst labels.
**Performance:** relation overlays must be aggregated and optional.

### 8. Slice Authoring
As a user, I want to create and adjust slices so I can refine the analysis workflow.

**Needs:** slice bounds, overlap rules, labels, confidence metadata.
**Performance:** keep state local and small.

### 9. Apply and Continue
As a user, I want to apply changes into the dashboard so I can move from drafting to analysis.

**Needs:** committed state, selected slices, final range.
**Performance:** one-way handoff, no duplicate store copies.

## Proposed Information Architecture

### A. Overview
- dataset summary
- burst summary
- active filters
- current analysis state

### B. Timeline
- overview strip
- adaptive scale toggle
- compare mode
- brush and zoom
- burst detail panel

### C. Map
- selected-window map
- district filtering
- hotspot clusters

### D. Cube
- 3D relational view
- slice overlays
- linked selection
- mode toggle for density vs relation emphasis

### E. Slices
- generated candidates
- manual edits
- accept / reject / apply

### F. Explain
- burst rationale
- scoring and confidence
- interpretation notes

## Layout Direction For The Demo

The demo should shift from a generic visualization layout to a workflow layout:

1. **Top:** dataset scope and mode controls.
2. **Center left:** timeline as the primary analysis driver.
3. **Center right:** map and cube as linked views.
4. **Bottom or rail:** slices, stats, and explanation.

This makes the timeline the entry point, while the cube becomes a relational inspection surface instead of a standalone 3D novelty.

## Cube Behavior Proposal

The cube should support three distinct modes:

1. **Density mode** - show where activity clusters in space and time.
2. **Relational mode** - highlight relationships between slices, hotspots, or linked regions.
3. **Comparison mode** - show uniform vs adaptive structure side by side or as toggles.

Possible relational cues:
- linked highlights between selected timeline windows and cube slices
- connections between co-active districts or hotspots
- grouped burst regions with shared labels
- emphasis on transitions between adjacent bursts

## Data Requirements By Layer

| Layer | Data Needed |
|---|---|
| Overview | min/max time, record count, spatial bounds, burst counts |
| Timeline | timestamps, bins, warp map, selection range |
| Map | lat/lon, district, filtered points, hotspot summary |
| Cube | x/z/time columns, slice geometry, relational overlays |
| Slices | slice bounds, overlap metadata, labels, confidence |
| Explain | score breakdown, density context, burst taxonomy |

## Performance Rules

1. Load metadata before heavy data.
2. Never fetch the same dataset twice for different views.
3. Keep raw records out of global UI state when a summary will do.
4. Prefer precomputed bins, density maps, and slice candidates.
5. Make relational cube overlays optional and aggregated.
6. Use viewport-based data loading for detail inspection.

## Design Questions To Resolve

1. Should the cube emphasize **relational structure** over literal 3D density?
2. Should the default demo layout lead with timeline-first analysis or cube-first exploration?
3. Which relationships matter most: temporal adjacency, spatial adjacency, or slice-to-slice similarity?
4. What is the minimum dataset size needed to make the adaptive scaling feel convincing without overwhelming memory?
