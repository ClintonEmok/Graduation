---
id: 260615-tx5
description: Remove slice type from slices tab details dialog
status: complete
date: 2026-06-15
commits:
  - message: "refactor(slices-tab): remove type from slice summary"
    hash: 4cae5bc
---

## Summary

Removed the slice type label from the simplified slice summary line in the Slices tab details dialog.

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx --max-warnings 0`
