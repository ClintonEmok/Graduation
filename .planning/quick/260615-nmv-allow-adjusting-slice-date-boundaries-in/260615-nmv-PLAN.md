---
id: 260615-nmv
description: Allow adjusting slice date boundaries in slices tab
status: ready
tasks:
  - id: 1
    description: Wire existing slice datetime editor into slices tab
    files:
      - src/components/dashboard-demo/DemoSlicePanel.tsx
      - src/components/dashboard-demo/SliceComparisonCard.tsx
    action: Mount the existing slice boundary editing card in the selected-slice dialog and connect it to `updateSlice`.
    verify: |
      - selected slice dialog exposes editable start/end datetime inputs
      - changing the inputs updates slice boundaries in store
      - focused lint passes on touched files
---
