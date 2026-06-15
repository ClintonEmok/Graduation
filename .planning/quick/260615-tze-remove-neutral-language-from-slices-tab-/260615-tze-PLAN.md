---
id: 260615-tze
description: Remove neutral language from slices tab dialogs
status: ready
tasks:
  - id: 1
    description: Simplify slice and draft dialog copy
    files:
      - src/components/dashboard-demo/DemoSlicePanel.tsx
    action: Remove interpretive or unnecessary labels from slice and draft dialog descriptions so the copy stays operational.
    verify: |
      - selected slice and draft descriptions are neutral
      - focused lint passes on the touched file
---
