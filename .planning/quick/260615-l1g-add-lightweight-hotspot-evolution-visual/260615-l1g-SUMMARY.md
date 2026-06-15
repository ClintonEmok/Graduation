---
id: 260615-l1g
description: Add lightweight hotspot evolution visualization to demo dashboard
status: complete
date: 2026-06-15
commits:
  - message: "feat(hotspot-evolution): add utility, hook, component, and integration"
    files:
      - src/lib/hotspot-evolution.ts
      - src/lib/hotspot-evolution.test.ts
      - src/hooks/useHotspotEvolution.ts
      - src/components/dashboard-demo/HotspotEvolutionCard.tsx
      - src/components/dashboard-demo/DemoStkdePanel.tsx
---

## Summary

Added a lightweight hotspot evolution feature to the demo dashboard that answers "where did the hotspot go?" and "how did it change?" by tracking STKDE hotspots across consecutive slices.

### What was built

1. **`src/lib/hotspot-evolution.ts`** — Pure utility that takes `sliceResults` from STKDE response and:
   - Matches hotspots across adjacent slices by centroid proximity (<3km)
   - Computes displacement (haversine), support trend, extent trend
   - Classifies each track as `stable`, `transient`, or `displacing`
   - Returns sorted tracks by average intensity

2. **`src/lib/hotspot-evolution.test.ts`** — 5 tests covering empty input, single slice, matching, displacement classification, and intensity sorting (all passing)

3. **`src/hooks/useHotspotEvolution.ts`** — React hook that reads `stkdeResponse` from the coordination store and memoizes the evolution result

4. **`src/components/dashboard-demo/HotspotEvolutionCard.tsx`** — Card component showing:
   - Summary: total tracked hotspots, slice count, total displacement
   - Status badges: stable/displacing/transient counts
   - Per-track rows with: status, name, snapshot count, displacement km, centroid coordinates, support trend, extent trend, intensity

5. **Integration** — Added `<HotspotEvolutionCard />` to `DemoStkdePanel` below the hotspots list

### What the card shows
- **Stable** (green): hotspot moved <1.5km across slices
- **Displacing** (red): hotspot moved >1.5km — shifted location significantly
- **Transient** (amber): hotspot appeared in only one slice — no persistence
- Trend icons: support ↑↓→, extent ↗↙→

### Questions answered by the existing demo after this addition

| Question | How |
|----------|-----|
| Where? | Centroids shown per snapshot |
| When active? | Peak window per snapshot |
| How long? | Snapshots span across slices |
| Stable/transient? | Status classification |
| Shift/displace? | Displacement in km |
| Spatial extent over time? | Radius trend (expanding/contracting) |
