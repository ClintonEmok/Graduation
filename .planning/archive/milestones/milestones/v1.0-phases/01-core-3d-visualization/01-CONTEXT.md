# Phase 1: Core 3D Visualization - Context

**Gathered:** 2025-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view and navigate the 3D environment with mock data. Includes scene setup, camera controls, point rendering, and spatial reference (grid/map toggle). No real backend data yet.

</domain>

<decisions>
## Implementation Decisions

### 3D Interaction
- **Navigation Style:** OrbitControls (rotate around center)
- **Zoom Limits:** Constrained to data bounds (prevents getting lost)
- **Rotation Limits:** Above ground only (0-90 degrees polar angle)
- **Reset Behavior:** Animated smooth transition (VIS-02)

### Visual Style
- **Theme:** Dark Mode (black background, neon points)
- **Point Size:** Uniform size (no variable scaling yet)
- **Point Shape:** OpenCode's discretion (likely Spheres for depth)
- **Opacity:** Solid (opaque) for clarity

### Spatial Reference
- **Grid Style:** Floor + Walls (full context)
- **Map Provider:** MapLibre GL JS (OpenStreetMap, no API key)
- **Map Style:** Dark Matter (Carto) to match Dark Mode theme
- **Toggle:** Implemented as per requirements (VIS-05)

### Initial State
- **Initial Mode:** Abstract Grid view (emphasize structure)
- **Camera Angle:** Angled perspective (45 degrees) to show 3D nature immediately
- **Data:** Auto-load mock data on start

### OpenCode's Discretion
- Exact point resolution/geometry (Sphere vs Box vs Particle)
- Mock data generation logic (random vs structured)
- Exact neon color palette values

</decisions>

<specifics>
## Specific Ideas

- "Constrained zoom prevents users from getting lost in empty space"
- "Dark mode preferred for Space-Time Cube contrast"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-core-3d-visualization*
*Context gathered: 2025-01-31*
