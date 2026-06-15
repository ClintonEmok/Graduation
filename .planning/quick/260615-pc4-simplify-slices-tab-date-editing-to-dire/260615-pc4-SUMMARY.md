---
id: 260615-pc4
description: Simplify slices tab details dialog
status: complete
date: 2026-06-15
commits:
  - message: "fix(slices-tab): replace comparison card with direct boundary editor"
    hash: 93ca834
  - message: "refactor(slices-tab): trim slice details to essentials"
    hash: 667a078
---

## Summary

Removed the comparison-style editor from the Slices tab details dialog and trimmed the remaining details down to the essentials.

### What changed

1. Removed the mounted `SliceComparisonCard` from `DemoSlicePanel`
2. Added direct boundary editor inputs in the selected-slice dialog
3. Reduced the rest of the dialog to:
   - slice summary
   - burst / warp context
   - optional method notes
4. Removed redundant cards for duplicate datetimes, visibility/lock, neighborhood summary, and verbose metadata blocks

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx src/components/dashboard-demo/SliceComparisonCard.tsx --max-warnings 0`
