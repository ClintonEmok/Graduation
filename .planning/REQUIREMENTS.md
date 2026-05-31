# Milestone v3.2 Requirements: Visualization Level-Up

**Generated:** 2026-05-26
**Status:** Roadmap drafted (pending approval)

## Foundation

- [ ] **FND-01**: Add interpolation-friendly motion scaffolding for the demo 3D STKDE widget so slice transitions can be fluid without relying on Bloom or other glow effects
- [ ] **FND-02**: Install and configure `deck.gl` with `@deck.gl/aggregation-layers` and `@deck.gl/mapbox` for GPU-accelerated heatmap density inside MapLibre
- [ ] **FND-03**: Install `GSAP` for sequenced animations (camera fly-throughs, transitions, fading trails) running outside React render cycle
- [ ] **FND-04**: Consolidate coordination stores — merge drift-prone stores into a single coordination store for all interactive views
- [ ] **FND-05**: Offload KDE computation to Web Worker using transferable Float32Array buffers (parallel `computeSliceKde`)
- [ ] **FND-06**: Fix shader program caching — replace dynamic `onBeforeCompile` template literals with stable uniform-based variants
- [ ] **FND-07**: Enable frustum culling — remove blanket `frustumCulled={false}` on geometry, add LOD for 8.5M instanced points

## Volumetric Duration

- [ ] **VOL-01**: Encode slice duration as volumetric thickness/extrusion in the 3D STKDE widget so longer durations occupy more visual depth
- [ ] **VOL-02**: Normalize volumetric scaling so duration variance stays comparable across different time windows and slice counts
- [ ] **VOL-03**: Add depth-aware slice shaping or layering so adjacent slices do not collapse into a flat surface when durations vary
- [ ] **VOL-04**: Preserve readability when volumes overlap by using depth cues, falloff, or spacing that keeps shorter durations visible
- [ ] **VOL-05**: Keep volumetric duration encoding synchronized with Inspect and 3D interactions so the active slice stays clear
- [ ] **VOL-06**: Store duration-volume settings (scale, exaggeration, normalization) in a dedicated volume store or equivalent coordination state

## Burst Visibility

- [ ] **BVS-01**: Replace Canvas2D CPU texture rendering with `ShaderMaterial` GPU rendering across the dashboard-demo 3D pipeline
- [ ] **BVS-02**: Wire per-slice `burstScore` to opacity — burstier slices render more opaque
- [ ] **BVS-03**: Keep the map density-only and do not encode burst score on the map
- [ ] **BVS-04**: Create unified color scale with a shared domain across the 3D cube and timeline
- [ ] **BVS-05**: Implement strong active-slice emphasis using opacity, intensity, and motion-safe highlighting for burst emphasis
- [ ] **BVS-06**: Implement toggle between "raw density" and "burst-emphasized" view modes for the cube/timeline pair (persist across views)
- [ ] **BVS-07**: Add visual legend for burst intensity scale used by the cube and timeline
- [ ] **BVS-08**: Implement confidence-based falloff scaling for burst emphasis — high-confidence bursts get tighter, stronger emphasis and low-confidence get softer, wider emphasis

## Temporal Evolution

- [ ] **TME-01**: Add sequenced slice transitions and playback behavior inside the demo 3D STKDE widget so changing slices feels continuous without losing analytical clarity
- [ ] **TME-02**: Show aging trails or temporal accumulation inside the demo 3D STKDE widget so analysts can perceive growth, decay, and persistence across adjacent slices
- [ ] **TME-03**: Implement opt-in smooth KDE interpolation between consecutive slices in the demo 3D STKDE widget, clearly labeled as estimated/interpolated state
- [ ] **TME-04**: Expose temporal evolution controls in the demo Inspect/3D widget pair so users can toggle playback, trail decay, and interpolation mode

## Future (Deferred)

- Multi-Scale Temporal — dynamic aggregation windows, zoom-linked cube resolution, comparison presets
- Dense Data Readability — adaptive transparency, saliency map, LOD switching
- Evaluation Readiness — interaction logging, state serialization, undo/redo, task timing

## Out of Scope

- Multi-Scale Temporal (aggregation windows, zoom-linked resolution) — depends on Temporal Evolution
- Dense Data Readability (adaptive transparency, saliency) — deferred to future milestone
- Evaluation Readiness (logging, state serialization, undo/redo) — makes sense only after visualization is stable
- Any stack additions beyond the 6 identified packages — existing Three.js/R3F/MapLibre stack covers remaining needs

# Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FND-01 | 76 | Not started |
| FND-02 | 76 | Not started |
| FND-03 | 76 | Not started |
| FND-04 | 76 | Not started |
| FND-05 | 76 | Not started |
| FND-06 | 76 | Not started |
| FND-07 | 76 | Not started |
| VOL-01 | 77 | Not started |
| VOL-02 | 77 | Not started |
| VOL-03 | 77 | Not started |
| VOL-04 | 77 | Not started |
| VOL-05 | 77 | Not started |
| VOL-06 | 77 | Not started |
| BVS-01 | 78 | Not started |
| BVS-02 | 78 | Not started |
| BVS-03 | 78 | Not started |
| BVS-04 | 78 | Not started |
| BVS-05 | 78 | Not started |
| BVS-06 | 78 | Not started |
| BVS-07 | 78 | Not started |
| BVS-08 | 78 | Not started |
| TME-01 | 79 | Not started |
| TME-02 | 79 | Not started |
| TME-03 | 79 | Not started |
| TME-04 | 79 | Not started |
