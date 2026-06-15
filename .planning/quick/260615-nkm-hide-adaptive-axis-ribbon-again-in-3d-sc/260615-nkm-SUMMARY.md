---
id: 260615-nkm
description: Hide adaptive axis ribbon again in 3D scene
status: complete
date: 2026-06-15
commits:
  - message: "chore(stkde-3d): hide adaptive axis ribbon again"
    hash: 96ba3b9
---

## Summary

Disabled the adaptive axis ribbon render in `Stkde3DScene` so the cube stays visually clean while you evaluate whether the cue is useful.

### Verification

- `pnpm exec eslint src/app/stkde-3d/components/Stkde3DScene.tsx --max-warnings 0`
