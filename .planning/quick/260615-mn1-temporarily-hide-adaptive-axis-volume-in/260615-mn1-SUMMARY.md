---
id: 260615-mn1
description: Temporarily hide adaptive axis volume in 3D scene
status: complete
date: 2026-06-15
commits:
  - message: "chore(stkde-3d): temporarily hide adaptive axis volume"
    hash: 72b4fe5
---

## Summary

Temporarily disabled `AdaptiveWarpAxis` in `Stkde3DScene` by replacing it with a `null` render branch.

### Purpose

This is a confirmation-only change to verify whether the black cube visible in the 3D scene comes from the adaptive axis volume.

### Verification

- `pnpm exec eslint src/app/stkde-3d/components/Stkde3DScene.tsx --max-warnings 0`
