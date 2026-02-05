# Phase 16: Heatmap Layer - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a 2D spatial density visualization (heatmap) as an overlay on the Map view. This provides a spatial "footprint" of crime density that complements the 3D Space-Time Cube. The feature is gated by a feature flag.

</domain>

<decisions>
## Implementation Decisions

### Color & Intensity Style
- **Monochromatic Palette:** Use a single-hue progression (e.g., Transparent -> Cyan -> White) that matches the application's tech aesthetic. This avoids clashing with the categorical colors used for crime types.
- **Logarithmic Scaling:** Use a log scale for intensity mapping. This ensures that high-density "hotspots" don't completely drown out smaller, relevant clusters in lower-density areas.
- **Dynamic Radius:** The blur radius will be tied to geographic scale. As the user zooms in, the "area of influence" for a point stays consistent in meters/feet, rather than pixels.
- **Simple Count weighting:** Density is calculated based on the raw count of events.

### Map Integration & Layering
- **Layering:** The heatmap is rendered **under** the 3D data points. It serves as a background guide to identify spatial hotspots without obscuring the individual events.
- **Non-interactive:** The heatmap is purely visual. Interaction (hover/click) remains focused on the individual data points.
- **Additive Blending:** Use an additive/screen blending mode to give the heatmap a "glow" effect that integrates cleanly with the dark map base.
- **Fixed Opacity:** Heatmap opacity is set to a constant 60%. This provides sufficient visibility without requiring additional UI controls for transparency.

### Temporal Integration
- **Full Range Density:** The heatmap reflects the density of all points currently within the active time filter (the "Full Selected Range").
- **Real-Time Updates:** The heatmap updates in real-time as the user scrubs the timeline or adjusts filters, providing immediate visual feedback on changing spatial patterns.
- **Immediate Decay:** The heatmap always reflects exactly what is filtered. There is no "trail" or "accumulation" beyond the current filter state.
- **Purely Spatial:** The heatmap ignores the 3D "Adaptive" time scale. It is strictly a 2D footprint of the points' (X, Z) coordinates.

### Resolution & Performance
- **High Detail:** Use a high-resolution grid for density calculation to ensure smooth visual gradients.
- **Visible Points Only:** For performance optimization, density is calculated based on points currently within the map's viewport.
- **Hidden by Default:** The heatmap feature flag is disabled by default to keep the initial experience focused on the core Space-Time Cube.
- **Empty State:** If filters result in zero visible points, the heatmap clears immediately.

### Claude's Discretion
- **Shader Implementation:** Choice of WebGL vs. Canvas 2D for the heatmap rendering.
- **Specific Color Values:** Exact hex codes for the monochromatic ramp.
- **Debounce/Throttle:** Timing for performance optimization during high-frequency scrubbing.

</decisions>

<specifics>
## Specific Ideas

- The heatmap should feel like a "HUD" overlay or a high-tech data footprint, similar to spatial analytics in tools like Uber's kepler.gl.
- It should clearly reveal "hidden" spatial density that might be hard to judge in the 3D cube when points are spread across time.

</specifics>

<deferred>
## Deferred Ideas

- **Attribute Weighting:** Weighting density by "severity" or other numerical crime attributes (Phase 20+).
- **3D Heatmap Volume:** Extending density to a 3D volumetric "fog" in the cube (Significant architectural change).
- **Contour Lines:** Vector-based density contours (Out of scope for this visual pass).

</deferred>

---

*Phase: 16-heatmap-layer*
*Context gathered: 2026-02-05*
