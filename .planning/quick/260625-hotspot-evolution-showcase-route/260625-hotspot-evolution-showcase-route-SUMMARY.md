---
id: 260625-hotspot-evolution-showcase-route
description: Add an isolated route to showcase hotspot evolution
status: complete
date: 2026-06-25
commits: []
---

## Summary

Added a standalone `/hotspot-evolution` route that showcases the hotspot evolution feature in isolation from the dashboard, including the STKDE layers that generated the tracks.

### What changed

1. **`src/app/hotspot-evolution/page.tsx`**
   - Added a dedicated route with no coordination-store dependency.
   - Built a deterministic sample `StkdeSurfaceResponse` set with stable, displacing, and transient hotspot paths.
   - Added per-slice compact STKDE layer views derived from synthetic heatmap cells.
   - Rendered an overview chart, legend, slice sequence, and per-track summaries.

2. **`src/app/page.tsx`**
   - Added a homepage link to the new showcase route.

### Verification

- `pnpm exec eslint src/app/hotspot-evolution/page.tsx src/app/page.tsx`
