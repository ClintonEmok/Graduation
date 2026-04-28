# Phase 13 Interaction Research

## Research Focus

This note supports the thesis description of the timeline interaction model for the demo.
The design question is whether the overview should act as a brush, a zoom surface, or a sampled context strip.

## Research Synthesis

The most established interaction pattern for dense visualization is **overview + detail** with **details-on-demand** and **linked brushing**.
The overview provides context across the full dataset, while the detail view exposes the active selection at higher resolution.

This matches the classic visualization mantra:

1. overview first,
2. zoom and filter,
3. details on demand.

For a time-oriented crime analysis workflow, this implies that the overview should represent the **full dataset range**, but in sampled or aggregated form so that the global temporal shape remains readable.
The brush then becomes a **range selector** that sets the active detail window rather than a generic navigation control.

## Why the Brush Should Select Range

Using the brush as a range selector is preferable because it preserves a clear separation between:

- **context**: the full dataset overview,
- **focus**: the selected time window,
- **detail**: the full-resolution data inside that window.

This reduces ambiguity in the user model.
If the brush were used as a general zoom tool, the interaction would mix three tasks at once: navigation, selection, and inspection.
In contrast, range selection makes the timeline a stable control surface for all linked views.

## Thesis-Ready Interaction Statement

The timeline overview should display a sampled representation of the full dataset across the complete time span.
The brush should define the active time range, and the detail lane should render the full-resolution points for that selected interval.
This interaction model preserves global temporal context while allowing precise local inspection.

## Interaction States

### 1. Idle / Overview State

- Full dataset range is visible in the overview lane.
- Overview is sampled to preserve legibility.
- Brush shows the current active interval.
- Detail lane displays the full-resolution window for the current range.

### 2. Hover State

- Pointer hover highlights the local temporal position.
- Hover should not permanently change selection.
- Linked views may show passive emphasis only.

### 3. Brush Drag State

- Dragging the brush changes the active detail window.
- The overview remains the stable reference frame.
- The detail lane updates continuously while dragging.

### 4. Brush Resize State

- Brush handles refine the selected interval.
- The visible detail range should shrink or expand accordingly.
- Linked map and cube views should update from the same selected range.

### 5. Click-to-Center / Focus State

- A click in the overview may recenter the active range.
- This is secondary to brushing and should not replace it.

### 6. Linked Selection State

- Timeline selection drives map and cube highlights.
- Non-active views remain visible and provide context.
- The coupling should feel strong but quiet.

## Design Principle For The Thesis

The timeline is not merely a chart. It is the primary control surface for the analysis workflow.
The overview gives temporal context across the full dataset, the brush selects the window of interest, and the detail lane reveals the selected period at full fidelity.

## Selected References

- Shneiderman, B. (1996). *The eyes have it: A task by data type taxonomy for information visualizations.*
- Furnas, G. W. (1986). *Generalized fisheye views.*
- Heer, J., & Shneiderman, B. (2012). *Interactive dynamics for visual analysis.*

## Notes For Thesis Writing

- Use the phrase **overview + detail** when describing the timeline layout.
- Use the phrase **linked brushing** when describing range selection.
- Use the phrase **details on demand** when describing the detail lane.
- Emphasize that the overview shows the **full dataset range**, not just the selected interval.
- Emphasize that the brush is a **selection control**, not a navigation gimmick.
