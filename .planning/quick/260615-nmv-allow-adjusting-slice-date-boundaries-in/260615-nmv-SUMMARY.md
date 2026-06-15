---
id: 260615-nmv
description: Allow adjusting slice date boundaries in slices tab
status: complete
date: 2026-06-15
commits:
  - message: "feat(slices-tab): allow editing slice date boundaries"
    hash: 888cb6c
---

## Summary

Mounted the existing boundary-editing UI in the Slices tab so selected slices can now have their start and end datetimes adjusted directly from the details dialog.

### What changed

1. Imported `SliceComparisonCard` into `DemoSlicePanel`
2. Connected `updateSlice` from `useSliceDomainStore`
3. Added timestamp-to-normalized conversion and label formatting helpers
4. Rendered the editable boundary card at the top of the selected-slice dialog

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx src/components/dashboard-demo/SliceComparisonCard.tsx --max-warnings 0`
