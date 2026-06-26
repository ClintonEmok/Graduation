---
id: 260625-hotspot-evolution-showcase-route
description: Add an isolated route to showcase hotspot evolution
status: ready
tasks:
  - id: 1
    description: Add standalone hotspot evolution page
    files:
      - src/app/hotspot-evolution/page.tsx
    action: Create an isolated showcase route that renders deterministic STKDE slice results, visualizes hotspot movement, and summarizes stable/displacing/transient tracks without dashboard chrome.
    verify: |
      - route loads at /hotspot-evolution
      - page renders a track overview and isolated explanatory copy
      - showcase uses buildHotspotEvolution() on sample slice results
  - id: 2
    description: Add navigation entry
    files:
      - src/app/page.tsx
    action: Add a homepage link so the isolated showcase route is easy to reach.
    verify: |
      - homepage includes a link to /hotspot-evolution
---
