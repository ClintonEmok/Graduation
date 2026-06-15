---
id: 260615-nkm
description: Hide adaptive axis ribbon again in 3D scene
status: ready
tasks:
  - id: 1
    description: Disable adaptive axis render again
    files:
      - src/app/stkde-3d/components/Stkde3DScene.tsx
    action: Temporarily stop rendering the back-edge adaptive axis ribbon to keep the cube visually minimal.
    verify: |
      - AdaptiveWarpAxis no longer renders in the 3D scene
      - Scene file remains lint-clean
---
