---
phase: 16-heatmap-layer
plan: 02
subsystem: ui
tags: [react, three.js, gpgpu, heatmap, shaders]

# Dependency graph
requires:
  - phase: 16-heatmap-layer
    plan: 01
    provides: [Heatmap Store & UI Controls]
provides:
  - Two-pass GPGPU heatmap engine
  - Aggregation and rendering shaders
affects:
  - phase: 16-heatmap-layer
    plan: 03
    provides: [View Integration (Map & Cube)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Two-pass GPGPU aggregation, Logarithmic density scaling]

key-files:
  created:
    - src/components/viz/shaders/heatmap.ts
    - src/components/viz/HeatmapOverlay.tsx
  modified: []

key-decisions:
  - "Used THREE.Points for the aggregation pass to maximize performance for large datasets."
  - "Implemented a single monochromatic cyan-white gradient to match the HUD aesthetic."
  - "Used HalfFloatType/FloatType for the FBO to prevent density clipping in hotspots."

patterns-established:
  - "Pattern: Offscreen GPGPU aggregation for spatial density visualization."

# Metrics
duration: 14 min
completed: 2026-02-05
---

# Phase 16 Plan 02: GPGPU Rendering Engine Summary

**Implemented a performant two-pass GPU-based heatmap engine that aggregates crime event density in real-time and renders a logarithmic-scaled cyan-white density map.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-05T14:05:32Z
- **Completed:** 2026-02-05T14:18:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Heatmap Shaders:** Created high-performance GLSL shaders for Gaussian aggregation and final rendering. The shaders include full filtering logic (time, type, district, spatial) matching the core visualization.
- **Two-Pass Engine:** Developed the `HeatmapOverlay` component using `@react-three/drei`'s `useFBO` to accumulate densities in a high-precision buffer.
- **Logarithmic Scaling:** Implemented log-based intensity scaling to ensure hotspots don't saturate and low-density patterns remain visible.
- **Adaptive Filtering:** Integrated the engine with existing stores to ensure the heatmap updates instantly when filters or time ranges change.

## Task Commits

1. **Task 1: Implement Heatmap Shaders** - `04ef7d3` (feat)
2. **Task 2: Create HeatmapOverlay Component** - `aafea31` (feat)

## Files Created/Modified

- `src/components/viz/shaders/heatmap.ts` - Shader definitions for aggregation and color mapping.
- `src/components/viz/HeatmapOverlay.tsx` - Core heatmap rendering logic.

## Decisions Made

- **GPGPU approach:** Chose a two-pass GPU aggregation approach over CPU-based grid counting to ensure 60fps performance during timeline scrubbing.
- **Points-based aggregation:** Used `THREE.Points` (gl_Points) for the aggregation pass as it is the fastest way to render 10k+ spatial footprints.
- **Cyan-White Ramp:** Selected a monochromatic HUD-style gradient to maintain visual consistency with the project's high-tech aesthetic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- The core heatmap engine is functional and ready for integration.
- Next step is to integrate the overlay into the Map and Cube views (Plan 16-03).

---
*Phase: 16-heatmap-layer*
*Completed: 2026-02-05*
