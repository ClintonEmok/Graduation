---
id: 260615-tze
description: Remove neutral language from slices tab dialogs
status: complete
date: 2026-06-15
commits:
  - message: "refactor(slices-tab): remove interpretive dialog copy"
    hash: 7b0ad04
---

## Summary

Removed the remaining interpretive copy from the slice and draft dialogs so the Slices tab language stays operational.

### Verification

- `pnpm exec eslint src/components/dashboard-demo/DemoSlicePanel.tsx --max-warnings 0`
