---
id: 260615-mcc
description: Fix demo inspect crash and remove 3D black box
status: complete
date: 2026-06-15
commits:
  - message: "fix(dashboard-demo): guard inspect slice and lighten 3d slabs"
    hash: bedd79d
---

## Summary

Fixed the demo crash and made the 3D view read less like a black block.

### What changed

1. **Crash guard**
   - `DemoInspectPanel` now falls back to the first visible slice if the selected index is temporarily out of range
   - The active-slice section no longer dereferences an undefined slice during async state transitions

2. **3D visual cleanup**
   - Removed the frame around the 3D scene
   - Made the canvas background transparent
   - Lightened the slice slab colors in `StkdeSliceStack` so the box reads as volume instead of black

3. **Small stability cleanup**
   - Memoized the map crime data array in `MapVisualization` to keep hook deps stable
   - Kept the hotspot evolution utility lint-clean after the trajectory overlay work

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoInspectPanel.tsx src/app/stkde-3d/components/Stkde3DScene.tsx src/app/stkde-3d/components/StkdeSliceStack.tsx src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx src/components/map/MapHotspotTrajectoryLayer.tsx src/components/map/MapVisualization.tsx src/components/dashboard-demo/Demo3dSpatialView.tsx src/lib/hotspot-evolution.ts --max-warnings 0`
- `npx vitest run src/lib/hotspot-evolution.test.ts`
