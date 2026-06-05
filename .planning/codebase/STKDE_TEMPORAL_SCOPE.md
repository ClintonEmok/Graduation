# 3D STKDE Temporal Scope

**Analysis Date:** 2026-06-01

## Purpose

This document narrows Temporal Evolution and fluid animation to the demo's 3D STKDE widget path only. The intent is to avoid leaking animation work into the map, timeline, or unrelated dashboard surfaces.

## In-Scope Entry Chain

```
src/components/dashboard-demo/DashboardDemoShell.tsx
  → src/components/dashboard-demo/Demo3dSpatialView.tsx
    → src/app/stkde-3d/components/Stkde3DScene.tsx
      → src/app/stkde-3d/components/StkdeSliceStack.tsx
      → src/app/stkde-3d/components/SliceScrubber.tsx
```

## New Files Added (Phase 76+)

- `src/lib/motion/easing.ts` — Easing functions (easeOutCubic, easeInOutCubic, power2InOut) + `interpolateKdeCells()` for smooth KDE texture transitions
- `src/lib/motion/aging.ts` — `buildAgingOpacityMap()` (distance-based decay), `computeTrailIntensity()` (exponential decay), `getSliceOpacity()` (linear distance falloff)
- `src/app/stkde-3d/lib/volume-encoding.ts` — `buildDurationVolumeProfile()` computes per-slice thickness/opacity/falloff from duration data
- `src/workers/kdeSlice.worker.ts` — Web worker wrapping `computeSliceKde` for off-thread KDE computation

## Why These Files Are the Right Place

### `src/components/dashboard-demo/Demo3dSpatialView.tsx`

- Owns the demo-specific 3D slice orchestration.
- Builds `orderedSlices`, fetches per-slice crime batches via `/api/crimes/range`, and computes `sliceKdes` via `kdeSlice.worker.ts`.
- Holds the `activeSliceIndex` bridge from `useDashboardDemoCoordinationStore`.
- Passes `slices`, `sliceKdes`, `volumeProfile`, `activeIndex`, `viewMode`, and `sliceOpacity` into `Stkde3DScene`.
- Manages playback stepping: `setInterval`-based `activeIndex` increments with `inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectIsScrubbing` gates.

This is the correct place for:
- slice-transition orchestration
- playback-driven active-slice stepping
- gating when to show the 3D widget
- any demo-only loading or fetch sequencing that affects motion between slices

### `src/app/stkde-3d/components/Stkde3DScene.tsx`

- Owns the actual R3F scene setup.
- Sets the camera position (`[105, 175, 105]`, FOV 38), `CameraControls`, and map substrate plane via `MapTileSource`.
- Sets lighting: `ambientLight` (0.4) + two `directionalLight` (0.7 and 0.3).
- Composes the 3D stack view (`StkdeSliceStack`) and optional raw-event overlays (`RawEventPoints`).

This is the correct place for:
- camera fly-throughs / preset transitions
- scene-level temporal easing
- map-substrate fade or reveal behavior
- any fluid motion that changes the 3D scene container, not the data itself

### `src/app/stkde-3d/components/StkdeSliceStack.tsx`

- Owns per-slice rendering of heatmap planes, opacity logic, adjacent-slice emphasis, active-slice rings, volume encoding, aging trails, and transition interpolation.
- Already encodes active vs adjacent slice state through `activeIndex`.
- Uses `buildAgingOpacityMap` and `computeTrailIntensity` from `src/lib/motion/aging.ts` for trail effects.
- Uses `interpolateKdeCells` from `src/lib/motion/easing.ts` for smooth transition textures during playback with interpolation enabled.
- Consumes volume profile from `volume-encoding.ts` for per-slice thickness/opacity/falloff.
- Controls: `inspectInterpolation`, `inspectTrailEnabled`, `inspectTrailDecay` from `useDashboardDemoCoordinationStore`.

This is the correct place for:
- aging/fading trails
- slice-to-slice opacity ramps
- smooth morphing between consecutive slices (transition textures)
- burst emphasis visuals tied to the currently active slice
- volume-encoded thickness visualization

