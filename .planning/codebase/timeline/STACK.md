# Technology Stack - Timeline & Visualization

**Analysis Date:** 2026-03-30

## Core Technologies

**Primary Framework:**
- React 19.2.3 - Component rendering for timeline UI
- Next.js 16.1.6 - Application framework

**Visualization Libraries:**

| Library | Version | Purpose |
|---------|---------|---------|
| d3-array | 3.2.4 | Binning algorithms for histogram/data density |
| d3-scale | 4.0.2 | Time scale transformations |
| d3-time | 3.1.0 | Time interval calculations |
| d3-brush | 3.0.0 | Brush selection for range selection |
| d3-selection | 3.0.0 | DOM selection for SVG manipulation |
| d3-zoom | 3.0.0 | Zoom interactions |
| @visx/axis | 3.12.0 | Axis rendering component |
| @visx/brush | 3.12.0 | Brush component wrapper |
| @visx/curve | 3.12.0 | Curve interpolation |
| @visx/event | 3.12.0 | Event handling utilities |
| @visx/gradient | 3.12.0 | SVG gradient definitions |
| @visx/group | 3.12.0 | Group SVG elements |
| @visx/responsive | 3.12.0 | Responsive chart utilities |
| @visx/scale | 3.12.0 | Scale utilities for visx |
| @visx/shape | 3.12.0 | Shape primitives |

**3D Rendering:**
- three.js 0.182.0 - WebGL rendering
- @react-three/fiber 9.5.0 - React renderer for Three.js
- @react-three/drei 10.7.7 - Useful helpers for R3F

**State Management:**
- zustand 5.0.10 - Lightweight store for timeline state

**Date Handling:**
- date-fns 4.1.0 - Date manipulation utilities

**Clustering:**
- density-clustering 1.3.0 - Density-based clustering algorithms

## Rendering Approaches

**Canvas-based Rendering:**
- `DensityHeatStrip` uses HTML5 Canvas for performant density visualization
- Uses `devicePixelRatio` for high-DPI displays
- Direct pixel manipulation via `ImageData`

**SVG Rendering:**
- `DualTimeline` uses SVG for timeline tracks, bins, and annotations
- Layer composition via SVG `<g>` elements
- Pattern fills via SVG `<defs>`

**CSS-based Visualization:**
- Simple bar charts in `TemporalPatternChart` use CSS heights
- No canvas/SVG overhead for simple stacked bars

## Performance Considerations

**Optimizations Used:**
- `useMemo` for expensive scale computations
- `Float32Array` for density maps (memory efficient)
- Canvas 2D for pixel-dense visualizations
- Viewport-based data fetching (only loads visible range)
- Point subsampling (max 4000 points in detail view)

**Adaptive Rendering:**
- Detail view switches between `points` and `bins` based on data density
- `DETAIL_DENSITY_RECOMPUTE_MAX_DAYS = 60` threshold for binning

---

*Stack analysis: 2026-03-30*
