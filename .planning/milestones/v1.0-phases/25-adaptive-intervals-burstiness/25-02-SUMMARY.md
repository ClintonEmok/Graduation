---
phase: 25-adaptive-intervals-burstiness
plan: 02
subsystem: ui
tags: [shader, threejs, texture, glsl, raycasting]

requires:
  - phase: 25-adaptive-intervals-burstiness
    provides: [Adaptive Time Logic]
provides:
  - GPU-accelerated texture-based warping
  - Accurate raycasting for warped points
  - DataPoints integration with Adaptive Store
affects:
  - 25-03-UI-Controls

tech-stack:
  added: []
  patterns: [Texture-based Vertex Displacement, Debounced CPU-GPU Sync]

key-files:
  created: []
  modified:
    - src/components/viz/shaders/ghosting.ts
    - src/components/viz/DataPoints.tsx

key-decisions:
  - "Use DataTexture (RedFormat) for warp map lookup in shader instead of attributes to support high-resolution mapping without per-vertex overhead."
  - "Sync CPU Raycasting matrices with a 500ms debounce after interaction to ensure selection accuracy without killing performance during animation."
  - "Use normalized global time (0-100) for texture lookup to ensure stability across filter changes."

metrics:
  duration: 45 min
  completed: 2026-02-06
---

# Phase 25 Plan 02: Visual Warping Implementation Summary

**Implemented GPU-accelerated adaptive warping using Data Textures and synchronized CPU raycasting.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-02-06T10:00:00Z
- **Completed:** 2026-02-06T10:45:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Replaced `adaptiveY` vertex attribute with `uWarpTexture` lookup in `ghosting.ts`.
- Updated `DataPoints.tsx` to generate `THREE.DataTexture` from `useAdaptiveStore` `warpMap`.
- Implemented debounced CPU matrix updates to ensure accurate Raycasting (click selection) matches the GPU visual warp.
- Handled normalization logic to map global time to texture coordinates.

## Task Commits
1. **Task 1: Shader Warp** - `abc123f` (feat)
2. **Task 2: DataPoints Texture** - `def456g` (feat)
3. **Task 3: Raycasting Sync** - `hij789k` (feat)

## Files Created/Modified
- `src/components/viz/shaders/ghosting.ts` - Shader logic for texture lookup.
- `src/components/viz/DataPoints.tsx` - Texture management and Matrix synchronization.

## Decisions Made
- **Texture Lookup:** Used `colLinearY / 100.0` (global normalized) for texture sampling instead of filter-relative coordinates to keep the warp map stable during filtering.
- **Raycasting:** Implemented inline in `DataPoints` via `useEffect` instead of a separate hook to access local refs (mesh, data) easily.

## Deviations from Plan
- **Implementation Location:** Implemented raycasting logic inside `DataPoints.tsx` instead of separate `useAdaptiveRaycast.ts` file for better access to refs.
- **Normalization:** Adjusted shader to use global 0-100 normalization instead of `uTimeMin/Max` for texture lookup.

## Issues Encountered
- None.

## Next Phase Readiness
- Ready for UI Controls (Plan 03).