### `src/app/stkde-3d/components/SliceScrubber.tsx`

- Owns the demo 3D widget's slice navigation UI.
- Already drives `activeIndex` changes through prev/next, direct slice selection, playback toggle, speed control, interpolation toggle, and trails control.
- All state is read from `useDashboardDemoCoordinationStore` (inspect* properties).

This is the correct place for:
- playback controls
- scrubber motion feedback
- small transition affordances tied to slice stepping
- interpolation and trails toggle UI

## Explicit Non-Targets

Temporal Evolution and fluid animation should **not** be applied broadly to these surfaces:

- `src/components/dashboard-demo/DemoMapVisualization.tsx`
- `src/components/map/MapVisualization.tsx`
- `src/components/dashboard-demo/DemoTimelinePanel.tsx`
- `src/components/timeline/DemoDualTimeline.tsx`
- `src/components/timeline/DualTimelineSurface.tsx`
- `src/components/dashboard-demo/DemoStatsPanel.tsx`
- `src/components/dashboard-demo/DemoDetectPanel.tsx`

Those surfaces may still need shared state updates, but they are not the animation target.

## Data Inputs That Matter

The 3D STKDE widget's temporal behavior is driven by:

- `useDashboardDemoCoordinationStore.activeSliceIndex`
- `useDashboardDemoCoordinationStore.inspectIsPlaying`
- `useDashboardDemoCoordinationStore.inspectPlaybackSpeed`
- `useDashboardDemoCoordinationStore.inspectInterpolation`
- `useDashboardDemoCoordinationStore.inspectTrailEnabled`
- `useDashboardDemoCoordinationStore.inspectTrailDecay`
- `useDashboardDemoCoordinationStore.volumeScaleSeconds`
- `useDashboardDemoCoordinationStore.volumeExaggeration`
- `useDashboardDemoCoordinationStore.volumeNormalizationMode`
- `useSliceDomainStore.slices`
- `useTimelineDataStore.minTimestampSec` / `maxTimestampSec`
- `Demo3dSpatialView` computed `orderedSlices`, `crimesBySlice`, and `sliceKdes`
- `Stkde3DScene.activeIndex` and `viewMode`
- `StkdeSliceStack.sliceOpacity`

This means fluid animation belongs where these values are consumed, not where the map/timeline render their own data.

## Implementation Boundary

If Temporal Evolution is extended later, it should follow this rule:

1. Animate within `Stkde3DScene` and `StkdeSliceStack`.
2. Keep `Demo3dSpatialView` as the orchestration layer.
3. Keep `MapVisualization` and `DemoDualTimeline` as synchronized readers, not animation owners.
4. Avoid duplicating the same animation logic in the map or timeline.

## Risk Notes

- `Demo3dSpatialView` currently reorders slices before passing them down; any interpolation must use the same ordered slice list to avoid index drift.
- `StkdeSliceStack` currently builds textures per slice; smooth transitions should not recreate textures on every frame (transition textures are built only during playback with interpolation enabled).
- `CameraControls` in `Stkde3DScene` already owns scene motion; do not add a second camera controller.
- `kdeSlice.worker.ts` is a singleton worker — ensure request ID checking prevents stale responses from racing with new computations.
- `volume-encoding.ts` normalization modes (`'window'` vs `'reference'`) produce different thickness profiles; switching modes mid-playback will cause visual jumps.

## Summary

Temporal Evolution for this milestone belongs in the 3D STKDE widget stack only:

- orchestration: `Demo3dSpatialView.tsx`
- scene motion: `Stkde3DScene.tsx`
- slice animation: `StkdeSliceStack.tsx`
- playback controls: `SliceScrubber.tsx`
- easing/interpolation: `src/lib/motion/easing.ts`
- aging/trails: `src/lib/motion/aging.ts`
- volume encoding: `src/app/stkde-3d/lib/volume-encoding.ts`
- KDE worker: `src/workers/kdeSlice.worker.ts`

Do not spread animation work into map or timeline layers.
