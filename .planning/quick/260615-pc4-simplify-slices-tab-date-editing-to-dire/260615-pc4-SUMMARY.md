---
id: 260615-pc4
description: Simplify slices tab date editing to direct boundary controls
status: complete
date: 2026-06-15
commits:
  - message: "fix(slices-tab): replace comparison card with direct boundary editor"
    hash: 93ca834
---

## Summary

Removed the comparison-style editor from the Slices tab details dialog and replaced it with direct start/end datetime controls.

### What changed

1. Removed the mounted `SliceComparisonCard` from `DemoSlicePanel`
2. Added direct boundary editor inputs in the selected-slice dialog
3. Kept the same boundary update logic, but made the UI match the tab’s purpose

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx src/components/dashboard-demo/SliceComparisonCard.tsx --max-warnings 0`
