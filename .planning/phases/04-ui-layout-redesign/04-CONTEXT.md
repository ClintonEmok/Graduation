# Phase 04: UI Layout Redesign - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## User Vision
"3 component layout: timeline section the full bottom bar, map on the left and 3d cube on the right of the map"

### Layout Specification
- **Container:** Full screen viewport.
- **Main Area (Top):** Split vertically into two panels.
  - **Left Panel:** 2D Map View (Geographic context).
  - **Right Panel:** 3D Space-Time Cube (Temporal context).
- **Bottom Area (Footer):** Full-width Timeline Controls.

### Implications
- **Simultaneous Views:** This changes the previous "Toggle" model to a "Side-by-Side" model.
- **Responsiveness:** Need to handle resizing or stacking on smaller screens (though desktop focus is assumed for research tools).
- **Tech Stack:** Likely need a layout library (e.g., `react-resizable-panels`) to manage the split panes easily.
</domain>

<specifics>
## Specific Requirements
- **Timeline:** Must span the entire bottom width.
- **Map:** Dedicated space on the left.
- **Cube:** Dedicated space on the right.
- **Controls:** "Controls are grouped logically" (from Roadmap). Where do they go?
  - *Inference:* Likely floating overlays on the specific panels (Map controls on map, Time controls in bottom bar, Cube controls on cube) OR a unified sidebar.
  - *Refinement:* Given "Timeline section full bottom bar", time controls go there. Map/Cube controls might be overlays.
</specifics>
