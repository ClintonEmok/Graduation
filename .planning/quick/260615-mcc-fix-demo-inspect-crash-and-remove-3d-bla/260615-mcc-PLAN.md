---
id: 260615-mcc
description: Fix demo inspect crash and remove 3D black box
status: ready
tasks:
  - id: 1
    description: Guard demo inspect active slice
    files:
      - src/components/dashboard-demo/DemoInspectPanel.tsx
    action: Prevent the inspect rail from dereferencing an out-of-range active slice during async slice updates.
    verify: |
      - active slice section renders safely when the selected index is stale
      - no TypeError is thrown when switching slices quickly
  - id: 2
    description: Lighten the 3D slice slabs
    files:
      - src/app/stkde-3d/components/StkdeSliceStack.tsx
      - src/app/stkde-3d/components/Stkde3DScene.tsx
    action: Remove the black-box look by softening slice slab colors and clearing the scene frame/background.
    verify: |
      - 3D viewport no longer reads as a black box
      - slices still retain depth cues and hover/active styling
  - id: 3
    description: Keep dependencies stable
    files:
      - src/components/map/MapVisualization.tsx
      - src/lib/hotspot-evolution.ts
    action: Keep memoized arrays stable and lint-clean after the overlay work.
    verify: |
      - focused lint passes on touched files
      - hotspot evolution tests still pass
---
