# Adaptive Space-Time Cube

## What This Is

An interactive web prototype that redesigns the Space-Time Cube visualization to better support exploration of bursty spatiotemporal event data. The system links a timeline, 2D spatial view, and 3D Space-Time Cube, using adaptive (non-uniform) time scaling so dense temporal bursts receive more visual space than quiet periods. Built for a graduation thesis demonstrating how time deformation improves interpretability of spatiotemporal patterns.

## Core Value

Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## Requirements

### Validated

- Preprocessed Chicago crime dataset with burstiness metrics — existing (`datapreprocessing/`)

### Active

- [ ] Space-Time Cube with React Three Fiber (3D rendering, camera controls)
- [ ] Adaptive time scaling on Z-axis (local density-based deformation)
- [ ] Uniform vs adaptive toggle with animated transition
- [ ] Dual-scale timeline (overview histogram + zoomed detail)
- [ ] 2D spatial view with map/abstract toggle
- [ ] Full bidirectional sync across all three views
- [ ] Advanced filtering (crime type, district, time of day) with saved presets
- [ ] Backend API for querying large crime dataset
- [ ] Interaction logging for user study analysis
- [ ] Guided task mode for user study
- [ ] Free exploration mode

### Out of Scope

- Multiple datasets implemented — extensible architecture, but only Chicago crime for v1
- Real-time data streaming — static dataset sufficient for thesis
- Mobile responsiveness — desktop-focused research tool
- User accounts/authentication — not needed for study prototype

## Context

**Existing work:**
- `datapreprocessing/` contains Python pipeline for Chicago crime data (2001-present)
- Burstiness metrics already computed (visualizations in `viz_*.png`)
- CSV data preprocessed and ready for import

**Research context:**
- Space-Time Cube is established geovisualization technique
- Bursty event data (crime, social media, sensor data) creates visual occlusion in uniform time mapping
- Adaptive time scaling is the proposed improvement being evaluated

**User study design:**
- Guided tasks: specific exploration tasks (e.g., "find busiest crime period in district X")
- Free exploration: unstructured exploration with logging
- Compare task performance between uniform and adaptive modes

## Constraints

- **Tech stack**: Next.js with React Three Fiber for 3D rendering
- **Data scale**: Must handle 20+ years of Chicago crime data (millions of records)
- **Backend**: Next.js API routes (with option for Python service for heavy computation)
- **Rendering**: Three.js via React Three Fiber for Space-Time Cube
- **Maps**: Mapbox or Leaflet for 2D spatial view (when in map mode)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Three Fiber for 3D | Performant, integrates well with React/Next.js ecosystem | — Pending |
| Local density-based scaling | Intuitive mapping: more events = more visual space | — Pending |
| Toggle with transition (not side-by-side) | Shows same data morphing, clearer comparison | — Pending |
| Extensible data architecture | Thesis can claim generalizable approach | — Pending |
| Next.js API routes for backend | Simpler than separate service, can call Python if needed | — Pending |

---
*Last updated: 2025-01-30 after initialization*
