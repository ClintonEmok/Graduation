---
id: 260615-n3i
description: Replace adaptive axis volume with back-edge ribbon guide
status: complete
date: 2026-06-15
commits:
  - message: "feat(stkde-3d): replace adaptive axis volume with back ribbon"
    hash: 4482cd0
---

## Summary

Replaced the adaptive time scaffold from a full cube-filling volume into a thin back-edge ribbon.

### What changed

1. Reduced the adaptive axis footprint from `100 x 100` to `96 x 1.8`
2. Moved the instanced bins to the back edge of the cube (`z = -50.4`)
3. Re-enabled `AdaptiveWarpAxis` in `Stkde3DScene`

### Result

The adaptive time cue remains visible, while the cube keeps read-through to the map and slice volumes.

### Verification

- `pnpm exec eslint src/app/stkde-3d/components/AdaptiveWarpAxis.tsx src/app/stkde-3d/components/Stkde3DScene.tsx --max-warnings 0`
