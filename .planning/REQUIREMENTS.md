# Milestone v3.2 Requirements: Visualization Level-Up

**Generated:** 2026-05-26
**Status:** Complete

## Foundation

- [x] **FND-01**: Add interpolation-friendly motion scaffolding for the demo 3D STKDE widget so slice transitions can be fluid without relying on Bloom or other glow effects
- [x] **FND-02**: Install and configure `deck.gl` with `@deck.gl/aggregation-layers` and `@deck.gl/mapbox` for GPU-accelerated heatmap density inside MapLibre
- [x] **FND-03**: Install `GSAP` for sequenced animations (camera fly-throughs, transitions, fading trails) running outside React render cycle
- [x] **FND-04**: Consolidate coordination stores — merge drift-prone stores into a single coordination store for all interactive views
- [x] **FND-05**: Offload KDE computation to Web Worker using transferable Float32Array buffers (parallel `computeSliceKde`)
- [x] **FND-06**: Fix shader program caching — replace dynamic `onBeforeCompile` template literals with stable uniform-based variants
- [x] **FND-07**: Enable frustum culling — remove blanket `frustumCulled={false}` on geometry, add LOD for 8.5M instanced points

## Volumetric Duration

- [x] **VOL-01**: Encode slice duration as volumetric thickness/extrusion in the 3D STKDE widget so longer durations occupy more visual depth
- [x] **VOL-02**: Normalize volumetric scaling so duration variance stays comparable across different time windows and slice counts
- [x] **VOL-03**: Add depth-aware slice shaping or layering so adjacent slices do not collapse into a flat surface when durations vary
- [x] **VOL-04**: Preserve readability when volumes overlap by using depth cues, falloff, or spacing that keeps shorter durations visible
- [x] **VOL-05**: Keep volumetric duration encoding synchronized with Inspect and 3D interactions so the active slice stays clear
- [x] **VOL-06**: Store duration-volume settings (scale, exaggeration, normalization) in a dedicated volume store or equivalent coordination state

## Temporal Evolution

- [x] **TME-01**: Add sequenced slice transitions and playback behavior inside the demo 3D STKDE widget so changing slices feels continuous without losing analytical clarity
- [x] **TME-02**: Show aging trails or temporal accumulation inside the demo 3D STKDE widget so analysts can perceive growth, decay, and persistence across adjacent slices
- [x] **TME-03**: Implement opt-in smooth KDE interpolation between consecutive slices in the demo 3D STKDE widget, clearly labeled as estimated/interpolated state
- [x] **TME-04**: Expose temporal evolution controls in the demo Inspect/3D widget pair so users can toggle playback, trail decay, and interpolation mode

## Milestone v3.3 Requirements: Adaptive 3D Visualization

**Generated:** 2026-06-09
**Status:** In progress

## Adaptive 3D

- [x] **ADP-01**: Render the adaptive warp map as a semi-transparent volumetric 1024-bin colored axis in the demo 3D widget, with bin height proportional to warped duration and color from density
- [x] **ADP-02**: Position applied slices in StkdeSliceStack based on the warp map instead of fixed spacing using the current viewport time window — dense periods spread apart, sparse periods compress
- [x] **ADP-03**: Support applied-slice interaction in the 3D view: click to select, drag top/bottom edge to resize time range, double-click empty space to create a new pending draft
- [x] **ADP-04**: Sync all 3D slice edits through shared stores so timeline and Slices tab reflect changes in real-time
- [x] **ADP-05**: Adjust per-slice warp weight from the 3D view when a slice is selected, and delete slices from the 3D view
- [x] **ADP-06**: Toggle linear/adaptive mode updates the 3D view, timeline axis, and slice spacing consistently

## Future (Deferred)

- Study & Evaluation — interaction logging, task timing, NASA-TLX, participant routing
- Multi-Scale Temporal — dynamic aggregation windows, zoom-linked cube resolution, comparison presets
- Dense Data Readability — adaptive transparency, saliency map, LOD switching

## Out of Scope

- Study & Evaluation infrastructure — depends on Adaptive 3D Visualization being stable
- Multi-Scale Temporal (aggregation windows, zoom-linked resolution) — deferred
- Dense Data Readability (adaptive transparency, saliency) — deferred
- Any stack additions beyond the existing Three.js/R3F/MapLibre stack

# Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FND-01 | 76 | Complete |
| FND-02 | 76 | Complete |
| FND-03 | 76 | Complete |
| FND-04 | 76 | Complete |
| FND-05 | 76 | Complete |
| FND-06 | 76 | Complete |
| FND-07 | 76 | Complete |
| VOL-01 | 77 | Complete |
| VOL-02 | 77 | Complete |
| VOL-03 | 77 | Complete |
| VOL-04 | 77 | Complete |
| VOL-05 | 77 | Complete |
| VOL-06 | 77 | Complete |
| TME-01 | 78 | Complete |
| TME-02 | 78 | Complete |
| TME-03 | 78 | Complete |
| TME-04 | 78 | Complete |
| ADP-01 | 79 | Complete |
| ADP-02 | 79 | Complete |
| ADP-03 | 79 | Complete |
| ADP-04 | 79 | Complete |
| ADP-05 | 79 | Complete |
| ADP-06 | 79 | Complete |
