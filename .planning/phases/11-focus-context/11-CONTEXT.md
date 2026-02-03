# Phase 11: Focus Context - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Focus+Context visualization techniques to support user exploration of the Space-Time Cube. This involves highlighting selected data points while maintaining context of the surrounding dataset, often through visual de-emphasis (ghosting) or aggregation.

</domain>

<decisions>
## Implementation Decisions

### Visual Techniques
- **Combination:** OpenCode decided to use a combination of **Desaturation** (grayscale) and **Ghosting** (reduced opacity) for context points.
- **Dithering:** Use screen-door transparency (dithering) in the shader to avoid alpha sorting artifacts with 1M+ points.

### Data Handling
- **Shader-side Filtering:** OpenCode decided to keep all data on the GPU and use uniforms/attributes to switch between focus/context states. This ensures instant transitions without re-uploading data buffers.

### User Interaction
- **Filter to Focus:** OpenCode decided that Sidebar Filters (Type/District) primarily define the Focus set. Clicking a single point highlights it but maintains the broader filtered view context.

### Configuration
- **Toggle + Intensity:** OpenCode decided to provide a "Show Context" toggle AND a simple intensity slider (if feasible) to let users tune the context density.

### OpenCode's Discretion
- Exact opacity/saturation levels for context.
- Specific dithering pattern implementation.

</decisions>

<specifics>
## Specific Ideas

- Ensure "Focus" points are fully opaque and colored by type.
- Context points should not obscure focus points (depth handling).

</specifics>

<deferred>
## Deferred Ideas

- Aggregation (binning) for context data — deferred to V2 if performance requires it.

</deferred>

---

*Phase: 11-focus-context*
*Context gathered: 2026-02-03*
